# Context: Adventurers Log

A mobile (Expo / React Native, portrait phone) companion app for Old School RuneScape.
It surfaces game reference data (monsters, items, skills, the Grand Exchange, maps) and
lets a player track their own character's progress.

## Glossary

### Character
A player's OSRS account as tracked inside the app, identified by username and hydrated
from the OSRS hiscores API. Holds a skill snapshot, boss kill-counts, and a Journal.
A Character can be *connected* (added/hydrated) or *disconnected* (removed) from the app.

### Journal
The combined, newest-first log shown on a Character's screen. It is a *merge* of two
sources at render time:

- **Auto Entries** — game-derived events (level-ups, "character added", auto-check
  events). Disposable: regenerated from the hiscores API, and tied to the Character's
  lifecycle. Removed when the Character is disconnected.
- **Notes** — see below.

### Note
A hand-authored entry written by the player. First-class, authored content — *not*
collateral of any Character action. Stored separately from the Character and keyed by
**username**, so notes survive Character disconnect and rejoin automatically when the same
username reconnects. A deleted Note can be restored via **Undo**: a transient,
single-action affordance shown briefly after deletion (snackbar-style). It reverses only
the most recent delete within its time window; it is not a persistent trash/restore
surface. Deletion is optimistic in the UI, with the storage write deferred (or written as
a revivable tombstone) until the undo window closes, so an in-window undo is lossless.

### Monster Category
A curated grouping shown in the Bestiary (e.g. "Bosses"), each mapping to a wiki category
used to fetch its members (11 categories total). Members are fetched to *completeness*
(paginated past the wiki's 50-member page cap) and meta pages (e.g. the "Boss" article
itself) are filtered out. Most categories display alphabetically; **Bosses** alone uses a
hand-curated tier ordering, with any uncurated members appended alphabetically.
Distinct from a free-text **Monster Search**.

### Monster Search
Free-text lookup in the Bestiary. Returns *monsters only* — scoped via the wiki
`incategory:Monsters intitle:<query>` search, fired once the query is at least 2
characters. Distinct from the generic wiki article search it previously (incorrectly) used.

### Region
A map area in the Locations screen (e.g. Karamja, Kharidian Desert), each with a remote
wiki map-thumbnail image and a list of notable places.

### Wiki Section
A heading-delimited slice of a wiki page — the unit every wiki-consuming screen
(Quests, Skill Guides, Minigames, Achievement Diaries, Items) works in. Shape:
`{ index, title, level }`, where `level` is the heading depth (2 = top-level,
3 = subsection). Produced by the pure **wikitext parser** (`constants/wikitext.ts`)
from raw wikitext fetched by the **wiki transport** (`constants/wiki.ts`). The parser
is string-in / structure-out: no network, no async — so the markup rules below are
unit-testable directly.

Markup rules owned by the parser:
- `stripTags` converts `<br>` and block-close tags to spaces so words across a line
  break don't fuse (the cause of the "Numberin Stock" header bug).
- `cleanWikitext` removes templates, links, refs, tables, and heading markup.

**Item specialization**: the Items screen adds a dedup rule on top of the shared
parse — when a kept level-3 Wiki Section is nested under a kept level-2 parent, the
subsection is dropped from the top-level list, because the parent's HTML already
contains its subsections' tables (otherwise the same table renders twice, e.g.
"Shop locations" under "Item sources").
