// Pure wikitext parser — string in, structure out. No network, no async, no React.
//
// This is the "interpret the wiki markup" half of the wiki pipeline; the
// "reach the wiki" half lives in constants/wiki.ts (see ADR 0002). Keeping this
// module pure means every rule below is unit-testable by feeding a string
// literal — the interface is the test surface.
//
// Used by all five wiki-consuming screens (Quests, Skill Guides, Minigames,
// Achievement Diaries, Items), which previously each carried byte-identical
// copies of cleanWikitext / the section-header regex / extractSection.

/** A heading-delimited slice of a wiki page. `level` is the heading depth (2 = top-level, 3 = subsection). */
export type WikiSection = { index: number; title: string; level: number };

// Matches a wiki heading line: ==Title==, ===Title===, ==== ====. Capture 1 is
// the equals run (its length = level), capture 2 is the title.
const HEADING_RE = /^(={2,4})\s*([^=]+?)\s*\1\s*$/;

/** Raw wikitext markup -> readable plain text. Templates, links, refs, tables, heading markup removed. */
export function cleanWikitext(raw: string): string {
  return raw
    .replace(/\{\{[^{}]*(?:\{\{[^{}]*\}\}[^{}]*)?\}\}/gs, '')
    .replace(/\{\{|\}\}/g, '')
    .replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, '$1')
    .replace(/\[\[|\]\]/g, '')
    .replace(/\[https?:\/\/\S+\s([^\]]+)\]/g, '$1')
    .replace(/\[https?:\/\/\S+\]/g, '')
    .replace(/'{2,3}/g, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
    .replace(/<ref[^>]*\/>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\{\|[\s\S]*?\|\}/gs, '')
    .replace(/^\s*[|!].*$/gm, '')
    .replace(/^={2,6}\s*.+?\s*={2,6}\s*$/gm, '')
    .replace(/^(right|left|center|thumb|frame|frameless|\d+px)[|].*$/gm, '')
    .replace(/^\[\[(File|Image):[^\]]*\]\]$/gm, '')
    .replace(/^\*{1,3}\s*/gm, '')
    .replace(/^#{1,3}\s*/gm, '')
    .replace(/^:+\s*/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** HTML fragment -> plain text. <br>/block-close tags become spaces so words across a break don't fuse. */
export function stripTags(html: string): string {
  return html
    // Turn line-breaks / block boundaries into spaces first, so words on either
    // side don't fuse (e.g. "Number in<br>Stock" -> "Number in Stock", not
    // "Numberin Stock"). The generic tag strip below would otherwise drop them.
    .replace(/<\s*br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|tr|td|th|h[1-6])\s*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#160;/g, ' ')
    .replace(/&ndash;/g, '–')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\(update\)/gi, '')
    .replace(/edit\s*\|\s*edit\s*source/gi, '')
    .replace(/\[\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Wikitext -> all heading-delimited sections, in document order. */
export function parseSections(wikitext: string): WikiSection[] {
  const sections: WikiSection[] = [];
  let index = 0;
  for (const line of wikitext.split('\n')) {
    const match = line.match(HEADING_RE);
    if (match) {
      index++;
      sections.push({ index, title: match[2].trim(), level: match[1].length });
    }
  }
  return sections;
}

/** Does this section's title contain any of the wanted terms? (case-insensitive substring) */
export function matchesSection(section: WikiSection, wanted: string[]): boolean {
  const title = section.title.toLowerCase();
  return wanted.some((w) => title.includes(w.toLowerCase()));
}

/** Pull one section's raw body wikitext out by its index. Caller cleans (cleanWikitext). */
export function extractSection(wikitext: string, targetIndex: number): string {
  const lines = wikitext.split('\n');
  let currentIndex = 0;
  let inSection = false;
  let sectionLevel = 2;
  const out: string[] = [];
  for (const line of lines) {
    const match = line.match(HEADING_RE);
    if (match) {
      currentIndex++;
      if (inSection && match[1].length <= sectionLevel) break;
      if (currentIndex === targetIndex) { inSection = true; sectionLevel = match[1].length; continue; }
    }
    if (inSection) out.push(line);
  }
  return out.join('\n');
}
