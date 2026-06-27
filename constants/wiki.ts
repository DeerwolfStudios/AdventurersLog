// Shared OSRS wiki API client.
//
// Consolidates the WIKI_API base, the User-Agent, and the wikitext-fetch logic
// that was previously copy-pasted across bestiary / items / achievement-diaries
// / quests / skill-guides / minigames. A single place for the endpoint means a
// single place to add timeouts, caching, and error visibility.

export const WIKI_API = 'https://oldschool.runescape.wiki/api.php';
export const WIKI_BASE = 'https://oldschool.runescape.wiki';
export const UA = 'AdventurersLog-App/1.0';

const DEFAULT_TIMEOUT_MS = 12000;

/**
 * fetch() wrapper with a timeout (AbortController) and a single warn-on-failure
 * site, so network errors are no longer swallowed silently. Callers keep their
 * graceful fallbacks but the cause is now visible in dev.
 */
export async function wikiFetch(
  url: string,
  opts: { timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  // If the caller passed its own signal (e.g. to cancel on a new keystroke),
  // abort our request when theirs aborts.
  if (opts.signal) {
    if (opts.signal.aborted) controller.abort();
    else opts.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  try {
    return await fetch(url, { headers: { 'User-Agent': UA }, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

/** Pull raw wikitext out of an action=query&prop=revisions page object. */
export function extractWikitext(page: any): string {
  return page?.revisions?.[0]?.slots?.main?.['*']
    ?? page?.revisions?.[0]?.['*']
    ?? '';
}

const _wikitextCache: Record<string, string> = {};

/** Fetch (and cache) the raw wikitext for a page title. Returns '' on failure. */
export async function fetchWikitext(title: string): Promise<string> {
  if (_wikitextCache[title]) return _wikitextCache[title];
  try {
    const url = `${WIKI_API}?action=query&prop=revisions&rvprop=content&rvslots=*&titles=${encodeURIComponent(title)}&format=json&origin=*`;
    const res = await wikiFetch(url);
    const data = await res.json();
    const pages = data?.query?.pages ?? {};
    const page = Object.values(pages)[0];
    const wikitext = extractWikitext(page);
    _wikitextCache[title] = wikitext;
    return wikitext;
  } catch (err) {
    if (__DEV__) console.warn(`[wiki] fetchWikitext("${title}") failed:`, err);
    return '';
  }
}
