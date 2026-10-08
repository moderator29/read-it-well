-- Local stand-ins for the live objects VC1 depends on. Shapes and the bodies of
-- notify, has_role, staff_can, console_step_up_ok, blocked_between,
-- consume_rate_limit and notify_message are copied from the live database
-- (read 8 October 2026); everything else is the minimum to hold the probe.
-- One deliberate difference: the stand-in consume_rate_limit carries
-- `#variable_conflict use_column`, which PGlite needs and the live body does not.
-- Used by scripts/calls/pglite-probe.mjs and scripts/calls/livekit-e2e.mjs only.
-- It is NOT the live schema and proves nothing about the live database by itself.
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth; create schema private;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
grant usage on schema private to anon, authenticated, service_role;

create table auth.users (id uuid primary key, banned_until timestamptz, deleted_at timestamptz);
insert into auth.users (id) values ('957b3bd2-cce3-425d-bba9-5cd876ca3d62'), ('03f3dd52-ea28-4852-9abe-e5b0a67c2a43'),
  ('11111111-1111-4111-8111-111111111111');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claims', true)::json->>'sub','')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant execute on function auth.jwt() to anon, authenticated, service_role;

create type public.app_role as enum ('user', 'agent', 'admin', 'super_admin');
create type public.notification_kind as enum ('booking','message','wallet','listing','agent','support','system','social');
create type public.thread_context as enum ('listing','reservation','booking','business');

create table public.user_roles (user_id uuid not null references auth.users(id), role public.app_role not null, granted_at timestamptz not null default now(), primary key (user_id, role));
insert into public.user_roles values ('03f3dd52-ea28-4852-9abe-e5b0a67c2a43', 'admin');
create table public.console_step_ups (user_id uuid not null, session_id uuid not null, verified_at timestamptz not null default now(), expires_at timestamptz not null, primary key (user_id, session_id));
create table public.staff_grants (user_id uuid primary key, scopes text[] not null, granted_by uuid not null, granted_at timestamptz not null default now(), revoked_at timestamptz, position text);
create table public.staff_handbook_acks (user_id uuid not null, version text not null, acknowledged_at timestamptz not null default now());
create function private.staff_handbook_version() returns text language sql immutable as $$ select 'v1' $$;

create or replace function private.console_step_up_ok() returns boolean language sql stable security definer set search_path to '' as $function$
  select exists (select 1 from public.console_step_ups s where s.user_id = (select auth.uid())
       and s.session_id = nullif((select auth.jwt()) ->> 'session_id', '')::uuid and s.expires_at > now());
$function$;
create or replace function private.has_role(check_user_id uuid, check_role public.app_role) returns boolean language sql stable security definer set search_path to 'public' as $function$
  select exists (select 1 from public.user_roles where user_id = check_user_id and role = check_role)
  and (check_role not in ('admin'::public.app_role, 'super_admin'::public.app_role)
       or check_user_id is distinct from (select auth.uid()) or private.console_step_up_ok());
$function$;
grant execute on function private.has_role(uuid, public.app_role) to anon, authenticated;
create or replace function private.staff_can(p_user uuid, p_scope text) returns boolean language sql stable security definer set search_path to '' as $function$
  select p_user is not null
     and (p_user is distinct from (select auth.uid()) or private.console_step_up_ok())
     and (exists (select 1 from public.user_roles r where r.user_id = p_user and r.role in ('admin'::public.app_role, 'super_admin'::public.app_role))
          or exists (select 1 from public.staff_grants g where g.user_id = p_user and g.revoked_at is null and p_scope = any (g.scopes::text[])
               and exists (select 1 from public.staff_handbook_acks a where a.user_id = p_user and a.version = private.staff_handbook_version())));
$function$;
revoke all on function private.staff_can(uuid, text) from public, anon, authenticated;
revoke all on function private.console_step_up_ok() from public, anon, authenticated;

create table public.feature_flags (key text primary key, enabled boolean not null default false, note text, updated_at timestamptz default now());
alter table public.feature_flags enable row level security;
create policy feature_flags_select_all on public.feature_flags for select using (true);
grant select on public.feature_flags to anon, authenticated;

create table public.profiles (id uuid primary key references auth.users(id), display_name text, first_name text, settings jsonb default '{}');
insert into public.profiles (id, display_name) values ('957b3bd2-cce3-425d-bba9-5cd876ca3d62', 'Ada Member'), ('03f3dd52-ea28-4852-9abe-e5b0a67c2a43', 'Bayo Host');

create table public.blocks (user_id uuid not null, other_id uuid not null, created_at timestamptz default now(), primary key (user_id, other_id));
create or replace function private.blocked_between(person_a uuid, person_b uuid) returns boolean language sql stable security definer set search_path to 'public' as $function$
  select exists (select 1 from public.blocks b where (b.user_id = person_a and b.other_id = person_b) or (b.user_id = person_b and b.other_id = person_a));
$function$;
grant execute on function private.blocked_between(uuid, uuid) to anon, authenticated;

create table public.rate_limits (bucket text, subject text, window_start timestamptz, count int, primary key (bucket, subject, window_start));
create function private.consume_rate_limit(bucket text, subject text, limit_count int, window_seconds int) returns boolean language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare current_window timestamptz; allowed boolean;
begin
  current_window := to_timestamp((floor(extract(epoch from now()) / consume_rate_limit.window_seconds) * consume_rate_limit.window_seconds)::double precision);
  insert into public.rate_limits as r (bucket, subject, window_start, count) values (consume_rate_limit.bucket, consume_rate_limit.subject, current_window, 1)
  on conflict (bucket, subject, window_start) do update set count = r.count + 1 where r.count < consume_rate_limit.limit_count returning true into allowed;
  return coalesce(allowed, false);
end; $$;
revoke all on function private.consume_rate_limit(text, text, int, int) from public, anon, authenticated;

create table public.agents (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id), status text);
create table public.agent_suspensions (id uuid primary key default gen_random_uuid(), agent_id uuid references public.agents(id), reason text, lifted_at timestamptz);
create table public.listings (id uuid primary key default gen_random_uuid(), agent_id uuid references public.agents(id), title text);
create table public.businesses (id uuid primary key default gen_random_uuid(), owner_id uuid references auth.users(id), name text);
create table public.agent_applications (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id));
create table public.identity_verifications (id uuid primary key default gen_random_uuid(), subject_id uuid not null references auth.users(id), method text not null check (method in ('vnin','photo')), outcome text not null check (outcome in ('matched','mismatch')), decided_at timestamptz not null default now());
create table public.support_tickets (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id));

create table public.conversations (id uuid primary key default gen_random_uuid(), guest_id uuid not null references auth.users(id), agent_id uuid not null references auth.users(id),
  listing_id uuid references public.listings(id), business_id uuid references public.businesses(id), context_kind public.thread_context not null default 'listing',
  last_message_at timestamptz not null default now(), created_at timestamptz not null default now());
create table public.messages (id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id), body text not null, read_at timestamptz, created_at timestamptz not null default now());
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
grant select, insert, update, delete on public.conversations, public.messages to anon, authenticated;
create function private.in_conversation(target_conversation_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.conversations c where c.id = target_conversation_id and (c.guest_id = auth.uid() or c.agent_id = auth.uid()));
$$;
grant execute on function private.in_conversation(uuid) to anon, authenticated;
create policy conversations_select on public.conversations for select using ((select auth.uid()) = guest_id or (select auth.uid()) = agent_id);
create policy messages_select on public.messages for select using (private.in_conversation(conversation_id));
create policy messages_insert on public.messages for insert with check ((select auth.uid()) = sender_id and private.in_conversation(conversation_id));

create table public.notifications (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), kind public.notification_kind not null,
  title text not null, body text, href text, read_at timestamptz, created_at timestamptz not null default now());
create table public.push_tokens (id uuid primary key default gen_random_uuid(), user_id uuid, revoked_at timestamptz);
create table public.push_queue (id uuid primary key default gen_random_uuid(), notification_id uuid not null unique references public.notifications(id) on delete cascade,
  user_id uuid not null, state text not null default 'pending', expires_at timestamptz not null default (now() + interval '12 hours'));
create or replace function private.push_enqueue() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.push_tokens t where t.user_id = new.user_id and t.revoked_at is null) then
    insert into public.push_queue (notification_id, user_id) values (new.id, new.user_id) on conflict (notification_id) do nothing;
  end if;
  return new;
end; $$;
create trigger notifications_push_enqueue after insert on public.notifications for each row execute function private.push_enqueue();

create or replace function private.notify(target_user uuid, n_kind notification_kind, n_title text, n_body text, n_href text)
 returns void language plpgsql security definer set search_path to 'public' as $function$
declare pref_key text; wanted boolean;
begin
  if target_user is null then return; end if;
  pref_key := case n_kind when 'booking' then 'bookings' when 'message' then 'messages' else null end;
  if pref_key is not null then
    select case when jsonb_typeof(p.settings -> 'notifications' -> pref_key) = 'boolean' then (p.settings -> 'notifications' ->> pref_key)::boolean else null end
      into wanted from public.profiles p where p.id = target_user;
    if wanted is not null and wanted = false then return; end if;
  end if;
  insert into public.notifications (user_id, kind, title, body, href) values (target_user, n_kind, n_title, n_body, n_href);
end;
$function$;
revoke all on function private.notify(uuid, notification_kind, text, text, text) from public, anon, authenticated;

create or replace function private.notify_message() returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare recipient uuid; recipient_is_agent_side boolean;
begin
  select case when c.guest_id = new.sender_id then c.agent_id else c.guest_id end, (c.guest_id = new.sender_id)
    into recipient, recipient_is_agent_side from public.conversations c where c.id = new.conversation_id;
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  perform private.notify(recipient, 'message', 'New message', left(new.body, 120),
    case when coalesce(recipient_is_agent_side, false) then '/agent/messages/' || new.conversation_id else '/messages/' || new.conversation_id end);
  return new;
end;
$function$;
create trigger messages_notify_after_insert after insert on public.messages for each row execute function private.notify_message();

create table public.audit_log (id uuid primary key default gen_random_uuid(), actor_id uuid, action text not null, entity_type text not null, entity_id text,
  metadata jsonb not null default '{}', created_at timestamptz not null default now());
