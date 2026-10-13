# Video calling: architecture

Calls are a Vallo domain. The provider (LiveKit, `VIDEO-CALLING-PROVIDER-DECISION.md`)
carries media and nothing else. The database is the source of truth for who
may call whom, the state of every call, its history and every review outcome.

```
Call screens (Messages thread, incoming overlay, admin review desk)      frontend agent
        │  server actions (lib/calls/actions.ts, review-actions.ts)
        ▼
Call orchestrator in Postgres (VC1 migration)                             the source of truth
   authorisation · lifecycle · invitations · scheduling · history · audit
        │                         │                          │
        ▼                         ▼                          ▼
 calls, call_participants,   private.notify + push      call_reviews +
 call_events (append-only)   (incoming, missed,         call_review_entries
 messages.call_id marker     review invitations)        (append-only)
        │
        ▼
Provider adapter (lib/calls/provider/livekit.ts)        the ONLY LiveKit-aware file
   join tokens · room create/delete/list · webhook verification
        │
        ▼
LiveKit (Cloud, or the open-source server)             media, rooms, TURN
```

## The logical services, and where each lives

The brief's service names map onto the repo's own pattern (definer functions
in SQL for anything that decides, thin server actions, pure TypeScript rules
that tests can hold). Not a file per service.

| Service | Where |
|---|---|
| CallOrchestrator, CallStateService | `private.call_transition`, `private.call_apply_timeouts`, `private.call_on_terminal` (SQL); `lib/calls/lifecycle.ts` mirrors the table for screens |
| CallAuthorizationService | `public.call_start`, `call_accept`, `call_join_check`, ...: membership, blocks, barred accounts, engagement, roles, staff scope (SQL) |
| CallInvitationService, CallSchedulingService | `private.call_ring` (ring, notify, push expiry), review request/respond/reschedule/start (SQL) |
| CallTokenService | `lib/calls/token-service.ts` (signs only after `call_join_check`) |
| CallNotificationService | `private.call_ring`, `private.call_on_terminal` through `private.notify`; `pushNow()` wakes the existing drain |
| CallHistoryService | `public.call_history`, `messages.call_id` markers |
| CallWebhookService | `lib/calls/webhook.ts`, `app/api/calls/webhook/route.ts`, `public.call_provider_event` |
| CallAuditService | `public.call_events` (append-only), `public.audit_log` for staff actions |
| CallUsageService | `calls.participant_seconds` (estimated), `reconciled_participant_seconds` (provider), `public.call_usage_summary` |
| AdminReviewCallService | `public.call_review_*`, `lib/calls/review-actions.ts`, `lib/calls/reviews.ts` |
| Provider adapter | `lib/calls/provider/` (`types.ts` boundary, `livekit.ts`, `jwt.ts`, `index.ts`) |
| Sweeps | pg_cron `vallo_calls_sweep` every minute (deadlines); Vercel Cron `/api/cron/calls-sweep` every 5 min (provider rooms) |

## The provider boundary

```ts
interface CallProvider {
  prepareRoom(room, { maxParticipants, emptyTimeoutSeconds }): Promise<void>;
  issueParticipantCredentials({ room, identity, displayName, canPublishVideo, ttlSeconds }): Promise<{ serverUrl, token, expiresAt }>;
  endRoom(room): Promise<void>;
  listParticipants(room): Promise<string[]>;           // quality/usage reads plug in here later
  verifyWebhook(rawBody, authorization): Promise<ProviderEvent | null>;
}
```

Errors are `CallProviderError` with a kind (`unconfigured | unauthorised |
not_found | unavailable | rejected`); a message never carries a secret. Room
names (`vc_` + 32 hex) and identities (`vp_` + 32 hex) are minted by the
database, random and opaque, and the adapter refuses anything else.

## The lifecycle

States: `CREATED, INVITATION_PENDING, RINGING, ACCEPTED, CONNECTING, ACTIVE,
INTERRUPTED` (live) and `ENDED, DECLINED, CANCELLED, MISSED, BUSY, FAILED,
EXPIRED` (terminal). Legal moves, the only ones the database accepts
(`private.call_transition_allowed`; `lifecycle.test.ts` holds the TypeScript
copy equal to it):

| From | To |
|---|---|
| CREATED | RINGING, INVITATION_PENDING, BUSY, CANCELLED, FAILED |
| INVITATION_PENDING | RINGING, BUSY, CANCELLED, EXPIRED |
| RINGING | ACCEPTED, DECLINED, CANCELLED, MISSED, FAILED |
| ACCEPTED | CONNECTING, ACTIVE, ENDED, FAILED |
| CONNECTING | ACTIVE, ENDED, FAILED |
| ACTIVE | INTERRUPTED, ENDED |
| INTERRUPTED | ACTIVE, ENDED |

What moves a call:

| Move | By |
|---|---|
| CREATED to RINGING (or BUSY when the callee is in a live call) | `call_start`, `call_review_start` |
| RINGING to ACCEPTED / DECLINED | the callee (`call_accept`, `call_decline`, or `call_end` while ringing) |
| RINGING to CANCELLED | the caller (`call_cancel`, or `call_end` while ringing) |
| RINGING to MISSED | the ring deadline (45 s) |
| ACCEPTED to CONNECTING | the callee's first join token |
| ACCEPTED/CONNECTING/INTERRUPTED to ACTIVE | the provider: two participants joined (webhook or server-read presence) |
| ACTIVE to INTERRUPTED | the provider: a participant left while the other stayed |
| INTERRUPTED to ENDED | the reconnect grace (30 s) running out |
| any live state to ENDED | either participant hanging up; room finished at the provider; max duration; no activity for 120 s |
| ACCEPTED/CONNECTING to FAILED | no media within 60 s of answering |
| CREATED to FAILED | never rang within 60 s (abandoned setup) |
| INVITATION_PENDING to EXPIRED | its invitation expiry (reserved; VC1 enters this state nowhere yet) |

**A disconnect is not an end.** INTERRUPTED keeps the call open for the grace;
a rejoin with a fresh token returns it to ACTIVE and counts a reconnect.

### Timeouts (`private.call_timeout_seconds`, mirrored in `CALL_TIMEOUTS`)

| Name | Seconds | Effect |
|---|---|---|
| ring | 45 | RINGING to MISSED (`no_answer`) |
| connect | 60 | ACCEPTED or CONNECTING to FAILED (`connect_timeout`) |
| reconnect_grace | 30 | INTERRUPTED to ENDED (`connection_lost`) |
| stale_activity | 120 | ACTIVE or INTERRUPTED with no heartbeat and no provider fact to ENDED (`stale`) |
| setup | 60 | CREATED to FAILED (`setup_abandoned`) |
| review_join_early / late | 600 / 1800 | the window around a scheduled review in which staff may start it |
| (max duration) | 7200 conversation, 3600 review | ACTIVE to ENDED (`max_duration`) |
| (review response) | 72 h, or scheduled time + 30 min | an unanswered review request becomes EXPIRED |

Deadlines are applied **lazily** by every function that reads or changes a
call (so no screen ever sees a state its clock has left), by the pg_cron sweep
every minute (so a missed call is recorded with nobody online), and by the
screen's own countdown (`overdueTransition`) for display only.

### Concurrency and replay

- Every transition locks the call row (`for update`) and checks the legal
  table; a second identical action answers the same snapshot (idempotent).
- `call_start` takes advisory locks on both people in a fixed order (no
  deadlock when two people call each other), then:
  - **glare**: if the other person is already ringing me in this thread, their
    call is returned with `glare: true` instead of a second call;
  - **busy**: a callee in another live call gets a BUSY call record and a
    missed-call notification; a caller already in a call is refused;
  - **replay**: `p_client_key` (the tap's UUID) is unique per initiator; a
    replayed tap returns the first call with `replayed: true`.
- Provider facts carry the provider's event id; `call_provider_events` makes
  a retried or replayed webhook a no-op, and facts older than what is already
  known (a leave older than the latest join) are ignored as stale.
- Realtime, heartbeats and action replies can arrive in any order; each
  snapshot carries `version`, and `newerSnapshot` keeps the higher one and
  never revives a finished call.

## The data model (VC1), and why it is the smallest set

| Table | Holds |
|---|---|
| `calls` | id, kind (AUDIO/VIDEO), purpose (CONVERSATION/ADMIN_REVIEW), state, initiator, conversation, listing, business, review, provider, provider room, client key, scheduled time, ring/invitation expiry, created/ringing/accepted/connecting/connected/interrupted/ended timestamps, end reason, duration, estimated and reconciled participant seconds, max duration, reconnect count, version |
| `call_participants` | per person: role (CALLER/CALLEE/REVIEWER/SUBJECT), state, opaque provider identity, invited/responded/joined/left/last seen, join and token counts, connected seconds |
| `call_events` | append-only: every transition and provider fact, actor, source, from/to |
| `call_provider_events` | one row per provider event id (idempotency), outcome; no payload kept |
| `call_reviews` | a review call request on an existing case: case kind + id, subject (read from the case), requester, required scope, purpose, status, schedule, outcome |
| `call_review_entries` | append-only notes, evidence references, corrections, attendance, outcome |
| `messages.call_id` | the conversation's marker for a finished call (plain words; members cannot write it) |

Not added, on purpose: `call_schedules`, `call_invitations` (two columns
each), `call_quality_summaries` (no quality feed yet), `admin_review_sessions`
(the review row is the session), `admin_review_evidence_links` (an entry kind).
No token, secret, provider payload or risk signal is stored anywhere.

## Messages integration

When a conversation call ends, one marker message is written (sender: the
caller; body e.g. `Video call, 4 min 12 s`, `Video call, missed`); the
`notify_message` trigger recognises `call_id` and only moves the thread to the
top. The thread renders a call card from the calls row (per viewer: "Missed
video call" for the callee, "No answer" for the caller) using
`call_history` or the marker's `call_id`. Old clients still read the plain body.

Calls require the callee to have written in the thread at least once
("no cold calls"); the caller-callee pair, block, barred-account and
membership rules are the conversation's own.

## Notifications

| Event | Who | Kind | Where it opens |
|---|---|---|---|
| Incoming call | callee | `message` (review: `system`) | `/messages/<conv>?call=<call>` or `/agent/messages/<conv>?call=<call>` for the agent side; review `/calls/reviews/<review>?call=<call>` |
| Missed (no answer, busy, cancelled after ringing) | callee | same | the thread (no `call` param) |
| Review requested / rescheduled / cancelled / completed | subject | `system` | `/calls/reviews/<review>` |
| Review accepted / declined / time proposed | the requesting staff member | `system` | `/admin/review-calls/<review>` |

The incoming push is woken immediately and expires with the ring. Quiet
hours apply (a call is not marked urgent): a ring during quiet hours is held
past its expiry and therefore not sent (`VIDEO-CALLING-OPEN-QUESTIONS.md`).
No token, room or review detail is ever in a URL or a push payload.

## Failure handling

| Failure | Behaviour |
|---|---|
| Provider keys unset | `startCall`, `startReviewCall`, `getJoinCredentials` refuse with one sentence; nothing rings |
| Room create fails | the join proceeds (LiveKit also opens a room on first join); logged without detail |
| Webhook not recorded | 503 so the provider retries; idempotency makes the retry safe |
| Webhooks absent or late | heartbeats every 10 s; every 10 s at most the server reads the provider's presence list into the call |
| A screen loses realtime | the heartbeat answers the state |
| A phone drops | INTERRUPTED, 30 s grace, rejoin with a new token |
| Nobody online when a ring expires | pg_cron sweep records MISSED within a minute and notifies |
| A finished room still has someone in it | the sweep (and the webhook) delete the room at the provider |
