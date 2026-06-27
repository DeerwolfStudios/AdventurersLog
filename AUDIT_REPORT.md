# Code Audit — Adventurers Log

Date: 2026-06-24
Scope: `app/` (17 screens + components). Findings are grounded in specific
file/line evidence, ordered by impact. Severity: **H** = correctness/reliability,
**M** = maintainability/duplication, **L** = polish.

---

## H-01 — Silent `catch {}` swallows all errors — ✅ DONE (2026-06-25)
The wiki-consuming screens already moved to `wikiFetch`/`fetchWikitext` (which
warn-on-failure) via M-01/M-04. This pass finished the last raw-`fetch` holdouts:
bestiary (search, category, monster-detail) and items (sections, summary, section
lines) now route through `wikiFetch` and their `catch` blocks `console.warn` the
cause in dev instead of discarding it. Storage `catch`es were already handled in
the notes store. The graceful empty-fallbacks are preserved.

<details><summary>original finding</summary>
Every network and storage failure is caught and discarded; failures produce no
signal, no log, no user-facing state (the "broken bestiary search on web"
confusion). Fix: warn the cause in dev, keep the graceful fallback.
</details>

## H-02 — No request timeout / cancellation on wiki fetches — ✅ DONE (2026-06-25)
`wikiFetch` adds a 12s `AbortController` timeout to every wiki request. With the
H-01 migration above, all wiki traffic on bestiary and items now flows through it,
so a hung request aborts and falls back gracefully instead of spinning forever.
(Per-keystroke search cancellation via a caller-supplied signal is supported by
`wikiFetch` but not yet wired into the search effects — a small follow-up.)

<details><summary>original finding</summary>
Raw `fetch()` with no `AbortController`; a hung request spins forever, and search
effects don't cancel in-flight requests (last-response-wins races). Fix: shared
`wikiFetch({ timeoutMs })`; abort the previous request in search cleanup.
</details>

## M-01 — Wiki API client duplicated across 7 files — ✅ DONE (2026-06-24)
Resolved: added `constants/wiki.ts` (`WIKI_API`, `WIKI_BASE`, `UA`, `wikiFetch`
with AbortController timeout, `extractWikitext`, cached `fetchWikitext`). Migrated
quests, skill-guides, minigames, achievement-diaries to delegate to it; bestiary
and items now import the shared `WIKI_API`/`UA` constants (their bespoke
`parse`/`search`/`categorymembers` fetch bodies remain local, pending H-01/H-02).
Removed 4 duplicate `extractWikitext` defs and 3 local wikitext caches.

<details><summary>original finding</summary>
`const WIKI_API = 'https://oldschool.runescape.wiki/api.php'`, the `UA` string,
and the identical `action=query&prop=revisions&rvprop=content&rvslots=*` wikitext
URL are copy-pasted in `bestiary`, `items`, `achievement-diaries`, `quests`,
`skill-guides`, `minigames` (+ `index` WIKI_BASE).
- Fix: `constants/wiki.ts` exporting `WIKI_API`, `UA`, and typed helpers
  (`fetchWikitext(title)`, `fetchParsedSection(title, idx)`, `searchPages(...)`).
  Collapses ~5 duplicated fetch bodies into one tested unit and gives H-01/H-02
  a single place to live.
</details>

## M-02 — Storage keys are scattered string literals — ✅ DONE (2026-06-24)
Resolved: added `constants/storage.ts` (`StorageKeys` object). All six key
declarations and the three raw `'adventurers_log_characters'` literals now
reference it. Verified: zero raw literals remain.

<details><summary>original finding</summary>
`'adventurers_log_characters'` is hard-coded as a raw string in `skills.tsx:691`,
`adventurers-log.tsx`, and `skill-guides.tsx:452`; other keys (`STORAGE_KEY`,
`WATCHLIST_KEY`) are re-declared per file. A typo in any one silently reads/writes
the wrong bucket.
- Fix: `constants/storage.ts` with all keys as named exports + thin typed
  get/set wrappers. **Do this before the Notes feature (ADR 0001)** — that work
  adds another username-keyed store and will otherwise scatter more literals.
</details>

## M-03 — Pervasive `any` — ✅ PARTIAL / scoped-done (2026-06-25)
Typed the high-value, zero-risk cases: `image: any` / `icon: any` →
`ImageSourcePropType` (bestiary, calculators, money-making), and the wiki
section-parse input in items (`s: any` → a local `RawSection` type). The 29
`router.push(x as any)` casts were **deliberately left**: typed expo-router routes
are churny work with navigation-break risk and the cast is the accepted idiom — low
value. Note: typing a `res.json()` response is a *cast, not validation* (it catches
our own field-name typos, not the wiki changing shape), so the audit oversold this
item's payoff — especially with no test runner.

## M-04 — `stripTags` / wikitext parsing logic duplicated — ✅ DONE (2026-06-24)
Resolved as an architecture deepening (see ADR 0002). Added pure
`constants/wikitext.ts` (`cleanWikitext`, `stripTags`, `parseSections`,
`matchesSection`, `extractSection`, `WikiSection`); migrated quests, skill-guides,
minigames, achievement-diaries to it; items shares `stripTags`. Removed 4 byte-identical
`cleanWikitext`, 4 section parsers, and 3 `extractSection` copies. Module is pure
(no imports) so it is unit-testable once a runner exists — the recommended follow-up.
Infobox parsing (`parseInfoboxValue`) was left per-screen: it is a distinct concern
(stat extraction), not part of the section pipeline.

<details><summary>original finding</summary>
Each wiki-consuming screen has its own near-identical `stripTags`, infobox
parser, and section extractor. The `<br>`-fusion bug (fixed in `items.tsx`) likely
still exists in the *other* copies.
</details>

## L-01 — Dead code computed every render — ✅ DONE (2026-06-25)
Deleted the unused `count` (the "placeholder — actual count from parent" filter)
and `easyDone` in `achievement-diaries.tsx`'s `ProgressPanel`. Both were computed
every render and never read.

## L-02 — List keys use array index — ✅ VERIFIED, NO CHANGE NEEDED (2026-06-25)
Inspected the genuinely dynamic lists (bestiary search/category, items
search/category, GE search/watchlist, calculators search, notes/journal): **all
already use stable keys** (`m.title`, `item.id`, `c.wikiPage`, `n.id`). The
remaining `key={i}`/`key={ci}` sites are on static parsed content (table cells,
`Line[]` renderers, fixed equipment grid, config menus) where index keys are
correct and idiomatic. No churn introduced.

---

## Suggested sequencing
1. **M-01 + M-02** (shared wiki client + storage keys) — foundation; unblocks
   clean fixes for H-01/H-02 and de-risks the Notes feature.
2. **H-01 + H-02** (error visibility + timeouts/cancellation) on top of the
   shared client.
3. **M-04** (shared wikitext lib) — propagates the `<br>` fix everywhere.
4. **L-01 / M-03 / L-02** — opportunistic cleanup.
