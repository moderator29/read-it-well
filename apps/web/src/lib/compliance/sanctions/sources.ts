/**
 * WHERE A SANCTIONS LIST COMES FROM. SCUML items 8 and 9.
 *
 * One interface, two sources:
 *   - a URL fetcher, used when `SANCTIONS_UN_URL` / `SANCTIONS_NG_URL` is set
 *     (the UN publishes the Consolidated List as XML at a stable address);
 *     the daily `sanctions-lists` job reads it;
 *   - a staff upload of the file on /admin/compliance?tab=sanctions, for the
 *     Nigeria list (published in no stable machine form) and for any day the
 *     URL is down.
 * Tests use the fixtures in `./fixtures`; nothing here is fetched in a test.
 */

export type ListSourceName = "un" | "ng";

export type ListSource = {
  source: ListSourceName;
  origin: "url" | "upload";
  /** The file's text, or null when it could not be read. */
  read(): Promise<string | null>;
};

const MAX_BYTES = 40 * 1024 * 1024;

export function uploadSource(source: ListSourceName, text: string): ListSource {
  return { source, origin: "upload", read: async () => text };
}

export function urlSource(source: ListSourceName, url: string, fetchImpl: typeof fetch = fetch): ListSource {
  return {
    source,
    origin: "url",
    async read() {
      try {
        const response = await fetchImpl(url, { signal: AbortSignal.timeout(60_000), cache: "no-store" });
        if (!response.ok) return null;
        const declared = Number(response.headers.get("content-length") ?? "0");
        if (declared > MAX_BYTES) return null;
        const text = await response.text();
        return text.length > MAX_BYTES ? null : text;
      } catch {
        return null;
      }
    },
  };
}

/** The URL sources configured in this environment; none when no URL is set. */
export function configuredSources(env: Record<string, string | undefined> = process.env, fetchImpl: typeof fetch = fetch): ListSource[] {
  const out: ListSource[] = [];
  const un = (env.SANCTIONS_UN_URL ?? "").trim();
  const ng = (env.SANCTIONS_NG_URL ?? "").trim();
  if (/^https:\/\//.test(un)) out.push(urlSource("un", un, fetchImpl));
  if (/^https:\/\//.test(ng)) out.push(urlSource("ng", ng, fetchImpl));
  return out;
}
