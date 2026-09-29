-- THE SUPPORT DESK: ESCALATIONS AND A MEMBER CONTEXT CUT TO WHAT SUPPORT NEEDS
-- (29 September 2026). DRAFT. NOT APPLIED.
--
-- THIS FILE WAITS FOR THE FOUNDER'S WORD, because it adds a table and four
-- functions. It rewrites no row that exists, drops nothing, and changes no
-- policy on any table that exists. It is safe to run twice.
--
-- WHAT IT ADDS, IN PLAIN WORDS.
--
--  1. A SUPPORT AGENT CAN HAND A TICKET TO THE MONEY, SAFETY OR VERIFICATION
--     DESK, WITH A REASON. Support never decides money, safety or identity;
--     until now the only way to route one was an internal note nobody on the
--     other desk was told about. `public.support_escalate_ticket` records the
--     hand-off (public.support_ticket_escalations), writes it to the audit
--     log, and tells the people who hold the target desk, in the app, with a
--     link to the ticket (private.tell_scope, the same path new work already
--     uses). The member is never told through this path.
--
--  2. THE OTHER DESK CAN READ THAT ONE TICKET AND HAND IT BACK. A holder of
--     the target scope may read the escalations on a ticket escalated to them
--     and hand it back with a note (`public.support_return_escalation`),
--     which tells the agent who escalated it. They see nothing else on the
--     support desk.
--
--  3. A MEMBER CONTEXT FOR SUPPORT, AND NOTHING MORE.
--     `public.support_member_context(ticket)` answers, for the account that
--     filed a ticket, only what a support agent needs to help: their first
--     name, when they joined, whether they list property and whether that
--     is verified, their published badge tier, how many bookings and
--     agreements they have (counts only), and their last five tickets
--     (reference, topic, status, date). It never returns an email beyond the
--     one on the ticket, a phone number, an address, a TIN, a CAC number, an
--     identity document, a date of birth, an amount of money, or anything
--     from the compliance desk. It answers only a caller who holds the support
--     scope, or the scope the ticket was escalated to, and has proved the
--     console's security key this session (private.staff_can already carries
--     that proof).
--
-- WHAT IT DOES NOT DO.
--  * No existing table's RLS changes. The new table has RLS on, no policy for
--    members, and a read policy for admins only (the same shape as
--    support_tickets_admin_all, read-only). Staff read it through the definer
--    functions below, which check the scope on auth.uid().
--  * No grant to anon on anything. Every function is SECURITY DEFINER with
--    search_path '' and fully qualified names.
--  * No compliance target. A support agent who suspects a compliance matter
--    escalates to safety; the safety lead decides whether compliance hears of
--    it, so nothing a support agent writes can tip a person off.
--
-- THE APP ALREADY SPEAKS TO THIS. Until it is applied, the desk says the
-- escalation door is not installed and offers an internal note instead, and
-- the member context shows only what the ticket itself carries. Nothing
-- breaks either way.
--
-- AFTER APPLYING: move this file up into supabase/migrations/, record it
-- (`node scripts/check-migrations.mjs --record <file>`), and regenerate the
-- types if wanted (the app reaches these functions untyped).

-- 1. The table ----------------------------------------------------------------

create table if not exists public.support_ticket_escalations (
  id            uuid primary key default gen_random_uuid(),
  ticket_id     uuid not null references public.support_tickets (id) on delete cascade,
  to_scope      public.staff_scope not null,
  reason        text not null,
  escalated_by  uuid references auth.users (id) on delete set null,
  escalated_at  timestamptz not null default now(),
  returned_at   timestamptz,
  returned_by   uuid references auth.users (id) on delete set null,
  return_note   text,
  constraint support_ticket_escalations_target check (to_scope in ('finance', 'moderation', 'kyc_review')),
  constraint support_ticket_escalations_reason_len check (char_length(btrim(reason)) between 8 and 1000),
  constraint support_ticket_escalations_return_note_len check (return_note is null or char_length(btrim(return_note)) between 8 and 1000),
  constraint support_ticket_escalations_return_pair check ((returned_at is null) = (returned_by is null))
);

comment on table public.support_ticket_escalations is
  'A support ticket handed to the money, safety or verification desk, with the reason, and when that desk handed it back. Written only by support_escalate_ticket / support_return_escalation.';

create index if not exists support_ticket_escalations_ticket_idx on public.support_ticket_escalations (ticket_id, escalated_at desc);
create index if not exists support_ticket_escalations_live_idx on public.support_ticket_escalations (to_scope) where returned_at is null;
create index if not exists support_ticket_escalations_by_idx on public.support_ticket_escalations (escalated_by);
create index if not exists support_ticket_escalations_returned_by_idx on public.support_ticket_escalations (returned_by);
-- One live hand-off per desk per ticket.
create unique index if not exists support_ticket_escalations_one_live
  on public.support_ticket_escalations (ticket_id, to_scope) where returned_at is null;

alter table public.support_ticket_escalations enable row level security;
revoke all on table public.support_ticket_escalations from public, anon, authenticated;
grant select on table public.support_ticket_escalations to authenticated;

drop policy if exists support_ticket_escalations_admin_read on public.support_ticket_escalations;
create policy support_ticket_escalations_admin_read on public.support_ticket_escalations
  for select to authenticated
  using (private.has_role((select auth.uid()), 'admin'::public.app_role)
         or private.has_role((select auth.uid()), 'super_admin'::public.app_role));

-- 2. May this caller see this ticket as the desk it was escalated to? ------------

create or replace function private.support_ticket_escalated_to(p_user uuid, p_ticket uuid)
returns boolean
language sql
stable security definer
set search_path to ''
as $function$
  select p_user is not null and p_ticket is not null and exists (
    select 1 from public.support_ticket_escalations e
     where e.ticket_id = p_ticket
       and e.returned_at is null
       and private.staff_can(p_user, e.to_scope::text));
$function$;

revoke all on function private.support_ticket_escalated_to(uuid, uuid) from public, anon, authenticated;

-- 3. Escalate -------------------------------------------------------------------

create or replace function public.support_escalate_ticket(p_ticket uuid, p_scope text, p_reason text)
returns jsonb
language plpgsql
volatile security definer
set search_path to ''
as $function$
declare
  actor  uuid := (select auth.uid());
  reason text := btrim(coalesce(p_reason, ''));
  t      public.support_tickets%rowtype;
  target public.staff_scope;
  esc    uuid;
  desk   text;
begin
  if actor is null or not private.staff_can(actor, 'support') then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if p_scope is null or p_scope not in ('finance', 'moderation', 'kyc_review') then
    return jsonb_build_object('status', 'invalid_scope');
  end if;
  target := p_scope::public.staff_scope;
  if char_length(reason) < 8 or char_length(reason) > 1000 then
    return jsonb_build_object('status', 'reason_needed');
  end if;
  select * into t from public.support_tickets where id = p_ticket for update;
  if t.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if t.status not in ('open', 'pending') then
    return jsonb_build_object('status', 'not_open');
  end if;
  if t.user_id is not distinct from actor then
    return jsonb_build_object('status', 'own_ticket');
  end if;
  if exists (select 1 from public.support_ticket_escalations e
              where e.ticket_id = t.id and e.to_scope = target and e.returned_at is null) then
    return jsonb_build_object('status', 'already');
  end if;

  insert into public.support_ticket_escalations (ticket_id, to_scope, reason, escalated_by)
  values (t.id, target, reason, actor)
  returning id into esc;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'support_ticket.escalate', 'support_ticket', t.id::text,
          jsonb_build_object('escalation_id', esc, 'to_scope', target, 'reference', t.reference,
                             'reason', reason, 'status', t.status));

  desk := case target when 'finance' then 'money' when 'moderation' then 'safety' else 'verification' end;
  begin
    perform private.tell_scope(target::text,
      'A support ticket needs the ' || desk || ' desk',
      'Ticket ' || t.reference || ': ' || left(reason, 140),
      '/admin/support?ticket=' || t.id::text,
      -- array_remove: a ticket filed signed out has no owner, and a null in
      -- the exclusion list would make `= any` null and tell nobody.
      array_remove(array[actor, t.user_id], null));
  exception when others then
    -- Telling people never blocks the hand-off; the desk still shows it.
    null;
  end;

  return jsonb_build_object('status', 'ok', 'id', esc);
end;
$function$;

-- 4. Hand back ------------------------------------------------------------------

create or replace function public.support_return_escalation(p_escalation uuid, p_note text)
returns jsonb
language plpgsql
volatile security definer
set search_path to ''
as $function$
declare
  actor uuid := (select auth.uid());
  note  text := btrim(coalesce(p_note, ''));
  e     public.support_ticket_escalations%rowtype;
  ref   text;
begin
  if actor is null then
    return jsonb_build_object('status', 'forbidden');
  end if;
  select * into e from public.support_ticket_escalations where id = p_escalation for update;
  if e.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  -- The desk it went to hands it back; so may support, if it was sent in error.
  if not (private.staff_can(actor, e.to_scope::text) or private.staff_can(actor, 'support')) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if e.returned_at is not null then
    return jsonb_build_object('status', 'already');
  end if;
  if char_length(note) < 8 or char_length(note) > 1000 then
    return jsonb_build_object('status', 'reason_needed');
  end if;

  update public.support_ticket_escalations
     set returned_at = now(), returned_by = actor, return_note = note
   where id = e.id;

  select reference into ref from public.support_tickets where id = e.ticket_id;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'support_ticket.escalation_return', 'support_ticket', e.ticket_id::text,
          jsonb_build_object('escalation_id', e.id, 'to_scope', e.to_scope, 'reference', ref, 'note', note));

  if e.escalated_by is not null and e.escalated_by <> actor then
    begin
      perform private.notify(e.escalated_by, 'system'::public.notification_kind,
        'A ticket you escalated came back',
        'Ticket ' || coalesce(ref, '') || ': ' || left(note, 140),
        '/admin/support?ticket=' || e.ticket_id::text);
    exception when others then
      null;
    end;
  end if;

  return jsonb_build_object('status', 'ok');
end;
$function$;

-- 5. Read the escalations on one ticket ------------------------------------------

create or replace function public.support_ticket_escalations_for(p_ticket uuid)
returns table (id uuid, to_scope text, reason text, escalated_by_name text, escalated_by_me boolean,
               escalated_at timestamptz, returned_at timestamptz, returned_by_name text, return_note text)
language plpgsql
stable security definer
set search_path to ''
as $function$
declare
  me uuid := (select auth.uid());
begin
  if me is null or p_ticket is null then
    return;
  end if;
  if not (private.staff_can(me, 'support') or private.support_ticket_escalated_to(me, p_ticket)) then
    return;
  end if;
  return query
  select e.id, e.to_scope::text, e.reason,
         coalesce(nullif(btrim(pb.first_name), ''), nullif(split_part(btrim(pb.display_name), ' ', 1), ''), 'A colleague'),
         e.escalated_by = me,
         e.escalated_at, e.returned_at,
         case when e.returned_by is null then null
              else coalesce(nullif(btrim(pr.first_name), ''), nullif(split_part(btrim(pr.display_name), ' ', 1), ''), 'A colleague') end,
         e.return_note
    from public.support_ticket_escalations e
    left join public.profiles pb on pb.id = e.escalated_by
    left join public.profiles pr on pr.id = e.returned_by
   where e.ticket_id = p_ticket
   order by e.escalated_at desc
   limit 50;
end;
$function$;

-- 6. The member context, cut to what support needs --------------------------------

create or replace function public.support_member_context(p_ticket uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to ''
as $function$
declare
  me     uuid := (select auth.uid());
  owner  uuid;
  p      public.profiles%rowtype;
  tier   text;
  lister boolean;
  lister_verified boolean;
  recent jsonb;
begin
  if me is null or p_ticket is null then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if not (private.staff_can(me, 'support') or private.support_ticket_escalated_to(me, p_ticket)) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  select t.user_id into owner from public.support_tickets t where t.id = p_ticket;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if owner is null then
    return jsonb_build_object('status', 'ok', 'has_account', false);
  end if;

  select * into p from public.profiles where id = owner;
  select b.tier::text into tier from public.person_badge b where b.user_id = owner limit 1;
  select exists (select 1 from public.agents a where a.user_id = owner),
         coalesce(bool_or(a.verified), false)
    into lister, lister_verified
    from public.agents a where a.user_id = owner;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', x.id, 'reference', x.reference, 'topic', x.topic, 'status', x.status, 'created_at', x.created_at)
           order by x.created_at desc), '[]'::jsonb)
    into recent
    from (select s.id, s.reference, s.topic, s.status, s.created_at
            from public.support_tickets s
           where s.user_id = owner and s.id <> p_ticket
           order by s.created_at desc
           limit 5) x;

  return jsonb_build_object(
    'status', 'ok',
    'has_account', true,
    'first_name', coalesce(nullif(btrim(p.first_name), ''), nullif(split_part(btrim(p.display_name), ' ', 1), '')),
    'member_since', p.created_at,
    'is_lister', coalesce(lister, false),
    'lister_verified', coalesce(lister_verified, false),
    'badge_tier', tier,
    'bookings', (select count(*) from public.bookings b where b.guest_id = owner),
    'agreements', (select count(*) from public.deal_agreements d where owner in (d.renter_id, d.owner_id)),
    'tickets_total', (select count(*) from public.support_tickets s where s.user_id = owner),
    'tickets_open', (select count(*) from public.support_tickets s where s.user_id = owner and s.status in ('open', 'pending')),
    'recent_tickets', recent);
end;
$function$;

revoke all on function public.support_escalate_ticket(uuid, text, text) from public, anon;
revoke all on function public.support_return_escalation(uuid, text) from public, anon;
revoke all on function public.support_ticket_escalations_for(uuid) from public, anon;
revoke all on function public.support_member_context(uuid) from public, anon;
grant execute on function public.support_escalate_ticket(uuid, text, text) to authenticated;
grant execute on function public.support_return_escalation(uuid, text) to authenticated;
grant execute on function public.support_ticket_escalations_for(uuid) to authenticated;
grant execute on function public.support_member_context(uuid) to authenticated;

-- 7. Read back ----------------------------------------------------------------------

do $$
begin
  -- With no caller, every door refuses.
  if public.support_escalate_ticket(gen_random_uuid(), 'finance', 'a probe reason') ->> 'status' <> 'forbidden' then
    raise exception 'escalate must refuse a caller with no identity';
  end if;
  if public.support_return_escalation(gen_random_uuid(), 'a probe note') ->> 'status' <> 'forbidden' then
    raise exception 'return must refuse a caller with no identity';
  end if;
  if public.support_member_context(gen_random_uuid()) ->> 'status' <> 'forbidden' then
    raise exception 'member context must refuse a caller with no identity';
  end if;
  if exists (select 1 from public.support_ticket_escalations_for(gen_random_uuid())) then
    raise exception 'escalations read must refuse a caller with no identity';
  end if;
  -- Nothing is callable by anon, and the private helper by nobody outside.
  if has_function_privilege('anon', 'public.support_member_context(uuid)', 'execute')
     or has_function_privilege('anon', 'public.support_escalate_ticket(uuid,text,text)', 'execute') then
    raise exception 'anon can call a support door';
  end if;
  if has_function_privilege('authenticated', 'private.support_ticket_escalated_to(uuid,uuid)', 'execute') then
    raise exception 'authenticated can call the private escalation check';
  end if;
  if has_table_privilege('authenticated', 'public.support_ticket_escalations', 'insert')
     or has_table_privilege('authenticated', 'public.support_ticket_escalations', 'update') then
    raise exception 'members can write escalations directly';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.support_ticket_escalations'::regclass) then
    raise exception 'RLS is off on support_ticket_escalations';
  end if;
end $$;

notify pgrst, 'reload schema';
