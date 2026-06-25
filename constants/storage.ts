// Centralized AsyncStorage keys.
//
// Previously each screen declared its own STORAGE_KEY/WATCHLIST_KEY, and the
// characters key was typed as a raw string literal in three files — a typo in
// any one would silently read/write the wrong bucket. Keep every key here.

export const StorageKeys = {
  /** All connected characters, each embedding its (ephemeral) auto journal. */
  characters: 'adventurers_log_characters',
  /** Completed achievement-diary tiers. */
  diariesCompleted: 'achievement_diaries_completed',
  /** Saved gear-planner loadouts. */
  gearLoadouts: 'gear_planner_loadouts',
  /** Grand Exchange watchlist item ids. */
  geWatchlist: 'ge_watchlist',
  /** Completed quests. */
  questsCompleted: 'quests_completed',
  /** Per-username authored notes (ADR 0001). Suffixed with the username at use. */
  notesPrefix: 'adventurers_log_notes',
  /** One-time flag: in-character `manual` journal entries lifted into the note store. */
  notesMigrated: 'adventurers_log_notes_migrated',
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];
