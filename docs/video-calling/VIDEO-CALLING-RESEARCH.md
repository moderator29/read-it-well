# Video calling: Phase 0 baseline (8 October 2026)

What existed before any calling code was written, read from the repository and,
where the repository could be stale, from the live database (read-only queries
through the Supabase MCP on 8 October 2026). Spec: `BRIEF.md` in this folder.

## 1. The repository

- Monorepo: `apps/web` (Next.js 16.3, React 19.3, TypeScript 5.7, zod 4, Supabase
  JS 2.110, framer-motion 12), `packages/design-tokens`, `packages/i18n`.
  Tests are vitest 4 (`--project unit`, node environment, `src/**/*.test.ts`).
- Native: Capacitor 8.5.2 shells in `apps/web/ios` and `apps/web/android` that
  load the live origin (`https://www.vallospaces.com`) over https and fall back
  to `native-shell/` offline. No static export is possible (server actions,
  middleware), so every web change ships to the apps without a store release;
  native config changes need a native rebuild.
- Deployment: Vercel (`dub1`), Supabase project `uccixoonmbhrnyczyigt`.
  Migrations are applied by the lead through the Supabase MCP and then
  recorded (`scripts/check-migrations.mjs`, `APPLIED.txt`); drafts live in
  `supabase/migrations/pending/`. Probes: `supabase/tests/probes/`, contract
  in `scripts/db-probes/contract.mjs`.
- Lockfile: owned by named sessions (D46). Nobody else adds a dependency.

## 2. Messaging (no existing voice or video)

Nothing in the codebase opened a camera or microphone stream: no
`getUserMedia`, no WebRTC, no media SDK. The edge sent
`Permissions-Policy: camera=(), microphone=()` on every response, which makes
`getUserMedia` fail without a prompt. The only media capture was file inputs
(photos, the walkthrough video) and the Camera plugin.

Messaging in the database (live, 8 October):

- `public.conversations`: `guest_id`, `agent_id` (the host or lister side),
  `listing_id`, `business_id`, `booking_id`, `reservation_id`, `context_kind`
  (`listing | reservation | booking | business`), firm routing columns,
  `last_message_at`. RLS: the two parties (and admins with the console proof)
  select; inserts only by a party and never across a block
  (`conversations_insert_not_across_block`, restrictive).
- `public.messages`: `body`, `sender_id`, `read_at`. No message kind column.
  Structured messages (shares, cards) are a body grammar
  (`components/app/messages/share.ts`) expanded at read time; side facts live
  in side tables keyed by message id (`message_account_checks`,
  `message_attachments`, `message_flags`).
- Triggers on `messages`: `limit_member_inserts` (SEC-09, 60 per 10 min, 1000 a
  day), `notify_message` (bumps `last_message_at`, writes the other party's
  "New message" notification, routing the agent side to
  `/agent/messages/<id>` and the guest side to `/messages/<id>`),
  `scan_message` (account numbers, payment words, content verdicts),
  `enqueue_new_enquiry_email` (the first guest message about a listing).
- Blocks: `public.blocks` (either direction), `private.blocked_between(a, b)`,
  enforced by restrictive insert policies and by `lib/messages/blocks.ts`.
- Realtime: `supabase_realtime` publishes `public.messages` and
  `public.notifications` only. `lib/messages/useRealtime.ts` subscribes to
  message inserts per thread and notification inserts per person; typing is a
  broadcast channel.
- Server actions follow one pattern: `resolveSession()` (memoised per
  request), the `ActionResult` envelope (`lib/actions/envelope.ts`), zod
  schemas, writes under the caller's RLS client, and `oncePerTap` replay
  protection for taps.

## 3. Notifications, push and deep links

- One writer: `private.notify(user, kind, title, body, href)`, which honours
  the `messages` and `bookings` preference booleans. `notification_kind` is
  `booking | message | wallet | listing | agent | support | system | social`.
- Push: `notifications` insert trigger `push_enqueue` queues a `push_queue` row
  when the person has a live device (`push_tokens`); `expires_at` defaults to
  12 hours. The drain (`lib/push/drain.ts`, the only sender) runs from
  **pg_cron every five minutes** (`vallo_push_drain`) through
  `/api/push/drain`. Transports: Web Push (VAPID), FCM (Android), APNs (iOS,
  behind its own flag). Policy (`lib/push/policy.ts`) handles expiry,
  preferences, quiet hours (only `wallet` and the new-sign-in path are urgent)
  and collapses per kind.
- Deep links: the service worker routes web push taps; `lib/native/push-taps.ts`
  routes native taps (`pushNotificationActionPerformed`), both only to a path
  on our own origin. Universal Links and App Links cover listing, stay,
  restaurant, profile, post and auth paths, not `/messages`.
- **Consequence for calls:** a five-minute drain cannot ring a phone inside a
  45-second ring. VC1 wakes the existing drain immediately after a call starts
  (`after(() => pushDrain(admin))`) and sets that one push row's `expires_at`
  to the ring deadline, so a ring push is delivered now or never.

## 4. Auth, roles and the admin console

- `public.user_roles` (`user | agent | admin | super_admin`), plus Track K
  staff grants (`public.staff_grants.scopes`: `listing_approval, kyc_review,
  moderation, support, agreements, guarantee, finance, compliance,
  operations`) with a handbook acknowledgement.
- The console's second factor is enforced by the database:
  `private.console_step_up_ok()` (a `console_step_ups` row for this JWT's
  `session_id`), used by `private.has_role` and `private.staff_can(user,
  scope)`. `lib/admin/guard.ts` `requireAdmin(scope)` is the one door.
- Cases and queues already exist and are reused, not duplicated: agent
  applications, business and identity verifications, listings under review,
  support tickets, reports, `queue_claims`, staff notes, `audit_log`
  (append-only by trigger, service role writes).

## 5. Capacitor and native projects (read from source)

- Capacitor 8.5.2. Android `BridgeWebChromeClient.onPermissionRequest` already
  turns a page's VIDEO_CAPTURE and AUDIO_CAPTURE requests into a runtime
  request for CAMERA, MODIFY_AUDIO_SETTINGS and RECORD_AUDIO and grants the
  page if all are granted. Undeclared permissions are refused silently.
  `Bridge.java` sets `setMediaPlaybackRequiresUserGesture(false)`.
- iOS `WebViewDelegationHandler` answers
  `requestMediaCapturePermissionFor` with `.grant` (iOS 15+; the deployment
  target is 15.0), `CAPBridgeViewController` sets `allowsInlineMediaPlayback =
  true` and no user action for playback.
- Before VC1: Android declared no CAMERA or RECORD_AUDIO (deliberately, see the
  manifest comment); iOS had camera and microphone strings for photo and
  walkthrough capture only. `UIBackgroundModes` is `remote-notification` only.
- `MainActivity` enables WebAuthn in the WebView; nothing else custom.

## 6. Env, webhooks, cron and rate limits

- Env: every variable read must appear in `apps/web/.env.example` and
  `docs/ENVIRONMENT.md` (`env-documented.test.ts`); Vercel key names in
  `docs/sessions/VERCEL-KEYS.md`.
- Webhooks: open routes are an explicit allow-list (`PUBLIC_API_PATHS` in
  `src/proxy.ts`), each guarded by a signature or bearer; raw body verified
  before parsing; idempotency by provider ids in the database.
- Cron: Vercel Cron routes through `lib/cron/run.ts` (bearer guard, 503 when
  the service key is missing, report, flag-aware skip), listed in
  `vercel.json`, `VERCEL_JOBS` and the handbook; database jobs through
  pg_cron (`PG_CRON_JOBS`).
- Rate limits: `private.consume_rate_limit(bucket, subject, limit, window)`
  (fixed windows, durable) used from SQL and through `lib/security/rate-limit.ts`
  (fail-open) from TypeScript.
- CSP: per-request nonce, `connect-src` limited to self and Supabase
  (`lib/security/csp.ts`).

## 7. What this meant for the design

1. Calls must be a database domain with its own state machine, reachable only
   through definer functions, because members already write messages directly
   under RLS and a call state must never be client-writable.
2. Call history belongs to the conversation, but the calls table is the one
   source of truth; the conversation gets a marker message whose body is
   plain words and whose `call_id` points at the call.
3. Incoming-call push needs the drain woken now and the push to expire with the ring.
4. Review calls must reuse the existing scopes and cases: the subject is read
   from the case, the scope is the case's, and the second factor applies.
5. The web origin must allow camera and microphone for itself; the Android
   manifest must declare the three permissions; iOS strings must name calls.
