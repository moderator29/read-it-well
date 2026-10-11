# Video calling: API contracts

For the frontend agent building the call screens and the admin review desk.
Every member and staff operation is a **server action** returning the
platform's `ActionResult<T>` (`{ ok: true, data } | { ok: false, error,
fieldErrors? }`); `error` is always a sentence to show as is. Types are in
`apps/web/src/lib/calls/types.ts`; pure helpers for the screens are in
`lib/calls/lifecycle.ts` and `lib/calls/reviews.ts`. Nothing returns until the
database has decided.

Switches: `video_calls` and `admin_review_calls` in `feature_flags`, seeded
OFF (`VIDEO_CALLS_FLAG`, `ADMIN_REVIEW_CALLS_FLAG` in `lib/flags/read.ts`; read
with `flagIsOn` to decide whether to draw a call button). The database refuses
every call function while off, whatever a screen draws.

## Messages calls: `lib/calls/actions.ts` ("use server")

| Action | Input | Data on success | Notes |
|---|---|---|---|
| `startCall` | `{ conversationId, kind: "AUDIO" \| "VIDEO", tapKey? }` | `CallSnapshot` (state `RINGING`, or `BUSY`; `glare: true` when the other person is already ringing you, so show THEIR incoming call; `replayed: true` for a repeated tap) | Mint `tapKey` with `crypto.randomUUID()` per tap. Refused: not in the conversation, blocked, barred, the callee has never written in the thread, you are on another call, rate limited, flag off, provider unset |
| `acceptCall` | `{ callId }` | `CallSnapshot` (`ACCEPTED`) | Callee only. Twice is the same answer (second device too) |
| `declineCall` | `{ callId }` | `CallSnapshot` (`DECLINED`) | Callee only, while ringing |
| `cancelCall` | `{ callId }` | `CallSnapshot` (`CANCELLED`) | Caller only, while ringing |
| `endCall` | `{ callId }` | `CallSnapshot` | The one red button: cancels a ringing call you made, declines one ringing for you, ends a live one. Idempotent |
| `getJoinCredentials` | `{ callId }` | `JoinCredentials { callId, serverUrl, token, expiresAt, kind, role, canPublishVideo }` | Caller: from `RINGING` on. Callee: after `acceptCall`. Also for a full reconnect. **Memory only**: never in a URL, storage, log or analytics |
| `heartbeatCall` | `{ callId }` | `CallSnapshot` | Every `HEARTBEAT_SECONDS` (10) while a call screen is open, and on every realtime nudge. Applies deadlines, keeps the call alive without webhooks |
| `callHistory` | `{ conversationId, limit? }` | `CallSnapshot[]` newest first | For the thread's call cards |

### `CallSnapshot` (what a screen draws)

`id, kind, purpose, state, version, conversationId, reviewId, role
(CALLER|CALLEE|REVIEWER|SUBJECT), myState, isInitiator, otherName, otherState,
scheduledFor, createdAt, ringingAt, ringExpiresAt, acceptedAt, connectedAt,
interruptedAt, endedAt, endReason, durationSeconds, serverNow` plus optional
`glare`, `replayed`.

Use `callPhase(state, role)` for the screen (`incoming | outgoing | connecting
| in_call | reconnecting | ended`), `hangUpIntent` for the red button,
`mayJoin` before asking for credentials, `endReasonWords` and
`durationWords` for copy, `overdueTransition` for the countdown (compute the
offset from `serverNow`, never trust the device clock), `newerSnapshot` to
merge updates (higher `version` wins; a finished call never comes back).

### The flows

**Caller:** `startCall` → show outgoing ringing (`ringExpiresAt`) →
`getJoinCredentials` → connect `livekit-client` with `{serverUrl, token}`,
publish microphone (and camera for VIDEO) → on realtime or heartbeat:
`ACCEPTED/CONNECTING` (connecting), `ACTIVE` (in call), `INTERRUPTED`
(reconnecting banner), any terminal state (leave the room, show
`endReasonWords`, go back to the exact thread).

**Callee:** an incoming nudge (`useIncomingCalls`) or a push tap to
`/messages/<id>?call=<callId>` → `heartbeatCall({callId})` (it also tells you
whether it still rings; if it does not, show the "missed call" recovery, not
a dead screen) → incoming screen with accept/decline → `acceptCall` →
`getJoinCredentials` → connect.

**Both:** request camera/microphone only after a tap (start or accept); on
`NotAllowedError` show recovery (how to allow in browser or OS settings,
offer voice only, offer to keep messaging). Clean up tracks on unmount, on
`pagehide`, and when the app goes to the background on iOS
(`App.addListener('appStateChange')`).

### Realtime (`lib/calls/useCallRealtime.ts`, client)

- `useCallUpdates(callId, onNudge)`: `UPDATE` on `public.calls` for this call.
- `useIncomingCalls(userId, onNudge)`: `*` on `public.call_participants` for
  this person (a new row is an invitation). Mount once in the signed-in shell.
- A nudge is `{ callId, state?, version? }`, never the truth: call
  `heartbeatCall` and merge with `newerSnapshot`. RLS limits both to calls the
  person is on.

## Admin review calls: `lib/calls/review-actions.ts` ("use server")

Staff (scope by case kind: `agent_application`, `business_verification`,
`identity_verification` need `kyc_review`; `listing` needs
`listing_approval`; `support_ticket` needs `support`; admins hold all; the
console's security-key proof for this session is required):

| Action | Input | Data |
|---|---|---|
| `requestReviewCall` | `{ caseKind, caseId, purpose (10..500, the subject sees it), kind?, scheduledFor? (ISO, 5 min to 30 days ahead) }` | `StaffReview` (`REQUESTED` or `SCHEDULED`) |
| `rescheduleReviewCall` | `{ reviewId, scheduledFor, reason }` | `StaffReview` (`SCHEDULED`) |
| `startReviewCall` | `{ reviewId }` | `CallSnapshot` (`RINGING` or `BUSY`), then `getJoinCredentials` as the REVIEWER. Only when ACCEPTED, or SCHEDULED within 10 min before to 30 min after |
| `addReviewEntry` | `{ reviewId, kind: NOTE \| EVIDENCE \| CORRECTION, body, evidenceRef? ("listing:<uuid>", "kyc_document:<uuid>"), correctsId? }` | `{ id }` |
| `completeReviewCall` | `{ reviewId, outcome: REVIEW_COMPLETED \| MORE_INFORMATION_REQUIRED \| FOLLOW_UP_REQUIRED (needs followUpDueAt) \| ESCALATED \| NO_SHOW, summary }` | `StaffReview` (`COMPLETED`); ends a live call |
| `cancelReviewCall` | `{ reviewId, reason }` | `StaffReview` (`CANCELLED`, outcome CANCELLED) |

Staff read reviews and entries directly under RLS (`call_reviews`,
`call_review_entries`, scoped) through their own client; `reviewActions(status,
scheduledFor, now)` says which buttons to draw.

Subject (the person the case is about):

| Action | Input | Data |
|---|---|---|
| `myReviewCalls` | none | `SubjectReview[]` (no notes, scope, evidence or staff identity; the caller label is "Vallo review team") |
| `respondToReviewCall` | `{ reviewId, response: ACCEPT \| DECLINE \| PROPOSE, proposedFor? }` | `SubjectReview` |

The subject answers the ringing review call with `acceptCall` /
`declineCall` / `endCall` and connects with `getJoinCredentials`, exactly as
in Messages. Copy on the subject's screen must say that a review call does not
by itself verify identity, ownership or a licence.

## Route handlers

| Route | Who calls it | Guard |
|---|---|---|
| `POST /api/calls/webhook` | LiveKit | The `Authorization` JWT over the raw body's sha256, signed with the API secret; 401 otherwise (429 after 30 bad signatures from one address in 5 min). 200 for handled or ignored events, 503 when the database could not record it (the provider retries; idempotent) |
| `GET/POST /api/cron/calls-sweep` | Vercel Cron, every 5 min | The cron bearer (`lib/cron/run.ts`); skipped while `video_calls` is off |

## Database functions (for reference; screens use the actions)

Member/staff (`authenticated`, each checks its caller): `call_start, call_accept,
call_decline, call_cancel, call_end, call_join_check, call_heartbeat,
call_history, call_review_request, call_review_respond, call_review_reschedule,
call_review_start, call_review_add_entry, call_review_complete,
call_review_cancel, my_call_reviews, call_usage_summary` (operations scope).
Service role only: `call_provider_event, call_provider_presence,
calls_sweep_service, calls_rooms_to_close, calls_mark_rooms_closed`.
Refusals raise `call:<token>` / `review:<token>`; `lib/calls/errors.ts` turns
each into the sentence the action returns.

## Deep links the screens must handle

| Path | Meaning |
|---|---|
| `/messages/<conversationId>?call=<callId>` and `/agent/messages/<id>?call=<callId>` | open the thread and resolve the call with `heartbeatCall`: ringing for me → incoming screen; live and mine → rejoin; finished → a plain "missed call" or "call ended" line with call-back |
| `/calls/reviews/<reviewId>` (`?call=<callId>` when ringing) | the subject's review invitation page (new route, frontend) |
| `/admin/review-calls/<reviewId>` | the staff review desk page (new route, frontend) |

An unknown, expired or not-yours call id is the same calm "this call is no
longer available" screen, never a 404 that confirms it exists.
