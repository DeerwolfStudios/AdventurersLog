# 2. Wiki transport and wiki parsing are separate modules

Date: 2026-06-24

## Status

Accepted

## Context

Five screens consume the OSRS wiki (Quests, Skill Guides, Minigames, Achievement
Diaries, Items). Each had re-implemented the same pipeline inline: fetch a page,
extract its wikitext, clean the markup, split it into heading-delimited **Wiki
Sections**, and render. The `cleanWikitext` body was byte-identical across four
screens; the section-header regex was identical across all of them; `extractSection`
was copied across three. A bug fixed in one copy (the `<br>`-fusion fix in the Items
screen) did not reach the others.

An earlier refactor already extracted the *transport* concern into `constants/wiki.ts`
(`wikiFetch` with timeout, cached `fetchWikitext`, `extractWikitext`). The *parsing*
concern was still duplicated. The question was whether to fold parsing into the same
module or give it its own seam.

## Decision

Keep two modules at two seams:

- **`constants/wiki.ts` — transport.** Talks to the wiki. Async, network, cache,
  timeout/cancellation. Owns *how we reach the wiki*.
- **`constants/wikitext.ts` — parser.** Pure: string in, structure out. No network,
  no async, no React, no storage. Owns *how we interpret wikitext*. Exposes
  `cleanWikitext`, `stripTags`, `parseSections`, `matchesSection`, `extractSection`,
  and the `WikiSection` type.

The two change for different reasons (timeout policy vs. wiki markup quirks), so they
get separate locality. The parser being pure is the load-bearing property: the
`<br>`-fusion rule, the section-header regex, and section extraction become
unit-testable by feeding a string literal — no mock, no `AbortController`, no
AsyncStorage. The interface is the test surface.

Section *selection* (which sections a screen wants) stays per-screen: each screen
owns its `wanted` list as domain knowledge, but shares the `matchesSection`
predicate. The Items screen's level-3 dedup rule stays in the Items screen as a
documented specialization on top of the shared parse — it is not folded into the
parser.

## Consequences

- The `<br>`-fusion fix and the section-parse logic now live in one place; a fix lands
  across all five screens.
- The parser is testable in isolation. No test runner is configured today, so this
  payoff is latent — a `wikitext.test.ts` drops in cleanly the moment one exists. This
  is the recommended next step.
- Callers import from two modules (`wiki` for fetching, `wikitext` for parsing) instead
  of one. This is intentional: a caller that only parses a cached string never touches
  transport.
- A future review may ask "why two wiki modules?" — the answer is purity. Folding them
  would re-couple parsing to a specific fetch and destroy the string-in/string-out test
  surface. Do not merge them for the sake of one fewer file.
- `extractSection` returns *raw* section wikitext; callers compose
  `cleanWikitext(extractSection(...))`. The two operations stay independently testable.
