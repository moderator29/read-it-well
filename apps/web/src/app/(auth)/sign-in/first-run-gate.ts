import {
  FIRST_RUN_PASSED_PARAM,
  firstRunHref,
  isFirstRunSeen,
} from "@/components/app/welcome/first-run-seen";

/**
 * Whether the sign-in screen sends this visitor to first run before it paints,
 * and where.
 *
 * A device that has never been shown `/welcome` meets it first, with the whole
 * sign-in address (its `next`, its `notice`) carried as `/welcome?next=...`,
 * so the person arrives back here exactly where they were going.
 *
 * Three ways straight through, and each one is there to stop a loop or a
 * wrong turn:
 *   - the `vallo_first_run=seen` cookie: this device has seen it;
 *   - `welcomed=1`: first run appends it when a browser refuses the cookie,
 *     so the two screens can never bounce somebody between them;
 *   - a notice that says the person already HAS an account (a spent or broken
 *     confirmation link, or a sign-out). Explaining Vallo to somebody who just
 *     signed out of it is the wrong screen.
 *
 * AND ONE WAY IT NEVER GOES AT ALL (V-18): a `/sign-in` with no `next` is
 * somebody who pressed Sign in on purpose, from the landing page or a door.
 * They asked for the form, and four slides in front of it is reading before
 * doing. Only an arrival that was stopped on the way somewhere (the wall in
 * `proxy.ts` always writes `next`) meets first run, and first run then opens
 * on the account choice headed with where they were going, not on slide one.
 *
 * Pure, so it is tested directly.
 */
const ACCOUNT_NOTICES = new Set(["link-expired", "link-invalid", "signed-out"]);

export function signInFirstRunRedirect(input: {
  cookie: string | null | undefined;
  params: Record<string, string | string[] | undefined>;
}): string | null {
  if (isFirstRunSeen(input.cookie)) return null;
  const next = input.params.next;
  const hasNext = Array.isArray(next) ? next.some((v) => v.length > 0) : Boolean(next);
  if (!hasNext) return null;
  const passed = input.params[FIRST_RUN_PASSED_PARAM];
  if (passed === "1" || (Array.isArray(passed) && passed.includes("1"))) return null;
  const notice = input.params.notice;
  if (typeof notice === "string" && ACCOUNT_NOTICES.has(notice)) return null;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(input.params)) {
    if (value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) search.append(key, v);
  }
  const query = search.toString();
  return firstRunHref(`/sign-in${query ? `?${query}` : ""}`);
}
