# Video calling: test report (8 October 2026)

Three kinds of evidence, kept apart. **Nothing here is a phone, a native
shell, a mobile network, LiveKit Cloud or production.** No real device test
has been run, and no iOS or Android build has been made.

## 1. Automated unit tests (vitest, `--project unit`, no database, no network)

54 tests in five files under `apps/web/src/lib/calls/`, all passing:

| File | Tests | What it holds |
|---|---|---|
| `lifecycle.test.ts` | 18 | the TypeScript transition table equals the migration's (parsed from the SQL), terminal states agree, timeouts equal `private.call_timeout_seconds` (parsed), 45 s ring boundary, connect and reconnect deadlines, hang-up intent per role, who may join, phase per state, end words without em dashes, snapshot parsing, newest-snapshot merge never revives a finished call |
| `provider/livekit.test.ts` | 13 | **token claims decoded and asserted**: issuer, identity, name, room, `roomJoin`, publish sources (camera+microphone for video, microphone only for voice), no data, no admin, ten-minute `exp`, signature verifies with the secret and not with another; refusal of non-minted rooms and identities and of long lifetimes; **webhook signature**: genuine accepted (with or without `Bearer`), tampered body, wrong secret, wrong issuer, expired, missing, `alg: none` all refused, no event id refused; room service request shape and admin-token grant, missing room on delete is success, unauthorised error carries no secret, presence filtering |
| `token-service.test.ts` | 6 | signs only for the room and identity the database answered; a refusal signs nothing; malformed answers refused; a voice call never publishes video; a failed room prepare does not block the join; no provider, no database call |
| `webhook.test.ts` | 6 | forged and unsigned deliveries refused before reading; **idempotency** (first records, retry is a duplicate); track events ignored; 503 when unrecorded; room closed when its call is over; the exact RPC arguments |
| `rules.test.ts` | 11 | every `call:`/`review:` token the migration raises has a sentence, a database message never leaks; **rate limits** parsed from the migration equal the agreed numbers (start, day, pair, token, review request, review start); review scopes equal the migration's; staff fields never reach the subject's view; input schemas take ids and choices only; CSP origins; the sweep verdict |

Also run and passing: the existing suites touched by VC1 (proxy, CSP and
security, admin jobs registry and handbook, environment documentation, native
project tests). The full unit run is recorded at the foot of this file.

## 2. The database (PGlite: Postgres 16.4 compiled to wasm, over stand-ins)

`supabase/tests/probes-pending/vc1-video-calls.sql` (the live-database probe,
contract-checked) was run against the migration on PGlite with the
stand-ins in `scripts/calls/fixtures/pglite-live-stubs.sql` (live bodies of
`notify`, `has_role`, `staff_can`, `console_step_up_ok`, `blocked_between`,
`notify_message`, read 8 October): **PROBE_OK**. The migration also applies
twice cleanly (idempotent). Covered: switches seeded and refusing, no direct
writes by members (tables and the call-marker policy), no cold calls, ringing
and the agent-side notification link, replayed taps, who may answer and join,
webhook idempotency, ACTIVE / INTERRUPTED / rejoin / stale out-of-order
leave, hang up once with one marker and no "New message" notification,
append-only events, glare, the 45 s ring becoming MISSED with a missed-call
notification, blocks, and the whole review-call path (member refused, staff
without console proof refused, request audited, no ring before acceptance,
subject view hides staff fields, ring, answer, attendance, notes, follow-up
needs a date, completion, append-only entries invisible to the subject).

`scripts/calls/pglite-mutations.mjs` re-introduced eight defects one at a
time (members can write calls; the marker policy open; cold calls; webhooks
applied twice; a drop ends the call; the caller answers their own call; the
subject reads staff rows; a review rings without consent): **the probe caught
all eight**.

The live database is Postgres 17.6; VC1 uses nothing that differs between 16
and 17 (plpgsql, generated columns, `make_interval`, `hashtextextended`,
advisory locks, jsonb), and pg_cron and the realtime publication are guarded
so PGlite skips them. **Not yet run on the live database.** The probe moves to `probes/` and runs
there when the lead applies the migration (production checklist).

## 3. A real media call on this machine (provider-backed, not simulated)

`scripts/calls/livekit-e2e.mjs`, run three times on 8 October 2026 with:

- **livekit-server 1.13.7**, the open-source server, built here from its Go
  module source (GitHub release downloads are blocked by the egress policy;
  proxy.golang.org was reachable), on 127.0.0.1 with a random key pair per run;
- **livekit-client 2.22.3** (the npm package's UMD bundle);
- **headless Chromium** (`/opt/pw-browsers/chromium-1194`) with fake camera
  and microphone devices, two separate browser contexts;
- **Vallo's own code**: `lib/calls/provider/livekit.ts`,
  `lib/calls/token-service.ts` and `lib/calls/webhook.ts`, bundled with
  esbuild, not reimplemented;
- **the real VC1 SQL** on PGlite (with the stand-ins) deciding the call.

Result of the last run: **27 of 27 checks passed**.

| Check | Result |
|---|---|
| livekit-server started | pass |
| `call_start` rings the host (SQL) | pass |
| Token service issues the caller's credentials; the caller connects with a Vallo-minted token | pass |
| The host cannot get a join token before answering (SQL: `call:not_joinable`) | pass |
| `call_accept`, then the host's credentials; both in the same room | pass |
| Caller receives **and decodes** the host's video (videoWidth 320) and receives audio (inbound RTP bytes > 0) | pass |
| Host receives and decodes the caller's video and receives audio | pass |
| The room service lists exactly the two identities (Vallo's admin token over Twirp) | pass |
| The server's real `participant_joined` webhooks pass Vallo's signature check | pass |
| Both joins make the call ACTIVE (SQL, driven by those webhooks) | pass |
| A replayed webhook is a duplicate; a forged one is 401 | pass |
| A dropped connection makes the call INTERRUPTED, not ended | pass |
| Rejoining with a new token makes it ACTIVE again (reconnect count 1) | pass |
| `call_end` ends it; closing the room disconnects whoever is still in it | pass |
| Exactly one conversation marker ("Video call, 1 s") | pass |
| No join token for an ended call | pass |
| The room service creates a capped room ahead of the first join | pass |
| A voice-call token connects with its microphone and **cannot publish a camera** (server: "insufficient permissions") | pass |
| A token signed with the wrong secret is refused by the server | pass |

A second mode without PGlite (join check simulated, everything else real)
passed 13 of 13.

What this proves: Vallo's token format, grants and webhook verification are
correct against the real open-source LiveKit server; the SQL state machine is
driven correctly by real provider events; two WebRTC endpoints exchange real
audio and video with Vallo-minted credentials.

What it does not prove: LiveKit Cloud (same protocol, different service and
TURN), real cameras and microphones, mobile WebViews, mobile networks,
NAT traversal (everything was on loopback), the Next.js server actions over
HTTP, Supabase Auth, PostgREST, Realtime and the push pipeline.

## 4. Not tested, and why

| Not tested | Why |
|---|---|
| Any iPhone or Android device, any native build | no macOS/Xcode; Android SDK download blocked; no devices |
| LiveKit Cloud | no account or keys in this session (by design: no secrets) |
| The server actions end to end through Next.js and Supabase | needs the migration applied to a database Next can reach; not applied by this agent |
| The live probe | waits for the lead to apply the migration |
| Push delivery of an incoming call to a phone | FCM/APNs devices and keys |
| Weak network, network switch, Bluetooth audio | devices |
| The call screens | built by the frontend agent; see section 3a |

## 3a. The call screens (frontend, 8 October 2026)

Built in `apps/web/src/components/calls/` (thread call buttons, the global
call layer and deep links, incoming / outgoing / connecting / in-call /
reconnecting / ended / permission / recovery screens, call history rows,
the inbox's missed-call line), `components/calls/admin/` and
`app/admin/review-calls/` (the staff desk), `app/(app)/calls/reviews/`
(the subject's invitation). All behind `video_calls` (and
`admin_review_calls` for reviews); off, nothing is drawn and the routes say
"not available yet".

| Test | What it is | Result |
|---|---|---|
| `lib/calls/screen.test.ts`, `components/calls/call-store.test.ts` | unit: the server clock, refusal and glare handling, markers, permission platforms, Lagos time, the staff forms, the one-call store | 32 passed |
| `components/calls/media-boundary.test.ts` | unit: `livekit-client` is imported by one module, reached only by `import()` from the lazy stage; the shells mount the layer through the flag check | passed |
| `components/calls/calls.dom.test.tsx` | Chromium, real components, staged server actions: incoming accept / accept with voice / decline / refused accept; in-call mute, camera, switch, end, 56 to 64px controls, keyboard-movable self view, voice call without camera controls; history rows and call back; the outcome form's validation | 9 passed |
| `scripts/calls/ui-e2e.mjs` | the REAL call components bundled from source, two headless Chromium pages with fake devices, the real VC1 SQL on PGlite, the real `livekit-server`, Vallo's token service, adapter and webhook handler; the server actions replaced by a shim that calls the same SQL functions | 25 of 25 checks, three consecutive runs |

The e2e drives: a tap on the thread's video button (one `startCall`),
Ringing, the callee's `?call=` deep link resolved by the call layer, Accept,
both pages decoding the other's video, ACTIVE from the provider's webhooks,
the clock on the server's time, mute seen by the other side, camera off and
on seen by the other side, End, both ended screens, ENDED with one marker in
the thread, then a voice call answered on a browser that refuses the camera
and microphone: the permission screen with its platform steps, no join token
asked for, Keep messaging ending the call cleanly.

It is NOT: a phone, a native shell, LiveKit Cloud, Supabase Realtime, the
Next.js server actions over HTTP, or production. Two runs of an earlier
draft failed at the media step, each straight after a run that had crashed:
that run's `livekit-server` was still answering the port with another key.
The script now checks that the server answering is its own process, waits
for it to exit, and reports a crashed step as a failed check.

## 5. Reproduce

```bash
# unit
cd apps/web && npx vitest run --project unit src/lib/calls

# database (PGlite installed outside the repo: npm i @electric-sql/pglite@0.2.17)
VC_PGLITE_MODULE=<...>/@electric-sql/pglite/dist/index.js node scripts/calls/pglite-probe.mjs
VC_PGLITE_MODULE=<...> node scripts/calls/pglite-mutations.mjs

# real media
LIVEKIT_SERVER_BIN=<livekit-server> \
VC_LIVEKIT_CLIENT_UMD=<livekit-client>/dist/livekit-client.umd.js \
VC_PGLITE_MODULE=<...> node scripts/calls/livekit-e2e.mjs

# the real call screens through a real call
LIVEKIT_SERVER_BIN=<livekit-server> VC_PGLITE_MODULE=<...> node scripts/calls/ui-e2e.mjs
```

## 6. Repository gates at the time of writing (8 October 2026, this branch)

| Gate | Result |
|---|---|
| `npx vitest run --project unit --maxWorkers=2` | 855 files, 10,092 passed, 1 skipped, 0 failed |
| `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit -p .` | clean |
| eslint on every changed file | clean |
| `node scripts/check-no-em-dash.mjs`, `check-valuation-words`, `check-css-tokens` | clean |
| `npm run -s check:claims` | 45 passed |
| `node scripts/check-migrations.mjs` | clean (the VC1 file is pending, not recorded) |
| Migration content rules M1 to M4 (`check-migration-rules.mjs` `checkText`) on the VC1 file | no findings |
| `node scripts/db-probes/run.mjs --check` and `checkProbeSource` on the VC1 probe | contract kept |
