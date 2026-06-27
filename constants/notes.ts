// Per-username authored Notes store (ADR 0001).
//
// Notes are hand-authored content, stored separately from the Character and keyed
// by username, so they survive character disconnect/reconnect. This is distinct
// from the ephemeral Auto Entries (level-ups, "character added") that stay in the
// Character's `journal`. The Journal view merges the two at render time.
//
// Deletion is a tombstone, not a deferred write: softDelete writes `deleted: true`
// to storage immediately and restore flips it back. This is lossless and survives
// the component unmounting mid-undo-window (a setTimeout-deferred write would not).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageKeys } from './storage';

export type NoteCategory = 'Quest' | 'Achievement' | 'Milestone' | 'Note';

export type Note = {
  id: string;
  text: string;
  detail?: string;
  category?: NoteCategory;
  timestamp: number;
  /** Tombstone. Soft-deleted notes are kept in storage but filtered from views. */
  deleted?: boolean;
};

/** Storage key for one username's notes. Usernames are lowercased so casing variants share notes. */
function noteKey(username: string): string {
  return `${StorageKeys.notesPrefix}:${username.toLowerCase()}`;
}

/** All non-deleted notes for a username, newest first. Returns [] on any failure. */
export async function loadNotes(username: string): Promise<Note[]> {
  try {
    const raw = await AsyncStorage.getItem(noteKey(username));
    const all: Note[] = raw ? JSON.parse(raw) : [];
    return all.filter((n) => !n.deleted).sort((a, b) => b.timestamp - a.timestamp);
  } catch (err) {
    if (__DEV__) console.warn(`[notes] loadNotes("${username}") failed:`, err);
    return [];
  }
}

/** Read the full raw list (including tombstones). Internal — used by mutations. */
async function loadRaw(username: string): Promise<Note[]> {
  try {
    const raw = await AsyncStorage.getItem(noteKey(username));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveRaw(username: string, notes: Note[]): Promise<void> {
  await AsyncStorage.setItem(noteKey(username), JSON.stringify(notes));
}

/** Append a note and return the refreshed visible list. */
export async function addNote(username: string, note: Note): Promise<Note[]> {
  const all = await loadRaw(username);
  all.unshift(note);
  await saveRaw(username, all);
  return all.filter((n) => !n.deleted).sort((a, b) => b.timestamp - a.timestamp);
}

/** Tombstone a note (immediate, lossless). Returns the refreshed visible list. */
export async function softDeleteNote(username: string, id: string): Promise<Note[]> {
  const all = await loadRaw(username);
  const next = all.map((n) => (n.id === id ? { ...n, deleted: true } : n));
  await saveRaw(username, next);
  return next.filter((n) => !n.deleted).sort((a, b) => b.timestamp - a.timestamp);
}

/** Undo a tombstone within the undo window. Returns the refreshed visible list. */
export async function restoreNote(username: string, id: string): Promise<Note[]> {
  const all = await loadRaw(username);
  const next = all.map((n) => (n.id === id ? { ...n, deleted: false } : n));
  await saveRaw(username, next);
  return next.filter((n) => !n.deleted).sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * One-time migration: lift any in-character `manual` journal entries into the
 * per-username note store, then signal the caller to strip them from the
 * characters blob. Idempotent (guarded by a flag) and write-new-before-strip-old
 * (the caller only strips after this resolves).
 *
 * @returns whether a migration ran (caller strips manual entries iff true).
 */
export async function migrateManualEntries(
  characters: { username: string; journal: { id: string; type: string; text: string; detail?: string; timestamp: number; category?: NoteCategory }[] }[],
): Promise<boolean> {
  try {
    const done = await AsyncStorage.getItem(StorageKeys.notesMigrated);
    if (done) return false;

    for (const char of characters) {
      const manual = (char.journal ?? []).filter((e) => e.type === 'manual');
      if (manual.length === 0) continue;
      const existing = await loadRaw(char.username);
      const existingIds = new Set(existing.map((n) => n.id));
      const lifted: Note[] = manual
        .filter((e) => !existingIds.has(e.id)) // idempotent: skip already-migrated ids
        .map((e) => ({ id: e.id, text: e.text, detail: e.detail, category: e.category, timestamp: e.timestamp }));
      if (lifted.length > 0) {
        await saveRaw(char.username, [...lifted, ...existing]);
      }
    }

    await AsyncStorage.setItem(StorageKeys.notesMigrated, '1');
    return true;
  } catch (err) {
    if (__DEV__) console.warn('[notes] migrateManualEntries failed:', err);
    return false; // do not strip on failure
  }
}
