# 1. Notes are stored separately from the Character, keyed by username

Date: 2026-06-24

## Status

Accepted — implemented 2026-06-24 (`constants/notes.ts` + `adventurers-log.tsx`).
Chose the **tombstone** mechanism over deferred-write: a `setTimeout`-deferred storage
write is fragile under Expo backgrounding/unmount, so `softDeleteNote` writes
`deleted: true` immediately and `restoreNote` flips it back — lossless and unmount-safe.
The CharacterStore seam (architecture review candidate 2) was *not* required: notes are
already username-keyed and independent of the characters blob, so no character-storage
change was needed.

## Context

Today every character is stored under one AsyncStorage key
(`adventurers_log_characters`), and each character's `journal` array — which mixes
auto-generated events (level-ups, "character added") with hand-written notes — lives
*inside* that character object. Disconnecting a character removes it from the array, so
the player's authored notes are destroyed along with the transient game data. The only
"recovery" is to never disconnect, which is the pain point that prompted this change.

We want hand-written notes to survive character disconnect/reconnect, and we want an undo
for accidental deletes.

## Decision

Split the Journal into two sources:

- **Auto Entries** stay coupled to the Character (disposable; regenerated from hiscores).
- **Notes** become first-class authored content stored under a separate, **username-keyed**
  store (e.g. `adventurers_log_notes:<username>`), independent of the character lifecycle.

The Journal view becomes a render-time **merge** of the two sources, sorted newest-first.
Reconnecting the same username rehydrates its notes automatically. Note deletion is
optimistic with a transient single-action **Undo**; the storage write is deferred (or
written as a revivable tombstone) until the undo window closes.

## Consequences

- Disconnecting a character can now genuinely remove transient data without destroying
  authored notes — the behavior the user asked for.
- The Journal screen must merge and sort two stores rather than read one array.
- Notes are keyed by username, not by character `id`; two character records for the same
  username share notes. This matches the mental model ("my notes for that account").
- A future "Trash"/soft-delete surface is a natural upgrade from the tombstone mechanism.
- Migration: existing in-character `manual` journal entries should be lifted into the new
  per-username note store on first run so no current notes are lost.
