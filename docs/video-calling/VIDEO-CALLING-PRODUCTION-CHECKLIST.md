# Video calling: production checklist

In order. Nothing here is done until it is ticked by the person named.

## 1. Database (the lead)

- [ ] Apply `supabase/migrations/pending/vc1_video_calls.sql` with the Supabase
      MCP `apply_migration`, then move it to
      `supabase/migrations/<version>_vc1_video_calls.sql` under the version the
      server stamped and `node scripts/check-migrations.mjs --record <file>`.
- [ ] Move `supabase/tests/probes-pending/vc1-video-calls.sql` to
      `supabase/tests/probes/` in the same commit, and run it on the live
      database (`apply_migration` named `probe_vc1-video-calls`; expect an
      error containing `PROBE_OK vc1-video-calls`, nothing recorded).
- [ ] In the same commit, add the pg_cron job to the registry and handbook,
      or `src/lib/admin/reads/jobs.test.ts` fails once the migration is
      top-level:
      `PG_CRON_JOBS` in `apps/web/src/lib/admin/reads/jobs.ts`:
      `{ name: "vallo_calls_sweep", cron: "* * * * *", when: "every minute", what: "applies every call deadline (missed, failed, connection lost, expired reviews) and writes the missed-call notice (VC1)" },`
      and in `docs/ADMIN_CONSOLE.md` the row
      ``| vallo_calls_sweep | pg_cron `* * * * *` | every minute | | VC1: applies every call deadline and writes missed-call notices (`private.calls_sweep`) |``
      and the count line to `20 Vercel Cron jobs and 37 pg_cron jobs`.
- [ ] Regenerate `apps/web/src/lib/supabase/database.types.ts` (the calls code
      reaches the new functions by name and does not need it, but the types
      should match the database).
- [ ] Confirm `video_calls` and `admin_review_calls` read `false`.

## 2. Dependency (the lockfile owner, D46)

- [ ] Add `livekit-client` (2.22.3 at the time of writing, 7 September 2026)
      to `apps/web/package.json` for the call screens. Nothing else is needed:
      the server side uses `node:crypto`, no `livekit-server-sdk`.

## 3. LiveKit Cloud (the founder)

- [ ] Create a project at cloud.livekit.io (choose the data region with care:
      it cannot be changed later). Plan: Build for the pilot.
- [ ] Settings > Keys: create an API key and secret.
- [ ] Settings > Webhooks: URL `https://www.vallospaces.com/api/calls/webhook`,
      signed with that same API key.
- [ ] Billing: set a usage alert.
- [ ] Do not enable Egress (recording) or any agent feature.

## 4. Vercel environment (the founder; names only, `docs/sessions/VERCEL-KEYS.md`)

- [ ] `LIVEKIT_URL` = `wss://<project>.livekit.cloud`
- [ ] `LIVEKIT_API_KEY`
- [ ] `LIVEKIT_API_SECRET` (server only; never `NEXT_PUBLIC_`)
- [ ] Redeploy (the CSP and the provider read these at runtime).

## 5. Native (the lead, then a device)

- [ ] `CAPACITOR_SERVER_URL="https://www.vallospaces.com" npm run cap:sync`
      in `apps/web`, then release builds for iOS and Android.
- [ ] Run the device list in `VIDEO-CALLING-MOBILE-COMPATIBILITY.md`.
- [ ] Update the App Store privacy answers and the Play Data safety form:
      camera and microphone used for calls, not collected or stored.

## 6. Switch on, in stages

- [ ] Frontend call screens merged (from `VIDEO-CALLING-API-CONTRACTS.md`).
- [ ] Staging or a preview with LiveKit keys: two staff accounts call each
      other on desktop and on both phones.
- [ ] `update public.feature_flags set enabled = true where key = 'video_calls';`
      for the pilot. Watch `/admin/alerts` (`calls.room_close_failed`), the
      `calls-sweep` job on `/admin/operations`, and `call_usage_summary`.
- [ ] Later: `admin_review_calls` on, once the review desk is built and a
      named person runs it.

## 7. Rollback

- Switch `video_calls` (and `admin_review_calls`) off: every call function
  refuses at once; calls in progress keep their media until they end or the
  sweep closes them; nothing else on the platform changes.
- Unset the LiveKit keys: actions answer "calls are not available"; the
  webhook answers 503.
- The schema is additive (new tables, one nullable column on `messages`, one
  replaced trigger function with an early branch). Nothing needs to be
  dropped to roll back.

## 8. Monitoring

- `calls-sweep` (Vercel Cron, every 5 min) in the jobs list; an alert when a
  provider room could not be closed.
- `vallo_calls_sweep` (pg_cron, every minute).
- `call_usage_summary(from, to)` (operations scope): totals by state, audio
  and video, connected vs accepted (connection success), average setup and
  duration, calls with reconnects, estimated participant minutes. The
  provider's own bill is the reconciled figure, kept apart.
- Webhook failures: 503s in the Vercel logs (`[calls] webhook not recorded`);
  401s are counted and rate limited per address.
