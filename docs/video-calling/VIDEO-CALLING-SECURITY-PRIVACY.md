# Video calling: security and privacy

## Authorisation matrix

Every row is enforced in the database (VC1 definer functions under the
caller's own session). "Staff (scope)" means `private.staff_can(user, scope)`:
an admin or super admin, or a staff member holding that scope with the
current handbook acknowledged, AND this session's console security-key proof.

| Operation | Member in the conversation | The other member | Anyone else | Staff (case scope) | Admin with no scope check |
|---|---|---|---|---|---|
| Start a call in a conversation | Yes, if the other has written there, no block, neither barred, not already in a call | Yes, same rules | No (not found) | No special right | No special right |
| Answer / decline | Callee only | n/a | No | No | No |
| Cancel | Caller only | n/a | No | No | No |
| Hang up | Either participant | Either | No | No | No |
| Join token | Caller from ringing; callee after answering; never after decline, miss or end | same | No | Reviewer of a review call only, re-checked at every token | No |
| See a conversation call | Participants only | | No | No | No (`call_events` raw history only) |
| Request / reschedule / start / note / complete / cancel a review call | n/a | n/a | No | Yes, for cases of their scope only | Yes (admins hold every scope), with the console proof |
| See a review and its notes | Subject sees a reduced view (no notes, evidence, scope, staff identity) | | No | Scope holders | Admins |
| Usage numbers | No | | No | `operations` scope | Yes |

There is **no** path for staff to join a member's private call, to see its
contents, or to turn anyone's camera or microphone on: the media room only
admits identities the database issued for that call, and tokens grant each
person their own publish rights only.

## Token rules

- Server-side only (`lib/calls/token-service.ts`), signed with
  `LIVEKIT_API_SECRET` read from the server environment. The secret never
  reaches a browser, an app bundle, a `NEXT_PUBLIC_` variable, a log or an
  error message (provider errors carry a status and a code only).
- Issued only after `public.call_join_check` passes: signed in, a participant,
  the call not over, cancelled, declined or missed for them, the state allows
  their role to join, not blocked, not barred (banned, deleted, suspended
  agent), still in the conversation, reviewer still holding scope and the
  console proof, under the token rate limit.
- Scope: one room (`vc_` + 32 random hex), one identity (`vp_` + 32 hex, not
  the account id), `roomJoin`, subscribe, publish limited by
  `canPublishSources` (`microphone` on a voice call, `camera` and `microphone`
  on video; the server refuses anything else, verified), `canPublishData:
  false`, `canUpdateOwnMetadata: false`, no admin, record or hidden grants.
- Lifetime: 10 minutes to start a connection; LiveKit refreshes the token over
  the live connection, and a full reconnect asks for a new one (re-checked).
- Never in a URL, a push, a notification, a message, storage or analytics.
  Clients send ids and choices only; state, duration, identity and room are
  the server's.
- Server-to-provider calls use a separate 60-second admin token per request.

## Webhook verification

`POST /api/calls/webhook` verifies before parsing: the `Authorization` JWT
(HS256, issuer = API key, not expired, constant-time signature comparison)
and its `sha256` claim against the raw body. A failure is 401 and counted per
address (429 after 30 in 5 minutes). A verified event is reduced to event id,
event name, room and opaque identity; the payload is trusted for nothing
else. `call_provider_events` (primary key provider + event id) makes retries
and replays no-ops; out-of-order facts older than known ones are ignored. No
payload is stored.

## Rate limits (in the database, where the write happens)

| Bucket | Limit |
|---|---|
| `call:start` per caller | 10 per 10 minutes |
| `call:start:day` per caller | 60 per day |
| `call:pair` caller to callee | 4 per 10 minutes (no ring-bombing one person) |
| `call:token` per person | 30 per 5 minutes |
| `call:review:request` per staff member | 30 per hour |
| `call:review:start` per staff member | 20 per 10 minutes |
| webhook bad signatures per address | 30 per 5 minutes |

Plus: no cold calls (the callee must have written in the thread), one live
call per person, glare and replay handling, a 2-hour ceiling on a
conversation call (1 hour for reviews), three participant slots per room
(two people plus a reconnect).

## Abuse and safety

- Blocks hold both ways at start, answer and every token.
- Reporting: a call happens inside a conversation, so the existing report and
  block flows on the thread apply; the call marker gives support the call id.
  A report flow from the call screen itself is an open question.
- Barred accounts (banned or deleted sign-ins, suspended agents) can neither
  call nor be called.

## Audit

- `call_events`: every transition (actor, source member/staff/provider/system,
  from, to, reason) and provider fact; append-only by trigger, even for the
  owner (a retention purge must say so with `vallo.purge`).
- `audit_log` (existing, append-only): every staff review action with actor,
  action, review, time and reason (the purpose, the reschedule reason, the
  outcome, the cancellation reason).
- `call_review_entries`: append-only; a mistake is corrected by a CORRECTION
  entry pointing at it, never by an edit.
- Nothing logs a token, a secret, an identity, a body or a header.

## Recording and consent

**No recording, no transcription, no AI listening, by default and in code.**
Tokens carry no `recorder` grant, no Egress is configured, nothing stores
media. Review calls keep attendance and the staff member's written outcome,
not the conversation. Recording would be a separately gated capability with a
business need, provider review, legal review, explicit disclosure on screen
and consent from every participant, and it is not built.

## Data held, and retention (proposal for legal review)

| Data | Why | Proposed retention |
|---|---|---|
| `calls` and `call_participants` (who, when, how long, how it ended) | history in the thread, disputes, abuse, billing reconciliation | as long as the conversation exists; then 24 months (the messages schedule) |
| `call_events` | audit and debugging | 24 months |
| `call_provider_events` | idempotency | 30 days (a purge job is not yet written) |
| `call_reviews`, `call_review_entries` | the review record | with the case it belongs to (KYC: the KYC schedule in `docs/RETENTION_SCHEDULE.md`) |

Account deletion: a person's participant rows go with them; the other
party's call record stays with the initiator set to null (db16 rule).

## Questions for qualified review (Nigeria Data Protection Act 2023 and others)

1. Lawful basis for call metadata (contract performance for Messages calls;
   legitimate interest or legal obligation for review calls?).
2. Is a staff review call about identity "processing of sensitive personal
   data" when the face is seen live but nothing is stored? Does the NDPC
   expect a DPIA before launch?
3. Cross-border transfer: LiveKit Cloud media servers may sit outside Nigeria
   (the nearest listed region is South Africa); is an adequacy or transfer
   mechanism needed for transient media, and for metadata held by LiveKit
   (webhook logs, analytics)? Is a DPA with LiveKit in place?
4. Notice: the privacy notice must name calls, metadata kept, the provider and
   the retention above. Store data-safety forms (Apple, Google) must add
   camera and microphone as used for calls, not collected or stored.
5. Children: the platform is 18+; calls inherit it.
6. If recording is ever proposed: consent model, retention, access, and the
   NDPA rules for audio and video of identifiable people.
