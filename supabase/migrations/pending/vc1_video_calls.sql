-- VC1: VIDEO AND VOICE CALLS, ONE SHARED CALLING INFRASTRUCTURE (8 October 2026).
--
-- Spec: docs/video-calling/BRIEF.md. Design: docs/video-calling/VIDEO-CALLING-ARCHITECTURE.md
-- (the lifecycle and every timeout), VIDEO-CALLING-API-CONTRACTS.md (each function below),
-- VIDEO-CALLING-SECURITY-PRIVACY.md (the authorisation matrix) and
-- VIDEO-CALLING-ADMIN-REVIEWS.md (review calls).
--
-- WHAT THIS ADDS, AND WHY IT IS THE SMALLEST COHERENT SET.
--
--   public.calls                 one row per call: kind, purpose, context, state,
--                                the server's own timestamps, the provider room
--                                name (random, server minted, never a link).
--   public.call_participants     who may join and what each did (invited,
--                                answered, joined, left), and the opaque
--                                identity the media provider sees.
--   public.call_events           append-only: every transition and every
--                                provider fact, with actor and source.
--   public.call_provider_events  one row per provider webhook id, so a retried
--                                or replayed webhook is answered "duplicate".
--   public.call_reviews          an admin review call request, tied to an
--                                EXISTING case (an agent application, a business
--                                or identity verification, a listing, a support
--                                ticket) and to the staff scope that case needs.
--   public.call_review_entries   append-only notes, evidence references,
--                                corrections, attendance and the outcome.
--   public.messages.call_id      the marker a finished call leaves in its
--                                conversation. The calls row stays the one source
--                                of truth; the message is the timeline entry and
--                                carries only plain words ("Video call, missed").
--
-- WHAT IT REUSES: conversations and messages (membership, blocks, realtime),
-- private.notify and the push queue (incoming, missed, review invitations),
-- private.consume_rate_limit (abuse limits where the write happens),
-- private.staff_can (scoped staff permission with the console's second factor),
-- public.audit_log (append-only staff trail), public.feature_flags, pg_cron.
-- Considered and NOT added: call_schedules and call_invitations (the scheduled
-- time and expiry are two columns on calls and call_reviews), call_quality_summaries
-- (no provider quality feed is wired yet; usage is computed from participants),
-- admin_review_sessions (a review row IS the session; its calls are its attempts),
-- admin_review_evidence_links (evidence is an entry kind with a typed reference).
--
-- THE RULES IT KEEPS. RLS on every new table. Every state change goes through a
-- SECURITY DEFINER function that checks the legal transition table
-- (private.call_transition_allowed); members and staff hold no INSERT, UPDATE or
-- DELETE on any call table. Definer functions run with `search_path = ''`. Private
-- helpers are revoked from public, anon and authenticated. Nothing is dropped:
-- the only replaced object is private.notify_message, which gains one early branch
-- for call markers and is otherwise the live definition (read 8 October 2026).
-- Both switches are seeded OFF: `video_calls` and `admin_review_calls`.
-- No token, secret or provider credential is ever stored in the database.

set local lock_timeout = '5s';

-- ---------------------------------------------------------------------------
-- 1. Switches, fail closed.
-- ---------------------------------------------------------------------------

insert into public.feature_flags (key, enabled, note)
values
  ('video_calls', false, 'VC1: voice and video calls in Messages. Off until the provider keys, webhook and device checks in docs/video-calling/VIDEO-CALLING-PRODUCTION-CHECKLIST.md are done.'),
  ('admin_review_calls', false, 'VC1: staff-scheduled review calls. Needs video_calls on as well.')
on conflict (key) do nothing;

create or replace function private.call_flag_on(p_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select f.enabled from public.feature_flags f where f.key = p_key), false);
$$;

-- ---------------------------------------------------------------------------
-- 2. Tables.
-- ---------------------------------------------------------------------------

create table if not exists public.call_reviews (
  id uuid primary key default gen_random_uuid(),
  case_kind text not null
    check (case_kind in ('agent_application', 'business_verification', 'identity_verification', 'listing', 'support_ticket')),
  case_id uuid not null,
  subject_id uuid references auth.users (id) on delete set null,
  requested_by uuid references auth.users (id) on delete set null,
  required_scope text not null check (required_scope in ('kyc_review', 'listing_approval', 'support')),
  purpose text not null check (char_length(btrim(purpose)) between 10 and 500),
  kind text not null default 'VIDEO' check (kind in ('AUDIO', 'VIDEO')),
  status text not null default 'REQUESTED'
    check (status in ('REQUESTED', 'SCHEDULED', 'RESCHEDULE_REQUESTED', 'ACCEPTED', 'DECLINED',
                      'IN_CALL', 'COMPLETED', 'CANCELLED', 'EXPIRED')),
  scheduled_for timestamptz,
  proposed_for timestamptz,
  respond_by timestamptz not null default (now() + interval '72 hours'),
  outcome text check (outcome in ('REVIEW_COMPLETED', 'MORE_INFORMATION_REQUIRED', 'FOLLOW_UP_REQUIRED',
                                  'ESCALATED', 'NO_SHOW', 'CANCELLED')),
  outcome_at timestamptz,
  outcome_by uuid references auth.users (id) on delete set null,
  follow_up_due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint call_reviews_outcome_closes check ((outcome is not null) = (status in ('COMPLETED', 'CANCELLED'))),
  constraint call_reviews_cancel_outcome check ((status = 'CANCELLED') = (outcome is not distinct from 'CANCELLED')),
  constraint call_reviews_scheduled_has_time check (status <> 'SCHEDULED' or scheduled_for is not null),
  constraint call_reviews_follow_up_has_date check (outcome is distinct from 'FOLLOW_UP_REQUIRED' or follow_up_due_at is not null)
);

comment on table public.call_reviews is
  'VC1: a staff review call about an existing case. Written only through the call_review_* functions. Joining a review call verifies nothing by itself.';

create unique index if not exists call_reviews_one_open_per_case
  on public.call_reviews (case_kind, case_id) where status not in ('COMPLETED', 'CANCELLED');
create index if not exists call_reviews_subject_idx on public.call_reviews (subject_id, created_at desc);
create index if not exists call_reviews_status_idx on public.call_reviews (status, respond_by);

create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('AUDIO', 'VIDEO')),
  purpose text not null default 'CONVERSATION' check (purpose in ('CONVERSATION', 'ADMIN_REVIEW')),
  state text not null default 'CREATED'
    check (state in ('CREATED', 'INVITATION_PENDING', 'RINGING', 'ACCEPTED', 'CONNECTING', 'ACTIVE', 'ENDED',
                     'DECLINED', 'CANCELLED', 'MISSED', 'BUSY', 'FAILED', 'EXPIRED', 'INTERRUPTED')),
  initiator_id uuid references auth.users (id) on delete set null,
  conversation_id uuid references public.conversations (id) on delete set null,
  listing_id uuid references public.listings (id) on delete set null,
  business_id uuid references public.businesses (id) on delete set null,
  review_id uuid references public.call_reviews (id) on delete set null,
  provider text not null default 'livekit' check (provider in ('livekit')),
  /* Server minted and random: knowing a room name grants nothing without a
     token, and it is never derived from a person or a conversation. */
  provider_room text not null unique default ('vc_' || replace(gen_random_uuid()::text, '-', ''))
    check (provider_room ~ '^vc_[0-9a-f]{32}$'),
  client_key uuid,
  scheduled_for timestamptz,
  invitation_expires_at timestamptz,
  ring_expires_at timestamptz,
  created_at timestamptz not null default now(),
  ringing_at timestamptz,
  accepted_at timestamptz,
  connecting_at timestamptz,
  connected_at timestamptz,
  interrupted_at timestamptz,
  ended_at timestamptz,
  updated_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  presence_checked_at timestamptz,
  provider_closed_at timestamptz,
  end_reason text check (end_reason ~ '^[a-z_]{1,40}$'),
  duration_seconds integer check (duration_seconds >= 0),
  participant_seconds integer check (participant_seconds >= 0),
  /* Kept apart from the estimate on purpose: filled only from the provider's
     own usage figures, never computed here. */
  reconciled_participant_seconds integer check (reconciled_participant_seconds >= 0),
  max_duration_seconds integer not null default 7200 check (max_duration_seconds between 60 and 14400),
  reconnect_count integer not null default 0,
  version integer not null default 0,
  constraint calls_purpose_context check (
    (purpose = 'CONVERSATION' and review_id is null)
    or (purpose = 'ADMIN_REVIEW' and conversation_id is null)),
  constraint calls_client_key_once unique (initiator_id, client_key)
);

comment on table public.calls is
  'VC1: one voice or video call. State changes only through private.call_transition. The provider room name is not a credential.';

create index if not exists calls_conversation_idx on public.calls (conversation_id, created_at desc);
create index if not exists calls_review_idx on public.calls (review_id, created_at desc);
create index if not exists calls_open_idx on public.calls (state, updated_at)
  where state in ('CREATED', 'INVITATION_PENDING', 'RINGING', 'ACCEPTED', 'CONNECTING', 'ACTIVE', 'INTERRUPTED');
create index if not exists calls_rooms_to_close_idx on public.calls (ended_at)
  where provider_closed_at is null and ended_at is not null;

create table if not exists public.call_participants (
  call_id uuid not null references public.calls (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  id uuid not null default gen_random_uuid() unique,
  /* What the media provider sees. Opaque: not the account id, not a name. */
  provider_identity text generated always as ('vp_' || replace(id::text, '-', '')) stored,
  role text not null check (role in ('CALLER', 'CALLEE', 'REVIEWER', 'SUBJECT')),
  state text not null default 'INVITED'
    check (state in ('INVITED', 'RINGING', 'ACCEPTED', 'DECLINED', 'JOINED', 'LEFT', 'MISSED', 'REMOVED')),
  invited_at timestamptz not null default now(),
  responded_at timestamptz,
  first_joined_at timestamptz,
  joined_at timestamptz,
  left_at timestamptz,
  last_seen_at timestamptz,
  join_count integer not null default 0,
  token_count integer not null default 0,
  last_token_at timestamptz,
  connected_seconds integer not null default 0 check (connected_seconds >= 0),
  primary key (call_id, user_id)
);

create index if not exists call_participants_user_idx on public.call_participants (user_id, invited_at desc);
create unique index if not exists call_participants_identity_idx on public.call_participants (provider_identity);

create table if not exists public.call_events (
  id bigint generated always as identity primary key,
  call_id uuid not null references public.calls (id) on delete cascade,
  actor_id uuid,
  source text not null check (source in ('member', 'staff', 'provider', 'system')),
  event text not null check (event ~ '^[a-z_.]{1,60}$'),
  from_state text,
  to_state text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists call_events_call_idx on public.call_events (call_id, id);

create table if not exists public.call_provider_events (
  provider text not null check (provider in ('livekit')),
  event_id text not null check (char_length(event_id) between 1 and 200),
  event text not null check (char_length(event) between 1 and 60),
  room text,
  call_id uuid references public.calls (id) on delete set null,
  provider_created_at timestamptz,
  received_at timestamptz not null default now(),
  outcome text not null default 'received' check (outcome ~ '^[a-z_]{1,40}$'),
  primary key (provider, event_id)
);

create index if not exists call_provider_events_received_idx on public.call_provider_events (received_at);

create table if not exists public.call_review_entries (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.call_reviews (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('NOTE', 'EVIDENCE', 'CORRECTION', 'ATTENDANCE', 'OUTCOME')),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  /* A reference to a record that already exists elsewhere, never a file:
     `kyc_document:<uuid>`, `listing:<uuid>`, `support_ticket:<uuid>`. */
  evidence_ref text check (evidence_ref ~ '^[a-z_]{2,40}:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  corrects_id uuid references public.call_review_entries (id),
  outcome text,
  created_at timestamptz not null default now(),
  constraint call_review_entries_evidence_has_ref check (kind <> 'EVIDENCE' or evidence_ref is not null),
  constraint call_review_entries_correction_points check (kind <> 'CORRECTION' or corrects_id is not null)
);

create index if not exists call_review_entries_review_idx on public.call_review_entries (review_id, created_at);

-- The call marker in a conversation. One per call, written by the call functions only.
alter table public.messages add column if not exists call_id uuid references public.calls (id) on delete set null;
create unique index if not exists messages_call_marker_once on public.messages (call_id) where call_id is not null;

-- ---------------------------------------------------------------------------
-- 3. Append-only history.
-- ---------------------------------------------------------------------------

create or replace function private.call_history_is_append_only()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  /* The one way out is a retention purge that says so for its own
     transaction; nothing in this migration sets it. */
  if tg_op = 'DELETE' and coalesce(current_setting('vallo.purge', true), '') = 'call_retention' then
    return old;
  end if;
  raise exception 'call:append_only' using errcode = '42501',
    detail = tg_table_name || ' keeps its history. Write a correction instead.';
end;
$$;

drop trigger if exists call_events_append_only on public.call_events;
create trigger call_events_append_only before update or delete on public.call_events
  for each row execute function private.call_history_is_append_only();

drop trigger if exists call_review_entries_append_only on public.call_review_entries;
create trigger call_review_entries_append_only before update or delete on public.call_review_entries
  for each row execute function private.call_history_is_append_only();

-- ---------------------------------------------------------------------------
-- 4. RLS and grants. Members and staff read; nobody writes directly.
-- ---------------------------------------------------------------------------

alter table public.calls enable row level security;
alter table public.call_participants enable row level security;
alter table public.call_events enable row level security;
alter table public.call_provider_events enable row level security;
alter table public.call_reviews enable row level security;
alter table public.call_review_entries enable row level security;

revoke all on public.calls, public.call_participants, public.call_events, public.call_provider_events,
              public.call_reviews, public.call_review_entries from public, anon, authenticated;
grant select on public.calls, public.call_participants, public.call_events,
                public.call_reviews, public.call_review_entries to authenticated;
grant all on public.calls, public.call_participants, public.call_events, public.call_provider_events,
             public.call_reviews, public.call_review_entries to service_role;

create or replace function private.call_is_participant(p_call uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.call_participants p
     where p.call_id = p_call and p.user_id = (select auth.uid()));
$$;

create or replace function private.call_review_staff_can(p_review uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.call_reviews r
     where r.id = p_review and private.staff_can((select auth.uid()), r.required_scope));
$$;

drop policy if exists calls_select_participant_or_reviewer on public.calls;
create policy calls_select_participant_or_reviewer on public.calls
  for select to authenticated
  using (private.call_is_participant(id)
         or (purpose = 'ADMIN_REVIEW' and review_id is not null and private.call_review_staff_can(review_id)));

drop policy if exists call_participants_select_same_call on public.call_participants;
create policy call_participants_select_same_call on public.call_participants
  for select to authenticated
  using (private.call_is_participant(call_id)
         or exists (select 1 from public.calls c
                     where c.id = call_participants.call_id and c.purpose = 'ADMIN_REVIEW'
                       and c.review_id is not null and private.call_review_staff_can(c.review_id)));

-- The raw event history is an operations record: admins (with the console's
-- second factor, through has_role) and the review's own scoped staff.
drop policy if exists call_events_select_staff on public.call_events;
create policy call_events_select_staff on public.call_events
  for select to authenticated
  using (private.has_role((select auth.uid()), 'admin'::public.app_role)
         or private.has_role((select auth.uid()), 'super_admin'::public.app_role)
         or exists (select 1 from public.calls c
                     where c.id = call_events.call_id and c.purpose = 'ADMIN_REVIEW'
                       and c.review_id is not null and private.call_review_staff_can(c.review_id)));

-- No policy on call_provider_events: service role only.

drop policy if exists call_reviews_select_scoped_staff on public.call_reviews;
create policy call_reviews_select_scoped_staff on public.call_reviews
  for select to authenticated
  using (private.call_review_staff_can(id));

drop policy if exists call_review_entries_select_scoped_staff on public.call_review_entries;
create policy call_review_entries_select_scoped_staff on public.call_review_entries
  for select to authenticated
  using (private.call_review_staff_can(review_id));

-- A member can never write a call marker into a conversation themselves.
drop policy if exists messages_insert_no_call_marker on public.messages;
create policy messages_insert_no_call_marker on public.messages
  as restrictive for insert to anon, authenticated
  with check (call_id is null);

-- ---------------------------------------------------------------------------
-- 5. The lifecycle. One table of legal moves, read by every transition.
--    apps/web/src/lib/calls/lifecycle.test.ts parses this list and holds the
--    TypeScript state machine to it, so the two cannot drift.
-- ---------------------------------------------------------------------------

create or replace function private.call_transition_allowed(p_from text, p_to text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select (p_from, p_to) in (
    -- TRANSITIONS BEGIN
    ('CREATED', 'RINGING'),
    ('CREATED', 'INVITATION_PENDING'),
    ('CREATED', 'BUSY'),
    ('CREATED', 'CANCELLED'),
    ('CREATED', 'FAILED'),
    ('INVITATION_PENDING', 'RINGING'),
    ('INVITATION_PENDING', 'BUSY'),
    ('INVITATION_PENDING', 'CANCELLED'),
    ('INVITATION_PENDING', 'EXPIRED'),
    ('RINGING', 'ACCEPTED'),
    ('RINGING', 'DECLINED'),
    ('RINGING', 'CANCELLED'),
    ('RINGING', 'MISSED'),
    ('RINGING', 'FAILED'),
    ('ACCEPTED', 'CONNECTING'),
    ('ACCEPTED', 'ACTIVE'),
    ('ACCEPTED', 'ENDED'),
    ('ACCEPTED', 'FAILED'),
    ('CONNECTING', 'ACTIVE'),
    ('CONNECTING', 'ENDED'),
    ('CONNECTING', 'FAILED'),
    ('ACTIVE', 'INTERRUPTED'),
    ('ACTIVE', 'ENDED'),
    ('INTERRUPTED', 'ACTIVE'),
    ('INTERRUPTED', 'ENDED')
    -- TRANSITIONS END
  );
$$;

create or replace function private.call_state_is_terminal(p_state text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_state in ('ENDED', 'DECLINED', 'CANCELLED', 'MISSED', 'BUSY', 'FAILED', 'EXPIRED');
$$;

/* The timeouts, in one place. Mirrored by CALL_TIMEOUTS in lib/calls/lifecycle.ts
   and pinned there by a test that reads these numbers out of this file. */
create or replace function private.call_timeout_seconds(p_name text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_name
    -- TIMEOUTS BEGIN
    when 'ring' then 45
    when 'connect' then 60
    when 'reconnect_grace' then 30
    when 'stale_activity' then 120
    when 'setup' then 60
    when 'review_join_early' then 600
    when 'review_join_late' then 1800
    -- TIMEOUTS END
  end;
$$;

-- Display words. Plain, no em dash, no figures the call did not produce.
create or replace function private.call_kind_words(p_kind text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when p_kind = 'AUDIO' then 'voice call' else 'video call' end;
$$;

create or replace function private.call_person_name(p_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select coalesce(nullif(btrim(p.display_name), ''), nullif(btrim(p.first_name), ''))
       from public.profiles p where p.id = p_user),
    'Someone');
$$;

/* Where a notification about this call opens, for this person. Mirrors
   private.notify_message: the agent side of a thread lives in its workspace. */
create or replace function private.call_href(p_call uuid, p_user uuid, p_with_call boolean)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when c.purpose = 'ADMIN_REVIEW' then
      '/calls/reviews/' || c.review_id::text || case when p_with_call then '?call=' || c.id::text else '' end
    when cv.id is null then '/messages'
    else case when cv.agent_id = p_user then '/agent/messages/' else '/messages/' end
         || cv.id::text || case when p_with_call then '?call=' || c.id::text else '' end
  end
  from public.calls c
  left join public.conversations cv on cv.id = c.conversation_id
  where c.id = p_call;
$$;

/* Accounts that cannot call or be called: a banned or deleted sign-in, or an
   agent with a suspension that has not been lifted. */
create or replace function private.call_account_barred(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user is null
      or exists (select 1 from auth.users u
                  where u.id = p_user
                    and ((u.banned_until is not null and u.banned_until > now()) or u.deleted_at is not null))
      or exists (select 1 from public.agent_suspensions s
                   join public.agents a on a.id = s.agent_id
                  where a.user_id = p_user and s.lifted_at is null);
$$;

-- ---------------------------------------------------------------------------
-- 6. The transition, and what a finished call leaves behind.
-- ---------------------------------------------------------------------------

create or replace function private.call_on_terminal(p_call uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.calls;
  callee uuid;
  words text;
  marker text;
  mins integer;
  secs integer;
begin
  select * into c from public.calls where id = p_call;

  -- Everybody still in the room leaves with the call; their time is counted.
  update public.call_participants p
     set connected_seconds = p.connected_seconds
           + greatest(0, floor(extract(epoch from (c.ended_at - p.joined_at))))::integer,
         state = 'LEFT',
         left_at = c.ended_at
   where p.call_id = c.id and p.state = 'JOINED' and p.joined_at is not null;

  -- Anybody who never answered missed it.
  update public.call_participants p
     set state = 'MISSED'
   where p.call_id = c.id and p.state in ('INVITED', 'RINGING')
     and c.state in ('MISSED', 'BUSY', 'CANCELLED', 'EXPIRED', 'FAILED');

  update public.calls
     set participant_seconds = (select coalesce(sum(p.connected_seconds), 0)
                                  from public.call_participants p where p.call_id = c.id)
   where id = c.id;

  select p.user_id into callee
    from public.call_participants p
   where p.call_id = c.id and p.role in ('CALLEE', 'SUBJECT')
   limit 1;

  words := private.call_kind_words(c.kind);

  -- The marker in the conversation. Best effort: a refused marker (a message
  -- limit, a block written a second ago) never undoes the call's own ending.
  if c.purpose = 'CONVERSATION' and c.conversation_id is not null and c.initiator_id is not null then
    if c.state = 'ENDED' and c.connected_at is not null and c.duration_seconds is not null then
      mins := c.duration_seconds / 60;
      secs := c.duration_seconds % 60;
      marker := upper(left(words, 1)) || substr(words, 2) || ', '
        || case when mins > 0 then mins::text || ' min ' else '' end || secs::text || ' s';
    else
      marker := upper(left(words, 1)) || substr(words, 2) || ', ' || case c.state
        when 'ENDED' then 'ended'
        when 'DECLINED' then 'declined'
        when 'CANCELLED' then 'cancelled'
        when 'MISSED' then 'missed'
        when 'BUSY' then 'missed (busy)'
        when 'FAILED' then 'could not connect'
        when 'EXPIRED' then 'expired'
        else lower(c.state) end;
    end if;
    begin
      insert into public.messages (conversation_id, sender_id, body, call_id)
      values (c.conversation_id, c.initiator_id, marker, c.id)
      on conflict do nothing;
    exception when others then
      insert into public.call_events (call_id, source, event, detail)
      values (c.id, 'system', 'marker.skipped', jsonb_build_object('sqlstate', sqlstate));
    end;
  end if;

  -- The person who was called hears about a call they did not take.
  if callee is not null and c.state in ('MISSED', 'BUSY')
     or (callee is not null and c.state = 'CANCELLED' and c.ringing_at is not null) then
    perform private.notify(callee,
      case when c.purpose = 'ADMIN_REVIEW' then 'system'::public.notification_kind else 'message'::public.notification_kind end,
      'Missed ' || words,
      case when c.purpose = 'ADMIN_REVIEW' then 'The Vallo review team tried to call you.'
           else private.call_person_name(c.initiator_id) || ' tried to call you.' end,
      private.call_href(c.id, callee, false));
  end if;

  -- A review call that ended hands the review back for an outcome.
  if c.purpose = 'ADMIN_REVIEW' and c.review_id is not null then
    update public.call_reviews r
       set status = 'ACCEPTED', updated_at = now()
     where r.id = c.review_id and r.status = 'IN_CALL';
    insert into public.call_review_entries (review_id, author_id, kind, body)
    select c.review_id, null, 'ATTENDANCE',
           format('Call %s: %s. Subject joined: %s. Connected for %s s.',
                  left(c.id::text, 8), lower(c.state),
                  case when exists (select 1 from public.call_participants p
                                     where p.call_id = c.id and p.role = 'SUBJECT' and p.first_joined_at is not null)
                       then 'yes' else 'no' end,
                  coalesce(c.duration_seconds, 0));
  end if;
end;
$$;

create or replace function private.call_transition(
  p_call uuid,
  p_to text,
  p_actor uuid,
  p_source text,
  p_reason text default null,
  p_detail jsonb default '{}'::jsonb
)
returns public.calls
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.calls;
  v_from text;
  t timestamptz := now();
  v_end_from timestamptz;
begin
  select * into c from public.calls where id = p_call for update;
  if not found then
    raise exception 'call:not_found' using errcode = 'P0002';
  end if;
  v_from := c.state;
  if v_from = p_to then
    return c;
  end if;
  if not private.call_transition_allowed(v_from, p_to) then
    raise exception 'call:illegal_transition' using errcode = 'P0001', detail = v_from || ' -> ' || p_to;
  end if;

  -- A dropped connection is not counted as talk time past the moment it dropped.
  v_end_from := case when v_from = 'INTERRUPTED' then c.interrupted_at else t end;

  update public.calls
     set state = p_to,
         version = version + 1,
         updated_at = t,
         last_activity_at = t,
         ringing_at = case when p_to = 'RINGING' then t else ringing_at end,
         ring_expires_at = case when p_to = 'RINGING' then t + make_interval(secs => private.call_timeout_seconds('ring'))
                                else ring_expires_at end,
         accepted_at = case when p_to = 'ACCEPTED' then t else accepted_at end,
         connecting_at = case when p_to = 'CONNECTING' then t else connecting_at end,
         connected_at = case when p_to = 'ACTIVE' then coalesce(connected_at, t) else connected_at end,
         interrupted_at = case when p_to = 'INTERRUPTED' then t when p_to = 'ACTIVE' then null else interrupted_at end,
         reconnect_count = reconnect_count + case when v_from = 'INTERRUPTED' and p_to = 'ACTIVE' then 1 else 0 end,
         ended_at = case when private.call_state_is_terminal(p_to) then t else ended_at end,
         end_reason = case when private.call_state_is_terminal(p_to) then coalesce(p_reason, lower(p_to)) else end_reason end,
         duration_seconds = case
           when private.call_state_is_terminal(p_to) and connected_at is not null
             then greatest(0, floor(extract(epoch from (v_end_from - connected_at))))::integer
           when private.call_state_is_terminal(p_to) then 0
           else duration_seconds end
   where id = p_call
  returning * into c;

  insert into public.call_events (call_id, actor_id, source, event, from_state, to_state, detail)
  values (c.id, p_actor, p_source, 'state.' || lower(p_to), v_from, p_to,
          coalesce(p_detail, '{}'::jsonb) || case when p_reason is null then '{}'::jsonb
                                                  else jsonb_build_object('reason', p_reason) end);

  if private.call_state_is_terminal(p_to) then
    perform private.call_on_terminal(c.id);
    select * into c from public.calls where id = p_call;
  end if;
  return c;
end;
$$;

/* Apply whatever deadline has passed. Called by every read-modify function
   (lazily, so a call is never shown in a state its clock has left) and by the
   sweep (so nobody has to be online for a missed call to be recorded). */
create or replace function private.call_apply_timeouts(p_call uuid)
returns public.calls
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.calls;
  t timestamptz := now();
begin
  select * into c from public.calls where id = p_call for update;
  if not found or private.call_state_is_terminal(c.state) then
    return c;
  end if;
  if c.state = 'RINGING' and c.ring_expires_at <= t then
    return private.call_transition(c.id, 'MISSED', null, 'system', 'no_answer');
  elsif c.state = 'CREATED' and c.created_at <= t - make_interval(secs => private.call_timeout_seconds('setup')) then
    return private.call_transition(c.id, 'FAILED', null, 'system', 'setup_abandoned');
  elsif c.state = 'INVITATION_PENDING' and c.invitation_expires_at is not null and c.invitation_expires_at <= t then
    return private.call_transition(c.id, 'EXPIRED', null, 'system', 'invitation_expired');
  elsif c.state in ('ACCEPTED', 'CONNECTING')
        and coalesce(c.connecting_at, c.accepted_at) <= t - make_interval(secs => private.call_timeout_seconds('connect')) then
    return private.call_transition(c.id, 'FAILED', null, 'system', 'connect_timeout');
  elsif c.state = 'INTERRUPTED'
        and c.interrupted_at <= t - make_interval(secs => private.call_timeout_seconds('reconnect_grace')) then
    return private.call_transition(c.id, 'ENDED', null, 'system', 'connection_lost');
  elsif c.state = 'ACTIVE' and c.connected_at <= t - make_interval(secs => c.max_duration_seconds) then
    return private.call_transition(c.id, 'ENDED', null, 'system', 'max_duration');
  elsif c.state in ('ACTIVE', 'INTERRUPTED')
        and c.last_activity_at <= t - make_interval(secs => private.call_timeout_seconds('stale_activity')) then
    return private.call_transition(c.id, 'ENDED', null, 'system', 'stale');
  end if;
  return c;
end;
$$;

/* Is this person already in a live call? A ringing call past its clock is
   applied first, so a stale ring never makes somebody look busy. */
create or replace function private.call_user_busy(p_user uuid, p_except uuid default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  for r in
    select c.id from public.calls c
      join public.call_participants p on p.call_id = c.id
     where p.user_id = p_user
       and c.state in ('RINGING', 'ACCEPTED', 'CONNECTING', 'ACTIVE', 'INTERRUPTED')
       and c.id is distinct from p_except
  loop
    perform private.call_apply_timeouts(r.id);
  end loop;
  return exists (
    select 1 from public.calls c
      join public.call_participants p on p.call_id = c.id
     where p.user_id = p_user
       and c.state in ('RINGING', 'ACCEPTED', 'CONNECTING', 'ACTIVE', 'INTERRUPTED')
       and p.state not in ('DECLINED', 'LEFT', 'MISSED', 'REMOVED')
       and c.id is distinct from p_except);
end;
$$;

/* What a participant may see of a call. No provider identity, no token. */
create or replace function private.call_snapshot(p_call uuid, p_viewer uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', c.id,
    'kind', c.kind,
    'purpose', c.purpose,
    'state', c.state,
    'version', c.version,
    'conversation_id', c.conversation_id,
    'review_id', c.review_id,
    'role', me.role,
    'my_state', me.state,
    'is_initiator', c.initiator_id = p_viewer,
    'other_name', case when c.purpose = 'ADMIN_REVIEW' and me.role = 'SUBJECT' then 'Vallo review team'
                       else private.call_person_name(other.user_id) end,
    'other_state', other.state,
    'scheduled_for', c.scheduled_for,
    'created_at', c.created_at,
    'ringing_at', c.ringing_at,
    'ring_expires_at', c.ring_expires_at,
    'accepted_at', c.accepted_at,
    'connected_at', c.connected_at,
    'interrupted_at', c.interrupted_at,
    'ended_at', c.ended_at,
    'end_reason', c.end_reason,
    'duration_seconds', c.duration_seconds,
    'server_now', now())
  from public.calls c
  left join public.call_participants me on me.call_id = c.id and me.user_id = p_viewer
  left join lateral (
    select p.user_id, p.state from public.call_participants p
     where p.call_id = c.id and p.user_id <> p_viewer
     order by p.invited_at limit 1) other on true
  where c.id = p_call;
$$;

-- ---------------------------------------------------------------------------
-- 7. Member functions: start, accept, decline, cancel, end, join, heartbeat.
-- ---------------------------------------------------------------------------

create or replace function private.call_lock_people(p_a uuid, p_b uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Always in the same order, so two people calling each other cannot deadlock.
  perform pg_advisory_xact_lock(hashtextextended('vallo.call.user:' || least(p_a, p_b)::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('vallo.call.user:' || greatest(p_a, p_b)::text, 0));
end;
$$;

create or replace function private.call_ring(p_call uuid, p_actor uuid, p_source text)
returns public.calls
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.calls;
  callee uuid;
  v_href text;
  v_note uuid;
begin
  select p.user_id into callee from public.call_participants p
   where p.call_id = p_call and p.role in ('CALLEE', 'SUBJECT') limit 1;
  if private.call_user_busy(callee, p_call) then
    return private.call_transition(p_call, 'BUSY', p_actor, p_source, 'callee_busy');
  end if;
  c := private.call_transition(p_call, 'RINGING', p_actor, p_source);
  update public.call_participants set state = 'RINGING' where call_id = p_call and user_id = callee;

  v_href := private.call_href(c.id, callee, true);
  perform private.notify(callee,
    case when c.purpose = 'ADMIN_REVIEW' then 'system'::public.notification_kind else 'message'::public.notification_kind end,
    'Incoming ' || private.call_kind_words(c.kind),
    case when c.purpose = 'ADMIN_REVIEW' then 'The Vallo review team is calling you.'
         else private.call_person_name(c.initiator_id) || ' is calling you on Vallo.' end,
    v_href);
  -- A ringing push that arrives after the ringing stopped is worse than none.
  begin
    select n.id into v_note from public.notifications n
     where n.user_id = callee and n.href = v_href
     order by n.created_at desc limit 1;
    if v_note is not null then
      update public.push_queue q set expires_at = c.ring_expires_at
       where q.notification_id = v_note and q.state = 'pending';
    end if;
  exception when others then
    null;
  end;
  return c;
end;
$$;

create or replace function public.call_start(p_conversation uuid, p_kind text, p_client_key uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  conv record;
  callee uuid;
  c public.calls;
  existing uuid;
begin
  if me is null then
    raise exception 'call:signed_out' using errcode = '42501';
  end if;
  if not private.call_flag_on('video_calls') then
    raise exception 'call:disabled' using errcode = 'P0001';
  end if;
  if p_kind is null or p_kind not in ('AUDIO', 'VIDEO') then
    raise exception 'call:invalid_kind' using errcode = '22023';
  end if;

  -- A replayed tap answers with the call it already started.
  if p_client_key is not null then
    select id into existing from public.calls where initiator_id = me and client_key = p_client_key;
    if existing is not null then
      return private.call_snapshot(existing, me) || jsonb_build_object('replayed', true);
    end if;
  end if;

  select cv.id, cv.guest_id, cv.agent_id, cv.listing_id, cv.business_id into conv
    from public.conversations cv where cv.id = p_conversation;
  if conv.id is null or me not in (conv.guest_id, conv.agent_id) then
    raise exception 'call:not_found' using errcode = 'P0002';
  end if;
  callee := case when conv.guest_id = me then conv.agent_id else conv.guest_id end;
  if callee is null or callee = me then
    raise exception 'call:invalid_conversation' using errcode = '22023';
  end if;
  if private.blocked_between(me, callee) then
    raise exception 'call:blocked' using errcode = '42501';
  end if;
  if private.call_account_barred(me) then
    raise exception 'call:restricted' using errcode = '42501';
  end if;
  if private.call_account_barred(callee) then
    raise exception 'call:unavailable' using errcode = 'P0001';
  end if;

  perform private.call_lock_people(me, callee);

  -- Glare: they are ringing me in this thread right now. Hand that call back,
  -- so the screen offers to answer it instead of starting a second one.
  select c2.id into existing
    from public.calls c2
   where c2.conversation_id = conv.id and c2.initiator_id = callee
     and c2.state = 'RINGING' and c2.ring_expires_at > now()
   order by c2.created_at desc limit 1;
  if existing is not null then
    return private.call_snapshot(existing, me) || jsonb_build_object('glare', true);
  end if;

  -- No cold calls: the person being called has written in this thread.
  if not exists (select 1 from public.messages m
                  where m.conversation_id = conv.id and m.sender_id = callee and m.call_id is null) then
    raise exception 'call:not_engaged' using errcode = 'P0001';
  end if;

  if private.call_user_busy(me) then
    raise exception 'call:caller_busy' using errcode = 'P0001';
  end if;

  if not private.consume_rate_limit('call:start', me::text, 10, 600)
     or not private.consume_rate_limit('call:start:day', me::text, 60, 86400)
     or not private.consume_rate_limit('call:pair', me::text || '>' || callee::text, 4, 600) then
    raise exception 'call:rate_limited' using errcode = '54000';
  end if;

  insert into public.calls (kind, purpose, initiator_id, conversation_id, listing_id, business_id, client_key)
  values (p_kind, 'CONVERSATION', me, conv.id, conv.listing_id, conv.business_id, p_client_key)
  returning * into c;
  insert into public.call_participants (call_id, user_id, role, state, responded_at)
  values (c.id, me, 'CALLER', 'ACCEPTED', now()),
         (c.id, callee, 'CALLEE', 'INVITED', null);
  insert into public.call_events (call_id, actor_id, source, event, to_state, detail)
  values (c.id, me, 'member', 'call.created', 'CREATED', jsonb_build_object('kind', p_kind));

  c := private.call_ring(c.id, me, 'member');
  return private.call_snapshot(c.id, me);
end;
$$;

create or replace function private.call_participant_for(p_call uuid, p_user uuid)
returns public.call_participants
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.call_participants;
begin
  select * into p from public.call_participants where call_id = p_call and user_id = p_user;
  if not found then
    -- Not "forbidden": a call you are not on does not exist for you.
    raise exception 'call:not_found' using errcode = 'P0002';
  end if;
  return p;
end;
$$;

create or replace function private.call_require_flags(p_call uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.call_flag_on('video_calls') then
    raise exception 'call:disabled' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.calls c where c.id = p_call and c.purpose = 'ADMIN_REVIEW')
     and not private.call_flag_on('admin_review_calls') then
    raise exception 'call:disabled' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.call_accept(p_call uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  p public.call_participants;
  c public.calls;
  other uuid;
begin
  if me is null then raise exception 'call:signed_out' using errcode = '42501'; end if;
  p := private.call_participant_for(p_call, me);
  perform private.call_require_flags(p_call);
  if p.role not in ('CALLEE', 'SUBJECT') then
    raise exception 'call:not_yours_to_answer' using errcode = '42501';
  end if;
  c := private.call_apply_timeouts(p_call);
  -- A second tap, or a second device of the same person: the same answer.
  if c.state in ('ACCEPTED', 'CONNECTING', 'ACTIVE', 'INTERRUPTED') and p.state in ('ACCEPTED', 'JOINED', 'LEFT') then
    return private.call_snapshot(c.id, me);
  end if;
  if c.state <> 'RINGING' then
    raise exception 'call:no_longer_ringing' using errcode = 'P0001', detail = c.state;
  end if;
  select q.user_id into other from public.call_participants q where q.call_id = p_call and q.user_id <> me limit 1;
  if c.purpose = 'CONVERSATION' and private.blocked_between(me, other) then
    raise exception 'call:blocked' using errcode = '42501';
  end if;
  c := private.call_transition(p_call, 'ACCEPTED', me, 'member');
  update public.call_participants set state = 'ACCEPTED', responded_at = now()
   where call_id = p_call and user_id = me;
  if c.purpose = 'ADMIN_REVIEW' then
    insert into public.call_review_entries (review_id, kind, body)
    values (c.review_id, 'ATTENDANCE', 'The subject answered the review call.');
  end if;
  return private.call_snapshot(c.id, me);
end;
$$;

create or replace function public.call_decline(p_call uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  p public.call_participants;
  c public.calls;
begin
  if me is null then raise exception 'call:signed_out' using errcode = '42501'; end if;
  p := private.call_participant_for(p_call, me);
  if p.role not in ('CALLEE', 'SUBJECT') then
    raise exception 'call:not_yours_to_answer' using errcode = '42501';
  end if;
  c := private.call_apply_timeouts(p_call);
  if c.state = 'DECLINED' then
    return private.call_snapshot(c.id, me);
  end if;
  if c.state <> 'RINGING' then
    raise exception 'call:no_longer_ringing' using errcode = 'P0001', detail = c.state;
  end if;
  update public.call_participants set state = 'DECLINED', responded_at = now()
   where call_id = p_call and user_id = me;
  c := private.call_transition(p_call, 'DECLINED', me, 'member', 'declined');
  return private.call_snapshot(c.id, me);
end;
$$;

create or replace function public.call_cancel(p_call uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  p public.call_participants;
  c public.calls;
begin
  if me is null then raise exception 'call:signed_out' using errcode = '42501'; end if;
  p := private.call_participant_for(p_call, me);
  if p.role not in ('CALLER', 'REVIEWER') then
    raise exception 'call:not_yours_to_cancel' using errcode = '42501';
  end if;
  c := private.call_apply_timeouts(p_call);
  if c.state = 'CANCELLED' then
    return private.call_snapshot(c.id, me);
  end if;
  if c.state not in ('CREATED', 'INVITATION_PENDING', 'RINGING') then
    raise exception 'call:cannot_cancel' using errcode = 'P0001', detail = c.state;
  end if;
  c := private.call_transition(p_call, 'CANCELLED', me, case when p.role = 'REVIEWER' then 'staff' else 'member' end, 'cancelled');
  return private.call_snapshot(c.id, me);
end;
$$;

/* Hang up. The one button: a ringing call becomes cancelled (caller) or
   declined (callee); a live one ends. Ending twice answers the same. */
create or replace function public.call_end(p_call uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  p public.call_participants;
  c public.calls;
  src text;
begin
  if me is null then raise exception 'call:signed_out' using errcode = '42501'; end if;
  p := private.call_participant_for(p_call, me);
  src := case when p.role = 'REVIEWER' then 'staff' else 'member' end;
  c := private.call_apply_timeouts(p_call);
  if private.call_state_is_terminal(c.state) then
    return private.call_snapshot(c.id, me);
  end if;
  if c.state in ('CREATED', 'INVITATION_PENDING', 'RINGING') then
    if p.role in ('CALLER', 'REVIEWER') then
      c := private.call_transition(p_call, 'CANCELLED', me, src, 'cancelled');
    else
      update public.call_participants set state = 'DECLINED', responded_at = now()
       where call_id = p_call and user_id = me;
      c := private.call_transition(p_call, 'DECLINED', me, src, 'declined');
    end if;
  else
    c := private.call_transition(p_call, 'ENDED', me, src, 'hangup');
  end if;
  return private.call_snapshot(c.id, me);
end;
$$;

/* The gate in front of every join token. The token itself is minted by the
   server (lib/calls/token-service.ts) only after this answers, and is never
   stored. Returns the room and the opaque identity to put in it. */
create or replace function public.call_join_check(p_call uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  p public.call_participants;
  c public.calls;
  conv record;
  r public.call_reviews;
  other uuid;
begin
  if me is null then raise exception 'call:signed_out' using errcode = '42501'; end if;
  p := private.call_participant_for(p_call, me);
  perform private.call_require_flags(p_call);
  if p.state in ('DECLINED', 'REMOVED', 'MISSED') then
    raise exception 'call:not_joinable' using errcode = '42501', detail = p.state;
  end if;
  if private.call_account_barred(me) then
    raise exception 'call:restricted' using errcode = '42501';
  end if;
  c := private.call_apply_timeouts(p_call);

  if c.state in ('ACCEPTED', 'CONNECTING', 'ACTIVE', 'INTERRUPTED') then
    null;
  elsif c.state = 'RINGING' and p.role in ('CALLER', 'REVIEWER') then
    -- The caller waits in the room while it rings, so the answer connects fast.
    null;
  else
    raise exception 'call:not_joinable' using errcode = 'P0001', detail = c.state;
  end if;

  if c.purpose = 'CONVERSATION' then
    select cv.guest_id, cv.agent_id into conv from public.conversations cv where cv.id = c.conversation_id;
    if conv.guest_id is null or me not in (conv.guest_id, conv.agent_id) then
      raise exception 'call:not_found' using errcode = 'P0002';
    end if;
    other := case when conv.guest_id = me then conv.agent_id else conv.guest_id end;
    if private.blocked_between(me, other) then
      raise exception 'call:blocked' using errcode = '42501';
    end if;
  else
    select * into r from public.call_reviews where id = c.review_id;
    if r.id is null or r.status in ('COMPLETED', 'CANCELLED') then
      raise exception 'call:not_joinable' using errcode = 'P0001';
    end if;
    -- Staff rejoin on their scope and their console proof, checked now, not at scheduling.
    if p.role = 'REVIEWER' and not private.staff_can(me, r.required_scope) then
      raise exception 'call:forbidden' using errcode = '42501';
    end if;
    if p.role = 'SUBJECT' and r.subject_id is distinct from me then
      raise exception 'call:forbidden' using errcode = '42501';
    end if;
  end if;

  if not private.consume_rate_limit('call:token', me::text, 30, 300) then
    raise exception 'call:rate_limited' using errcode = '54000';
  end if;

  update public.call_participants
     set token_count = token_count + 1, last_token_at = now(), last_seen_at = now()
   where call_id = p_call and user_id = me;
  update public.calls set last_activity_at = now() where id = p_call;
  if c.state = 'ACCEPTED' and p.role in ('CALLEE', 'SUBJECT') then
    c := private.call_transition(p_call, 'CONNECTING', me, 'member');
  end if;
  insert into public.call_events (call_id, actor_id, source, event, detail)
  values (p_call, me, case when p.role = 'REVIEWER' then 'staff' else 'member' end, 'token.issued',
          jsonb_build_object('count', p.token_count + 1));

  return jsonb_build_object(
    'call_id', c.id,
    'state', c.state,
    'kind', c.kind,
    'role', p.role,
    'room', c.provider_room,
    'identity', p.provider_identity,
    'display_name', case when p.role = 'REVIEWER' then 'Vallo review team' else private.call_person_name(me) end,
    'can_publish_video', c.kind = 'VIDEO',
    'max_duration_seconds', c.max_duration_seconds);
end;
$$;

/* A participant's pulse while a call screen is open (about every 10 s). It
   keeps a call alive without provider webhooks, applies deadlines, and says
   when the server should look at the provider's own presence list. */
create or replace function public.call_heartbeat(p_call uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  p public.call_participants;
  c public.calls;
  due boolean := false;
begin
  if me is null then raise exception 'call:signed_out' using errcode = '42501'; end if;
  p := private.call_participant_for(p_call, me);
  update public.call_participants set last_seen_at = now() where call_id = p_call and user_id = me;
  c := private.call_apply_timeouts(p_call);
  if not private.call_state_is_terminal(c.state) then
    if c.state in ('ACCEPTED', 'CONNECTING', 'ACTIVE', 'INTERRUPTED')
       and (c.presence_checked_at is null or c.presence_checked_at < now() - interval '10 seconds') then
      update public.calls set presence_checked_at = now() where id = p_call;
      due := true;
    end if;
  end if;
  return private.call_snapshot(c.id, me) || jsonb_build_object('presence_check_due', due);
end;
$$;

/* One person's calls in one conversation, newest first: the history the thread draws. */
create or replace function public.call_history(p_conversation uuid, p_limit integer default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then raise exception 'call:signed_out' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(private.call_snapshot(x.id, me) order by x.created_at desc)
      from (select c.id, c.created_at from public.calls c
              join public.call_participants p on p.call_id = c.id and p.user_id = me
             where c.conversation_id = p_conversation
             order by c.created_at desc
             limit least(greatest(coalesce(p_limit, 50), 1), 200)) x), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Provider facts (service role only): webhooks and presence.
-- ---------------------------------------------------------------------------

create or replace function private.call_participant_joined(p_call uuid, p_identity text, p_at timestamptz, p_source text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.calls;
  p public.call_participants;
  joined integer;
begin
  select * into c from public.calls where id = p_call for update;
  select * into p from public.call_participants where call_id = p_call and provider_identity = p_identity for update;
  if p.call_id is null then
    return 'unknown_identity';
  end if;
  if private.call_state_is_terminal(c.state) then
    return 'call_closed';
  end if;
  -- Out of order: a join older than the leave we already have changes nothing.
  if p.left_at is not null and p_at < p.left_at then
    return 'stale';
  end if;
  if p.state = 'JOINED' then
    update public.calls set last_activity_at = now() where id = p_call;
    return 'already_joined';
  end if;
  update public.call_participants
     set state = 'JOINED', joined_at = p_at, first_joined_at = coalesce(first_joined_at, p_at),
         join_count = join_count + 1, last_seen_at = now()
   where call_id = p_call and user_id = p.user_id;
  update public.calls set last_activity_at = now() where id = p_call;
  insert into public.call_events (call_id, actor_id, source, event, detail)
  values (p_call, p.user_id, p_source, 'participant.joined', jsonb_build_object('role', p.role));

  select count(*) into joined from public.call_participants where call_id = p_call and state = 'JOINED';
  if joined >= 2 and c.state in ('ACCEPTED', 'CONNECTING', 'INTERRUPTED') then
    perform private.call_transition(p_call, 'ACTIVE', null, p_source);
  end if;
  return 'applied';
end;
$$;

create or replace function private.call_participant_left(p_call uuid, p_identity text, p_at timestamptz, p_source text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.calls;
  p public.call_participants;
  joined integer;
begin
  select * into c from public.calls where id = p_call for update;
  select * into p from public.call_participants where call_id = p_call and provider_identity = p_identity for update;
  if p.call_id is null then
    return 'unknown_identity';
  end if;
  if p.state <> 'JOINED' then
    return 'not_joined';
  end if;
  if p.joined_at is not null and p_at < p.joined_at then
    return 'stale';
  end if;
  update public.call_participants
     set state = 'LEFT', left_at = p_at,
         connected_seconds = connected_seconds
           + greatest(0, floor(extract(epoch from (p_at - coalesce(joined_at, p_at)))))::integer
   where call_id = p_call and user_id = p.user_id;
  insert into public.call_events (call_id, actor_id, source, event, detail)
  values (p_call, p.user_id, p_source, 'participant.left', jsonb_build_object('role', p.role));
  if private.call_state_is_terminal(c.state) then
    return 'applied';
  end if;
  update public.calls set last_activity_at = now() where id = p_call;
  select count(*) into joined from public.call_participants where call_id = p_call and state = 'JOINED';
  -- A disconnect is not an end while reconnection is possible.
  if c.state = 'ACTIVE' and joined < 2 then
    perform private.call_transition(p_call, 'INTERRUPTED', null, p_source, null,
                                    jsonb_build_object('left_role', p.role));
  end if;
  return 'applied';
end;
$$;

/* One webhook, once. Answers {duplicate: true} for a provider event id it has
   already seen, and never trusts the payload for anything but which room and
   which opaque identity: state is decided here. */
create or replace function public.call_provider_event(
  p_provider text,
  p_event_id text,
  p_event text,
  p_room text,
  p_identity text,
  p_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_call uuid;
  c public.calls;
  v_outcome text := 'ignored';
  inserted boolean;
begin
  insert into public.call_provider_events (provider, event_id, event, room, provider_created_at)
  values (p_provider, p_event_id, left(coalesce(p_event, 'unknown'), 60), left(p_room, 120), p_at)
  on conflict (provider, event_id) do nothing
  returning true into inserted;
  if inserted is null then
    return jsonb_build_object('duplicate', true);
  end if;

  select id into v_call from public.calls where provider_room = p_room;
  if v_call is null then
    update public.call_provider_events set outcome = 'unknown_room' where provider = p_provider and event_id = p_event_id;
    return jsonb_build_object('duplicate', false, 'outcome', 'unknown_room');
  end if;

  if p_event = 'participant_joined' then
    v_outcome := private.call_participant_joined(v_call, p_identity, coalesce(p_at, now()), 'provider');
  elsif p_event in ('participant_left', 'participant_connection_aborted') then
    v_outcome := private.call_participant_left(v_call, p_identity, coalesce(p_at, now()), 'provider');
  elsif p_event = 'room_finished' then
    select * into c from public.calls where id = v_call for update;
    if c.state in ('ACTIVE', 'INTERRUPTED') then
      perform private.call_transition(v_call, 'ENDED', null, 'provider', 'room_finished');
      v_outcome := 'applied';
    elsif c.state in ('ACCEPTED', 'CONNECTING') then
      perform private.call_transition(v_call, 'FAILED', null, 'provider', 'room_finished');
      v_outcome := 'applied';
    else
      v_outcome := 'no_change';
    end if;
    update public.calls set provider_closed_at = coalesce(provider_closed_at, now()) where id = v_call;
  elsif p_event = 'room_started' then
    update public.calls set last_activity_at = now() where id = v_call;
    v_outcome := 'applied';
  end if;

  update public.call_provider_events set call_id = v_call, outcome = left(v_outcome, 40)
   where provider = p_provider and event_id = p_event_id;
  select * into c from public.calls where id = v_call;
  return jsonb_build_object('duplicate', false, 'outcome', v_outcome, 'call_id', v_call, 'state', c.state,
                            'room_should_close', private.call_state_is_terminal(c.state));
end;
$$;

/* The provider's own list of who is in the room, read by the server (never
   reported by a client). Keeps calls honest when webhooks are late or off. */
create or replace function public.call_provider_presence(p_call uuid, p_identities text[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  p record;
  c public.calls;
  present text[] := coalesce(p_identities, '{}');
begin
  for p in select * from public.call_participants where call_id = p_call order by invited_at loop
    if p.provider_identity = any (present) and p.state <> 'JOINED' then
      perform private.call_participant_joined(p_call, p.provider_identity, now(), 'provider');
    elsif not (p.provider_identity = any (present)) and p.state = 'JOINED' then
      perform private.call_participant_left(p_call, p.provider_identity, now(), 'provider');
    end if;
  end loop;
  update public.calls set presence_checked_at = now() where id = p_call;
  select * into c from public.calls where id = p_call;
  return jsonb_build_object('call_id', p_call, 'state', c.state);
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Admin review calls.
-- ---------------------------------------------------------------------------

create or replace function private.call_review_scope(p_case_kind text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_case_kind
    -- REVIEW SCOPES BEGIN
    when 'agent_application' then 'kyc_review'
    when 'business_verification' then 'kyc_review'
    when 'identity_verification' then 'kyc_review'
    when 'listing' then 'listing_approval'
    when 'support_ticket' then 'support'
    -- REVIEW SCOPES END
  end;
$$;

create or replace function private.call_review_case_words(p_case_kind text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_case_kind
    when 'agent_application' then 'agent application'
    when 'business_verification' then 'business verification'
    when 'identity_verification' then 'identity check'
    when 'listing' then 'listing'
    when 'support_ticket' then 'support request'
  end;
$$;

/* Who the case is about, read from the case itself. Never from the caller. */
create or replace function private.call_review_subject(p_case_kind text, p_case_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select case p_case_kind
    when 'agent_application' then (select a.user_id from public.agent_applications a where a.id = p_case_id)
    when 'business_verification' then (select b.owner_id from public.businesses b where b.id = p_case_id)
    when 'identity_verification' then (select v.subject_id from public.identity_verifications v where v.id = p_case_id)
    when 'listing' then (select ag.user_id from public.listings l join public.agents ag on ag.id = l.agent_id where l.id = p_case_id)
    when 'support_ticket' then (select t.user_id from public.support_tickets t where t.id = p_case_id)
  end;
$$;

create or replace function private.call_review_for_staff(p_review uuid, p_me uuid)
returns public.call_reviews
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.call_reviews;
begin
  if p_me is null then raise exception 'call:signed_out' using errcode = '42501'; end if;
  if not private.call_flag_on('video_calls') or not private.call_flag_on('admin_review_calls') then
    raise exception 'call:disabled' using errcode = 'P0001';
  end if;
  select * into r from public.call_reviews where id = p_review for update;
  if not found or not private.staff_can(p_me, r.required_scope) then
    raise exception 'review:not_found' using errcode = 'P0002';
  end if;
  return r;
end;
$$;

create or replace function private.call_review_audit(p_actor uuid, p_action text, p_review uuid, p_meta jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (p_actor, p_action, 'call_review', p_review::text, coalesce(p_meta, '{}'::jsonb));
$$;

create or replace function private.call_review_when(p_at timestamptz)
returns text
language sql
immutable
set search_path = ''
as $$
  select to_char(p_at at time zone 'Africa/Lagos', 'FMDD Mon "at" HH24:MI') || ' (Lagos time)';
$$;

create or replace function public.call_review_request(
  p_case_kind text,
  p_case_id uuid,
  p_purpose text,
  p_kind text default 'VIDEO',
  p_scheduled_for timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  v_scope text := private.call_review_scope(p_case_kind);
  v_subject uuid;
  r public.call_reviews;
begin
  if me is null then raise exception 'call:signed_out' using errcode = '42501'; end if;
  if not private.call_flag_on('video_calls') or not private.call_flag_on('admin_review_calls') then
    raise exception 'call:disabled' using errcode = 'P0001';
  end if;
  if v_scope is null then
    raise exception 'review:invalid_case' using errcode = '22023';
  end if;
  if not private.staff_can(me, v_scope) then
    raise exception 'review:forbidden' using errcode = '42501';
  end if;
  if p_kind is null or p_kind not in ('AUDIO', 'VIDEO') then
    raise exception 'call:invalid_kind' using errcode = '22023';
  end if;
  if p_purpose is null or char_length(btrim(p_purpose)) not between 10 and 500 then
    raise exception 'review:purpose_required' using errcode = '22023';
  end if;
  if p_scheduled_for is not null
     and (p_scheduled_for < now() + interval '5 minutes' or p_scheduled_for > now() + interval '30 days') then
    raise exception 'review:bad_time' using errcode = '22023';
  end if;
  v_subject := private.call_review_subject(p_case_kind, p_case_id);
  if v_subject is null then
    raise exception 'review:case_not_found' using errcode = 'P0002';
  end if;
  if v_subject = me then
    raise exception 'review:own_case' using errcode = '42501';
  end if;
  if private.call_account_barred(v_subject) then
    raise exception 'call:unavailable' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.call_reviews x where x.case_kind = p_case_kind and x.case_id = p_case_id
                and x.status not in ('COMPLETED', 'CANCELLED')) then
    raise exception 'review:already_open' using errcode = '23505';
  end if;
  if not private.consume_rate_limit('call:review:request', me::text, 30, 3600) then
    raise exception 'call:rate_limited' using errcode = '54000';
  end if;

  insert into public.call_reviews (case_kind, case_id, subject_id, requested_by, required_scope, purpose, kind,
                                   status, scheduled_for, respond_by)
  values (p_case_kind, p_case_id, v_subject, me, v_scope, btrim(p_purpose), p_kind,
          case when p_scheduled_for is null then 'REQUESTED' else 'SCHEDULED' end,
          p_scheduled_for,
          coalesce(p_scheduled_for + make_interval(secs => private.call_timeout_seconds('review_join_late')),
                   now() + interval '72 hours'))
  returning * into r;

  perform private.call_review_audit(me, 'call_review.request', r.id,
    jsonb_build_object('case_kind', p_case_kind, 'case_id', p_case_id, 'scope', v_scope,
                       'purpose', r.purpose, 'scheduled_for', p_scheduled_for, 'kind', p_kind));

  perform private.notify(v_subject, 'system',
    case when p_scheduled_for is null then 'Vallo would like a short ' || private.call_kind_words(p_kind)
         else 'A ' || private.call_kind_words(p_kind) || ' with Vallo, ' || private.call_review_when(p_scheduled_for) end,
    'About your ' || private.call_review_case_words(p_case_kind)
      || '. Open Vallo to accept, decline or ask for another time.',
    '/calls/reviews/' || r.id::text);

  return to_jsonb(r);
end;
$$;

/* The subject answers the invitation: accept, decline, or propose another time. */
create or replace function public.call_review_respond(p_review uuid, p_response text, p_proposed_for timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  r public.call_reviews;
begin
  if me is null then raise exception 'call:signed_out' using errcode = '42501'; end if;
  if not private.call_flag_on('video_calls') or not private.call_flag_on('admin_review_calls') then
    raise exception 'call:disabled' using errcode = 'P0001';
  end if;
  select * into r from public.call_reviews where id = p_review for update;
  if not found or r.subject_id is distinct from me then
    raise exception 'review:not_found' using errcode = 'P0002';
  end if;
  if r.status not in ('REQUESTED', 'SCHEDULED', 'RESCHEDULE_REQUESTED', 'ACCEPTED') then
    raise exception 'review:closed' using errcode = 'P0001', detail = r.status;
  end if;
  if p_response = 'ACCEPT' then
    update public.call_reviews set status = case when status = 'RESCHEDULE_REQUESTED' and scheduled_for is not null
                                                  then 'SCHEDULED' else 'ACCEPTED' end,
                                   updated_at = now()
     where id = p_review returning * into r;
  elsif p_response = 'DECLINE' then
    update public.call_reviews set status = 'DECLINED', updated_at = now() where id = p_review returning * into r;
  elsif p_response = 'PROPOSE' then
    if p_proposed_for is null or p_proposed_for < now() + interval '30 minutes' or p_proposed_for > now() + interval '30 days' then
      raise exception 'review:bad_time' using errcode = '22023';
    end if;
    update public.call_reviews set status = 'RESCHEDULE_REQUESTED', proposed_for = p_proposed_for,
                                   respond_by = greatest(respond_by, p_proposed_for), updated_at = now()
     where id = p_review returning * into r;
  else
    raise exception 'review:invalid_response' using errcode = '22023';
  end if;
  perform private.call_review_audit(me, 'call_review.respond', r.id,
    jsonb_build_object('response', p_response, 'proposed_for', p_proposed_for));
  if r.requested_by is not null then
    perform private.notify(r.requested_by, 'system',
      case p_response when 'ACCEPT' then 'A review call was accepted'
                      when 'DECLINE' then 'A review call was declined'
                      else 'Another time was asked for a review call' end,
      'About a ' || private.call_review_case_words(r.case_kind) || '.',
      '/admin/review-calls/' || r.id::text);
  end if;
  return private.call_review_for_subject(r.id);
end;
$$;

create or replace function public.call_review_reschedule(p_review uuid, p_scheduled_for timestamptz, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  r public.call_reviews;
begin
  r := private.call_review_for_staff(p_review, me);
  if r.status in ('COMPLETED', 'CANCELLED', 'IN_CALL') then
    raise exception 'review:closed' using errcode = 'P0001', detail = r.status;
  end if;
  if p_scheduled_for is null or p_scheduled_for < now() + interval '5 minutes' or p_scheduled_for > now() + interval '30 days' then
    raise exception 'review:bad_time' using errcode = '22023';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) not between 3 and 500 then
    raise exception 'review:reason_required' using errcode = '22023';
  end if;
  update public.call_reviews
     set status = 'SCHEDULED', scheduled_for = p_scheduled_for, proposed_for = null,
         respond_by = p_scheduled_for + make_interval(secs => private.call_timeout_seconds('review_join_late')),
         updated_at = now()
   where id = p_review returning * into r;
  perform private.call_review_audit(me, 'call_review.reschedule', r.id,
    jsonb_build_object('scheduled_for', p_scheduled_for, 'reason', btrim(p_reason)));
  perform private.notify(r.subject_id, 'system',
    'Your ' || private.call_kind_words(r.kind) || ' with Vallo moved to ' || private.call_review_when(p_scheduled_for),
    'About your ' || private.call_review_case_words(r.case_kind) || '. Open Vallo to accept or ask for another time.',
    '/calls/reviews/' || r.id::text);
  return to_jsonb(r);
end;
$$;

create or replace function public.call_review_start(p_review uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  r public.call_reviews;
  c public.calls;
begin
  r := private.call_review_for_staff(p_review, me);
  if r.status = 'SCHEDULED' then
    if now() < r.scheduled_for - make_interval(secs => private.call_timeout_seconds('review_join_early'))
       or now() > r.scheduled_for + make_interval(secs => private.call_timeout_seconds('review_join_late')) then
      raise exception 'review:outside_window' using errcode = 'P0001';
    end if;
  elsif r.status <> 'ACCEPTED' then
    -- An unanswered request is not consent to be rung.
    raise exception 'review:not_accepted' using errcode = 'P0001', detail = r.status;
  end if;
  if r.subject_id is null or private.call_account_barred(r.subject_id) then
    raise exception 'call:unavailable' using errcode = 'P0001';
  end if;
  perform private.call_lock_people(me, r.subject_id);
  if private.call_user_busy(me) then
    raise exception 'call:caller_busy' using errcode = 'P0001';
  end if;
  if not private.consume_rate_limit('call:review:start', me::text, 20, 600) then
    raise exception 'call:rate_limited' using errcode = '54000';
  end if;

  insert into public.calls (kind, purpose, initiator_id, review_id, scheduled_for, max_duration_seconds)
  values (r.kind, 'ADMIN_REVIEW', me, r.id, r.scheduled_for, 3600)
  returning * into c;
  insert into public.call_participants (call_id, user_id, role, state, responded_at)
  values (c.id, me, 'REVIEWER', 'ACCEPTED', now()),
         (c.id, r.subject_id, 'SUBJECT', 'INVITED', null);
  insert into public.call_events (call_id, actor_id, source, event, to_state, detail)
  values (c.id, me, 'staff', 'call.created', 'CREATED', jsonb_build_object('kind', r.kind, 'review', r.id));
  update public.call_reviews set status = 'IN_CALL', updated_at = now() where id = r.id;
  c := private.call_ring(c.id, me, 'staff');
  perform private.call_review_audit(me, 'call_review.start', r.id, jsonb_build_object('call_id', c.id, 'state', c.state));
  return private.call_snapshot(c.id, me);
end;
$$;

create or replace function public.call_review_add_entry(
  p_review uuid,
  p_kind text,
  p_body text,
  p_evidence_ref text default null,
  p_corrects uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  r public.call_reviews;
  e public.call_review_entries;
begin
  r := private.call_review_for_staff(p_review, me);
  if p_kind not in ('NOTE', 'EVIDENCE', 'CORRECTION') then
    raise exception 'review:invalid_entry' using errcode = '22023';
  end if;
  if p_corrects is not null and not exists (select 1 from public.call_review_entries x
                                              where x.id = p_corrects and x.review_id = p_review) then
    raise exception 'review:invalid_entry' using errcode = '22023';
  end if;
  insert into public.call_review_entries (review_id, author_id, kind, body, evidence_ref, corrects_id)
  values (p_review, me, p_kind, btrim(p_body), p_evidence_ref, p_corrects)
  returning * into e;
  perform private.call_review_audit(me, 'call_review.entry', r.id,
    jsonb_build_object('entry_id', e.id, 'kind', p_kind, 'evidence_ref', p_evidence_ref, 'corrects', p_corrects));
  return to_jsonb(e);
end;
$$;

create or replace function public.call_review_complete(
  p_review uuid,
  p_outcome text,
  p_summary text,
  p_follow_up_due_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  r public.call_reviews;
  live uuid;
begin
  r := private.call_review_for_staff(p_review, me);
  if r.status in ('COMPLETED', 'CANCELLED') then
    raise exception 'review:closed' using errcode = 'P0001', detail = r.status;
  end if;
  if p_outcome is null or p_outcome not in ('REVIEW_COMPLETED', 'MORE_INFORMATION_REQUIRED', 'FOLLOW_UP_REQUIRED',
                                            'ESCALATED', 'NO_SHOW') then
    raise exception 'review:invalid_outcome' using errcode = '22023';
  end if;
  if p_summary is null or char_length(btrim(p_summary)) not between 3 and 4000 then
    raise exception 'review:summary_required' using errcode = '22023';
  end if;
  if p_outcome = 'FOLLOW_UP_REQUIRED' and (p_follow_up_due_at is null or p_follow_up_due_at < now()) then
    raise exception 'review:follow_up_date_required' using errcode = '22023';
  end if;
  -- A live call ends with the review.
  for live in select c.id from public.calls c
               where c.review_id = r.id and not private.call_state_is_terminal(c.state) loop
    if (select state from public.calls where id = live) in ('CREATED', 'INVITATION_PENDING', 'RINGING') then
      perform private.call_transition(live, 'CANCELLED', me, 'staff', 'review_completed');
    else
      perform private.call_transition(live, 'ENDED', me, 'staff', 'review_completed');
    end if;
  end loop;
  insert into public.call_review_entries (review_id, author_id, kind, body, outcome)
  values (r.id, me, 'OUTCOME', btrim(p_summary), p_outcome);
  update public.call_reviews
     set status = 'COMPLETED', outcome = p_outcome, outcome_at = now(), outcome_by = me,
         follow_up_due_at = case when p_outcome = 'FOLLOW_UP_REQUIRED' then p_follow_up_due_at else null end,
         updated_at = now()
   where id = r.id returning * into r;
  perform private.call_review_audit(me, 'call_review.complete', r.id,
    jsonb_build_object('outcome', p_outcome, 'follow_up_due_at', r.follow_up_due_at));
  if p_outcome in ('REVIEW_COMPLETED', 'MORE_INFORMATION_REQUIRED', 'FOLLOW_UP_REQUIRED') then
    perform private.notify(r.subject_id, 'system',
      'Thank you for the call with Vallo',
      case p_outcome when 'MORE_INFORMATION_REQUIRED'
                     then 'Vallo needs a little more information about your ' || private.call_review_case_words(r.case_kind) || '.'
                     else 'Vallo will be in touch about your ' || private.call_review_case_words(r.case_kind) || ' if anything else is needed.' end,
      '/calls/reviews/' || r.id::text);
  end if;
  return to_jsonb(r);
end;
$$;

create or replace function public.call_review_cancel(p_review uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  r public.call_reviews;
  live uuid;
begin
  r := private.call_review_for_staff(p_review, me);
  if r.status in ('COMPLETED', 'CANCELLED') then
    raise exception 'review:closed' using errcode = 'P0001', detail = r.status;
  end if;
  if p_reason is null or char_length(btrim(p_reason)) not between 3 and 500 then
    raise exception 'review:reason_required' using errcode = '22023';
  end if;
  for live in select c.id from public.calls c
               where c.review_id = r.id and not private.call_state_is_terminal(c.state) loop
    if (select state from public.calls where id = live) in ('CREATED', 'INVITATION_PENDING', 'RINGING') then
      perform private.call_transition(live, 'CANCELLED', me, 'staff', 'review_cancelled');
    else
      perform private.call_transition(live, 'ENDED', me, 'staff', 'review_cancelled');
    end if;
  end loop;
  update public.call_reviews
     set status = 'CANCELLED', outcome = 'CANCELLED', outcome_at = now(), outcome_by = me, updated_at = now()
   where id = r.id returning * into r;
  insert into public.call_review_entries (review_id, author_id, kind, body, outcome)
  values (r.id, me, 'OUTCOME', btrim(p_reason), 'CANCELLED');
  perform private.call_review_audit(me, 'call_review.cancel', r.id, jsonb_build_object('reason', btrim(p_reason)));
  perform private.notify(r.subject_id, 'system', 'Your ' || private.call_kind_words(r.kind) || ' with Vallo is cancelled',
    'Nothing is needed from you for this call.', '/calls/reviews/' || r.id::text);
  return to_jsonb(r);
end;
$$;

/* What the person being reviewed may see: never notes, evidence, outcome
   reasoning, the staff member's identity or the scope. */
create or replace function private.call_review_for_subject(p_review uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', r.id,
    'kind', r.kind,
    'case_kind', r.case_kind,
    'case_words', private.call_review_case_words(r.case_kind),
    'purpose', r.purpose,
    'status', r.status,
    'scheduled_for', r.scheduled_for,
    'proposed_for', r.proposed_for,
    'respond_by', r.respond_by,
    'created_at', r.created_at,
    'requester_label', 'Vallo review team',
    'live_call_id', (select c.id from public.calls c
                      where c.review_id = r.id and not private.call_state_is_terminal(c.state)
                      order by c.created_at desc limit 1))
  from public.call_reviews r where r.id = p_review;
$$;

create or replace function public.my_call_reviews()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(private.call_review_for_subject(r.id) order by r.created_at desc), '[]'::jsonb)
    from public.call_reviews r
   where r.subject_id = (select auth.uid())
     and r.created_at > now() - interval '180 days';
$$;

-- ---------------------------------------------------------------------------
-- 10. Sweeps, room cleanup and usage.
-- ---------------------------------------------------------------------------

create or replace function private.calls_sweep()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  c public.calls;
  closed integer := 0;
  looked integer := 0;
  reviews_expired integer := 0;
begin
  for r in
    select x.id from public.calls x
     where x.state in ('CREATED', 'INVITATION_PENDING', 'RINGING', 'ACCEPTED', 'CONNECTING', 'ACTIVE', 'INTERRUPTED')
     order by x.updated_at
     limit 500
     for update skip locked
  loop
    looked := looked + 1;
    c := private.call_apply_timeouts(r.id);
    if private.call_state_is_terminal(c.state) then
      closed := closed + 1;
    end if;
  end loop;

  with expired as (
    update public.call_reviews
       set status = 'EXPIRED', updated_at = now()
     where status in ('REQUESTED', 'SCHEDULED', 'RESCHEDULE_REQUESTED', 'ACCEPTED')
       and respond_by < now()
    returning id)
  select count(*) into reviews_expired from expired;

  return jsonb_build_object('looked', looked, 'closed', closed, 'reviews_expired', reviews_expired);
end;
$$;

create or replace function public.calls_sweep_service()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select private.calls_sweep();
$$;

create or replace function public.calls_rooms_to_close(p_limit integer default 100)
returns table (call_id uuid, provider text, provider_room text)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.provider, c.provider_room
    from public.calls c
   where c.provider_closed_at is null and c.ended_at is not null
     and c.ended_at > now() - interval '2 days'
     and exists (select 1 from public.call_participants p where p.call_id = c.id and p.token_count > 0)
   order by c.ended_at
   limit least(greatest(coalesce(p_limit, 100), 1), 500);
$$;

create or replace function public.calls_mark_rooms_closed(p_calls uuid[])
returns integer
language sql
security definer
set search_path = ''
as $$
  with done as (
    update public.calls set provider_closed_at = now()
     where id = any (coalesce(p_calls, '{}')) and provider_closed_at is null
    returning 1)
  select count(*)::integer from done;
$$;

/* Operations numbers. Estimated participant minutes come from our own join
   and leave facts; the provider's reconciled figure is a separate column and
   is never mixed into the estimate. */
create or replace function public.call_usage_summary(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null or not private.staff_can(me, 'operations') then
    raise exception 'call:forbidden' using errcode = '42501';
  end if;
  return (
    select jsonb_build_object(
      'from', p_from, 'to', p_to,
      'total', count(*),
      'by_state', coalesce((select jsonb_object_agg(s.state, s.n) from (
          select c2.state, count(*) n from public.calls c2
           where c2.created_at >= p_from and c2.created_at < p_to group by c2.state) s), '{}'::jsonb),
      'audio', count(*) filter (where c.kind = 'AUDIO'),
      'video', count(*) filter (where c.kind = 'VIDEO'),
      'review_calls', count(*) filter (where c.purpose = 'ADMIN_REVIEW'),
      'connected', count(*) filter (where c.connected_at is not null),
      'accepted', count(*) filter (where c.accepted_at is not null),
      'estimated_participant_minutes', round(coalesce(sum(c.participant_seconds), 0) / 60.0, 1),
      'reconciled_participant_minutes', round(sum(c.reconciled_participant_seconds) / 60.0, 1),
      'average_duration_seconds', round(avg(c.duration_seconds) filter (where c.connected_at is not null)),
      'average_setup_seconds', round(avg(extract(epoch from (c.connected_at - c.accepted_at)))
                                       filter (where c.connected_at is not null and c.accepted_at is not null)),
      'calls_with_reconnects', count(*) filter (where c.reconnect_count > 0))
    from public.calls c
    where c.created_at >= p_from and c.created_at < p_to);
end;
$$;

-- ---------------------------------------------------------------------------
-- 11. The message trigger learns about call markers.
--     The live definition (read 8 October 2026) plus one early branch: a call
--     marker moves the thread to the top but writes no "New message"
--     notification, because the call functions write their own.
-- ---------------------------------------------------------------------------

create or replace function private.notify_message()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  recipient uuid;
  recipient_is_agent_side boolean;
begin
  if new.call_id is not null then
    update public.conversations
    set last_message_at = new.created_at
    where id = new.conversation_id;
    return new;
  end if;

  select case when c.guest_id = new.sender_id then c.agent_id else c.guest_id end,
         (c.guest_id = new.sender_id)
  into recipient, recipient_is_agent_side
  from public.conversations c
  where c.id = new.conversation_id;

  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;

  perform private.notify(recipient, 'message', 'New message',
    left(new.body, 120),
    case when coalesce(recipient_is_agent_side, false)
         then '/agent/messages/' || new.conversation_id
         else '/messages/' || new.conversation_id end);

  return new;
end;
$function$;

-- ---------------------------------------------------------------------------
-- 12. Function grants. Private helpers: nobody but their owner.
-- ---------------------------------------------------------------------------

revoke all on function private.call_flag_on(text) from public, anon, authenticated;
revoke all on function private.call_history_is_append_only() from public, anon, authenticated;
revoke all on function private.call_transition_allowed(text, text) from public, anon, authenticated;
revoke all on function private.call_state_is_terminal(text) from public, anon, authenticated;
revoke all on function private.call_timeout_seconds(text) from public, anon, authenticated;
revoke all on function private.call_kind_words(text) from public, anon, authenticated;
revoke all on function private.call_person_name(uuid) from public, anon, authenticated;
revoke all on function private.call_href(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function private.call_account_barred(uuid) from public, anon, authenticated;
revoke all on function private.call_on_terminal(uuid) from public, anon, authenticated;
revoke all on function private.call_transition(uuid, text, uuid, text, text, jsonb) from public, anon, authenticated;
revoke all on function private.call_apply_timeouts(uuid) from public, anon, authenticated;
revoke all on function private.call_user_busy(uuid, uuid) from public, anon, authenticated;
revoke all on function private.call_snapshot(uuid, uuid) from public, anon, authenticated;
revoke all on function private.call_lock_people(uuid, uuid) from public, anon, authenticated;
revoke all on function private.call_ring(uuid, uuid, text) from public, anon, authenticated;
revoke all on function private.call_participant_for(uuid, uuid) from public, anon, authenticated;
revoke all on function private.call_require_flags(uuid) from public, anon, authenticated;
revoke all on function private.call_participant_joined(uuid, text, timestamptz, text) from public, anon, authenticated;
revoke all on function private.call_participant_left(uuid, text, timestamptz, text) from public, anon, authenticated;
revoke all on function private.call_review_scope(text) from public, anon, authenticated;
revoke all on function private.call_review_case_words(text) from public, anon, authenticated;
revoke all on function private.call_review_subject(text, uuid) from public, anon, authenticated;
revoke all on function private.call_review_for_staff(uuid, uuid) from public, anon, authenticated;
revoke all on function private.call_review_audit(uuid, text, uuid, jsonb) from public, anon, authenticated;
revoke all on function private.call_review_when(timestamptz) from public, anon, authenticated;
revoke all on function private.call_review_for_subject(uuid) from public, anon, authenticated;
revoke all on function private.calls_sweep() from public, anon, authenticated;

-- RLS helpers are read by policies as the querying role, so authenticated keeps EXECUTE.
revoke all on function private.call_is_participant(uuid) from public, anon;
grant execute on function private.call_is_participant(uuid) to authenticated;
revoke all on function private.call_review_staff_can(uuid) from public, anon;
grant execute on function private.call_review_staff_can(uuid) to authenticated;

-- Member and staff entry points: signed-in people only. Each checks its own caller.
revoke all on function public.call_start(uuid, text, uuid) from public, anon;
revoke all on function public.call_accept(uuid) from public, anon;
revoke all on function public.call_decline(uuid) from public, anon;
revoke all on function public.call_cancel(uuid) from public, anon;
revoke all on function public.call_end(uuid) from public, anon;
revoke all on function public.call_join_check(uuid) from public, anon;
revoke all on function public.call_heartbeat(uuid) from public, anon;
revoke all on function public.call_history(uuid, integer) from public, anon;
revoke all on function public.call_review_request(text, uuid, text, text, timestamptz) from public, anon;
revoke all on function public.call_review_respond(uuid, text, timestamptz) from public, anon;
revoke all on function public.call_review_reschedule(uuid, timestamptz, text) from public, anon;
revoke all on function public.call_review_start(uuid) from public, anon;
revoke all on function public.call_review_add_entry(uuid, text, text, text, uuid) from public, anon;
revoke all on function public.call_review_complete(uuid, text, text, timestamptz) from public, anon;
revoke all on function public.call_review_cancel(uuid, text) from public, anon;
revoke all on function public.my_call_reviews() from public, anon;
revoke all on function public.call_usage_summary(timestamptz, timestamptz) from public, anon;
grant execute on function public.call_start(uuid, text, uuid) to authenticated;
grant execute on function public.call_accept(uuid) to authenticated;
grant execute on function public.call_decline(uuid) to authenticated;
grant execute on function public.call_cancel(uuid) to authenticated;
grant execute on function public.call_end(uuid) to authenticated;
grant execute on function public.call_join_check(uuid) to authenticated;
grant execute on function public.call_heartbeat(uuid) to authenticated;
grant execute on function public.call_history(uuid, integer) to authenticated;
grant execute on function public.call_review_request(text, uuid, text, text, timestamptz) to authenticated;
grant execute on function public.call_review_respond(uuid, text, timestamptz) to authenticated;
grant execute on function public.call_review_reschedule(uuid, timestamptz, text) to authenticated;
grant execute on function public.call_review_start(uuid) to authenticated;
grant execute on function public.call_review_add_entry(uuid, text, text, text, uuid) to authenticated;
grant execute on function public.call_review_complete(uuid, text, text, timestamptz) to authenticated;
grant execute on function public.call_review_cancel(uuid, text) to authenticated;
grant execute on function public.my_call_reviews() to authenticated;
grant execute on function public.call_usage_summary(timestamptz, timestamptz) to authenticated;

-- The provider's facts and the sweeps: the server's service role only.
revoke all on function public.call_provider_event(text, text, text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.call_provider_presence(uuid, text[]) from public, anon, authenticated;
revoke all on function public.calls_sweep_service() from public, anon, authenticated;
revoke all on function public.calls_rooms_to_close(integer) from public, anon, authenticated;
revoke all on function public.calls_mark_rooms_closed(uuid[]) from public, anon, authenticated;
grant execute on function public.call_provider_event(text, text, text, text, text, timestamptz) to service_role;
grant execute on function public.call_provider_presence(uuid, text[]) to service_role;
grant execute on function public.calls_sweep_service() to service_role;
grant execute on function public.calls_rooms_to_close(integer) to service_role;
grant execute on function public.calls_mark_rooms_closed(uuid[]) to service_role;

-- ---------------------------------------------------------------------------
-- 13. Realtime (both sides see a state change at once) and the sweep schedule.
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables
                    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'calls') then
      alter publication supabase_realtime add table public.calls;
    end if;
    if not exists (select 1 from pg_publication_tables
                    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'call_participants') then
      alter publication supabase_realtime add table public.call_participants;
    end if;
  end if;
end;
$$;

-- Every minute, like vallo_hold_claims_sweep. Ringing calls are also closed
-- lazily by every heartbeat, so the 45 seconds hold without waiting for this.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('vallo_calls_sweep', '* * * * *', 'select private.calls_sweep();');
  end if;
end;
$$;
