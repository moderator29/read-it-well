# Performance sweep, 29 September 2026

Lane: perceived and real speed. That means navigation, loading states, skeletons and stuck spinners. The founder's words were "the platform is still slow and loading stuck, skeletons etc".

## What was already in place

Earlier rounds did a lot of this work: SPEED-1..3, PERF-DB 4, OPS-11 and the Track M ledger. So this sweep went looking for what was left.

- The proxy checks the JWT locally (`getClaims`) and gives auth a 3 s deadline (OPS-05).
- The shell reads identity and workspaces in one RPC, `shell_context()`.
- The landing page's catalogue is shared and cached for five minutes.
- Leaflet, Paystack inline and the heavy sheets load on demand.
- The dock prefetches its tabs.
- Every page is dynamic, because the CSP nonce reads `headers()`. So `revalidate` cannot help public pages until the nonce comes off them. That is a security decision and it stays out of this lane.

## Findings, by impact

1. **Nothing bounded a stalled Supabase call (the "stuck skeleton").**
   - The server client (`lib/supabase/server.ts`) had no fetch timeout.
   - When PostgREST or GoTrue stalled with the socket open, the route's `loading.tsx` stayed on screen until the platform stopped the function. Nothing told the person anything had failed.
   - The proxy's table reads (the finish-setup check and the missing-listing check) had the same problem. There the result was worse: the navigation hung before a single byte was sent.
2. **Serial reads (waterfalls) on pages people open often.**
   - `/messages/[id]` made 10 reads one after another once the thread had loaded.
   - `/checkout/[bookingId]` made 3 reads in series and read the charge kind twice.
   - `/rent/pay/[inspectionId]` made 2 reads in series.
   - `/restaurant/[id]` made 3 reads in series.
   - `/around/[slug]` made 3 reads in series.
   - `/listing/[id]` read the "recently let" RPC in series during render.
3. **Two spinners could spin forever.**
   - "Show older" on `/notifications` never stopped if the server action failed to reach the server, for example on a dropped connection.
   - "Confirm inspection" in a thread had the same fault.
   - All the other busy states found in client components already reset in `finally` or `catch`.
4. **Skeletons that did not match the page, causing layout shift.**
   - `/bookings/[bookingId]` borrowed the bookings list skeleton.
   - `/profile/application` and `/profile/setup/*` borrowed the profile hero (a cover and a face) but draw a titled page and a back control above choice cards.
5. **The database is not the bottleneck.**
   - `pg_stat_statements` shows `shell_context()` averaging 30 ms (max 1.4 s over 921 calls) and `passcode_status()` averaging 2 ms.
   - The largest total is PostgREST's own schema-cache reload (`pg_timezone_names`, 2,219 calls). That comes from schema reloads, not from app traffic.
   - The advisor lists 10 foreign keys with no index. All of them are on tables that hold 0 or 1 rows. No index migration is proposed.
6. **Field data is too thin to use.**
   - `web_vitals_samples` holds 2 samples per metric.
   - The Vercel runtime-log API refused this token (403), so no production timings were available.

## Changes made

| # | Change | Files |
|---|---|---|
| 1 | Supabase deadline. On the server client, table, RPC, auth and graphql calls end after 15 s; storage and functions are left alone. In the proxy, table reads end after 5 s and fail open, as they already did on error; auth keeps OPS-05. A caller's own abort signal still wins. | `lib/supabase/deadline-fetch.ts` (+ test), `lib/supabase/server.ts`, `proxy.ts` |
| 2 | Parallel reads: the thread page (10 reads into 1 batch), checkout (3), rent pay (2), restaurant (3), area page (3), listing (recently-let joins the main batch). How each read handles failure is unchanged. | the six `page.tsx` files |
| 3 | The two stuck spinners now end and show a message. | `LiveNotifications.tsx`, `ThreadView.tsx` |
| 4 | Skeletons that match their pages. | `bookings/[bookingId]/loading.tsx`, `profile/application/loading.tsx`, `profile/setup/loading.tsx` |

## Measurements

**How they were taken.**

- One production build (`next build` + `next start`) of the pre-sweep commit `b1e0444a`, run in a scratch worktree. It talked to the real Supabase project from this sandbox.
- The browser was Playwright Chromium at 390x844, signed in as the QA member.
- Each figure is the median of 3 runs, in milliseconds. CLS is unitless.
- Supabase round trip from the sandbox: 0.24 to 0.49 s to first byte on `/rest/v1/`.

**Only the baseline was measured.** The lead limited this machine to one production build, so the after state was not built or timed. The gains below are therefore expected, not measured.

**Hard loads, baseline:**

| Route | TTFB | FCP | LCP | CLS |
|---|---|---|---|---|
| `/` (signed out) | 64 | 300 | 640 | 0 |
| `/sign-in` | 69 | 392 | 484 | 0 |
| `/home` | 954 | 1520 | 3012 | 0 |
| `/search` | 242 | 544 | 2324 | 0 |
| `/stays` | 253 | 696 | 1388 | 0 |
| `/messages` | 220 | 560 | 1304 | 0 |
| `/notifications` | 269 | 776 | 816 | 0 |
| `/bookings` | 335 | 804 | 1124 | 0 |
| `/listing/[id]` | 309 | 676 | 2700 | 0 |
| `/messages/[id]` | 224 | 564 | 1668 | 0 |

**Soft navigations, baseline.** Each is timed from the click until no loading state is left on screen:

| Navigation | Median |
|---|---|
| home to search | 1892 |
| inbox to thread | 2502 |
| search to listing | 3354 |

**What to expect after this sweep.**

- **Inbox to thread.** The thread page now spends one round trip where it used to spend ten after the thread loads. At the round-trip times above, that should remove most of the 2.5 s wait. This is an estimate; confirm it with the same script (`scratchpad/perf-measure.mjs`) on the next build.
- **Streaming and CLS.** TTFB stays low on every route because `loading.tsx` streams first. No route showed any CLS.
- **The real cost.** The wait sits between the skeleton and the content, and that wait is Supabase round trips, which is why the reads were made parallel.

## Open items (not done, in priority order)

1. **The nonce makes every page dynamic.** The landing page and the public site pages could be static or ISR if the CSP nonce were dropped for pages with no inline script, or replaced with hashes. That would take TTFB on `/` to CDN speed. It is a security trade-off for the owner of the CSP to decide.
2. **Field vitals.** `VitalsReporter` samples 1 page view in 10, and only 2 rows have landed. Until more real users produce data, field numbers cannot guide this work. Check that the service key is set in production, and consider sampling at 100% for two weeks.
3. **Vercel runtime logs.** The token used here got a 403. With access, sort functions by duration to find slow routes in production.
4. **Other routes still on a generic skeleton:** `host/*` subpages, `agent/listings/[id]/*`, `settings/*` subpages (close enough) and `(auth)` subpages. The shapes are near but not exact.
5. **`/home` TTFB is 4x any other signed-in route** (954 ms median against about 250 ms; the three runs were 596, 1975 and 954 ms). The page's own reads are already in one `Promise.all`, so the next step is a server timing trace of this route on a production build.
6. **Search to listing takes 3.4 s** even though the listing page already batches its reads. Its LCP of 2.7 s is the hero photo. The first gallery image already carries `priority` and `sizes`, so the next step is the image optimiser's cold-cache time.
7. **Serial reads left alone on purpose**, because each read depends on the one before it: host rooms/photos/arrival (business, then accommodation, then rows) and `/messages/new`.
