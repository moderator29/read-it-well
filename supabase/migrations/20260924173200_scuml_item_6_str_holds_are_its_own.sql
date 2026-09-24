-- SCUML item 6 (with items 8 and 19): THE STR DESK ENDS ONLY ITS OWN HOLD.
-- Apply after 20260924173100.
--
-- The problem this closes: `plain` is the one neutral reason code, and the
-- sanctions desk (SCUML item 8, 20260924176100) freezes a confirmed match with
-- a `plain` hold too, renewed by its screening job. 173100's release ended any
-- `plain` hold, so the STR desk could shorten or end a sanctions freeze.
--
--   private.str_holds             every hold this desk placed: case, person,
--                                 the end it set, who, when. Append-only.
--   public.str_place_hold(case)   never shortens a hold: the end is
--                                 greatest(the hold in force, now + 30 days).
--   public.str_release_hold(case, note)
--                                 ASKS for a release. It does not end anything.
--   public.str_approve_release(request)
--                                 a SECOND staff member (item 19: not the one
--                                 who asked, and never a party to the case)
--                                 ends the hold, and only when BOTH are true:
--                                 the hold's end is exactly the one this desk
--                                 last recorded for the person (so nobody else
--                                 has placed or renewed it since), and no
--                                 CONFIRMED sanctions hit stands for the
--                                 person. Otherwise it answers `other_hold`
--                                 and changes nothing.
--   public.str_pending_releases() the desk's list of releases waiting.

create table if not exists private.str_holds (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references private.str_cases(id),
  user_id     uuid not null,
  hold_until  timestamptz not null,
  placed_by   uuid not null,
  placed_at   timestamptz not null default now()
);

create index if not exists str_holds_user_idx on private.str_holds (user_id, placed_at desc);

comment on table private.str_holds is
  'SCUML item 6. Every money hold the STR desk placed, with the end it set. The desk ends a hold only while the hold in force still carries that end. Append-only, kept five years.';

create table if not exists private.str_hold_releases (
  id            uuid primary key default gen_random_uuid(),
  case_id       uuid not null references private.str_cases(id),
  user_id       uuid not null,
  note          text not null check (length(btrim(note)) between 5 and 2000),
  requested_by  uuid not null,
  requested_at  timestamptz not null default now()
);

create table if not exists private.str_hold_release_decisions (
  release_id   uuid primary key references private.str_hold_releases(id),
  outcome      text not null check (outcome in ('released', 'other_hold')),
  approved_by  uuid not null,
  decided_at   timestamptz not null default now()
);

comment on table private.str_hold_releases is
  'SCUML items 6 and 19. A request to end an STR hold, waiting on a second staff member. Append-only.';
comment on table private.str_hold_release_decisions is
  'SCUML items 6 and 19. The second person''s answer to a release request: released, or other_hold when the hold is no longer only this desk''s. Append-only.';

revoke all on private.str_holds, private.str_hold_releases, private.str_hold_release_decisions
  from public, anon, authenticated;

do $append_only$
declare t text;
begin
  foreach t in array array['str_holds', 'str_hold_releases', 'str_hold_release_decisions'] loop
    execute format('drop trigger if exists %I on private.%I', t || '_append_only', t);
    execute format('create trigger %I before update or delete on private.%I for each row execute function private.str_refuse_change()',
                   t || '_append_only', t);
    execute format('drop trigger if exists %I on private.%I', t || '_no_truncate', t);
    execute format('create trigger %I before truncate on private.%I for each statement execute function private.str_refuse_truncate()',
                   t || '_no_truncate', t);
  end loop;
end;
$append_only$;

/* Is a confirmed sanctions match standing for this person (SCUML item 8)?
   Read dynamically: the sanctions desk's table may be applied after this. */
create or replace function private.str_sanctions_confirmed(p_user uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare found_one boolean := false;
begin
  if to_regclass('public.sanctions_hits') is null then return false; end if;
  execute 'select exists (select 1 from public.sanctions_hits h where h.person_id = $1 and h.status = ''confirmed'')'
    into found_one using p_user;
  return found_one;
end;
$$;

revoke all on function private.str_sanctions_confirmed(uuid) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- PLACING: NEVER SHORTER

create or replace function public.str_place_hold(p_case uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  c private.str_cases%rowtype;
  v_until timestamptz := now() + private.str_hold_length();
  v_existing public.account_money_holds%rowtype;
begin
  if not private.str_is_staff(actor) then return jsonb_build_object('status', 'forbidden'); end if;
  select * into c from private.str_cases x where x.id = p_case;
  if c.id is null then return jsonb_build_object('status', 'not_found'); end if;
  if private.str_is_party(p_case, actor) then return jsonb_build_object('status', 'conflicted'); end if;
  if c.subject_id is null then return jsonb_build_object('status', 'no_subject'); end if;
  if private.str_state(p_case) = 'not_filed' then return jsonb_build_object('status', 'closed'); end if;

  select * into v_existing from public.account_money_holds h where h.user_id = c.subject_id for update;
  if v_existing.user_id is null then
    insert into public.account_money_holds (user_id, hold_until, reason, created_at)
    values (c.subject_id, v_until, 'plain', now());
  elsif v_existing.reason = 'plain' or v_existing.hold_until <= now() then
    /* A hold is never shortened, whoever placed it (a sanctions freeze runs
       longer than 30 days and stays as long). */
    v_until := greatest(v_existing.hold_until, v_until);
    update public.account_money_holds set hold_until = v_until, reason = 'plain'
     where user_id = c.subject_id;
  else
    return jsonb_build_object('status', 'other_hold', 'until', v_existing.hold_until);
  end if;

  insert into private.str_holds (case_id, user_id, hold_until, placed_by)
  values (p_case, c.subject_id, v_until, actor);

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'str.hold_placed', 'str_case', p_case::text,
          jsonb_build_object('scuml_item', 6, 'until', v_until));
  return jsonb_build_object('status', 'held', 'until', v_until);
end;
$$;

revoke all on function public.str_place_hold(uuid) from public, anon;
grant execute on function public.str_place_hold(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- RELEASING: ASKED BY ONE, DONE BY A SECOND, AND ONLY OUR OWN HOLD

/* 173100 answered text; this one answers jsonb, so it is dropped first. */
drop function if exists public.str_release_hold(uuid, text);
create or replace function public.str_release_hold(p_case uuid, p_note text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  c private.str_cases%rowtype;
  v_request uuid;
begin
  if not private.str_is_staff(actor) then return jsonb_build_object('status', 'forbidden'); end if;
  select * into c from private.str_cases x where x.id = p_case;
  if c.id is null then return jsonb_build_object('status', 'not_found'); end if;
  if private.str_is_party(p_case, actor) then return jsonb_build_object('status', 'conflicted'); end if;
  if length(btrim(coalesce(p_note, ''))) < 5 then return jsonb_build_object('status', 'note_needed'); end if;
  if c.subject_id is null then return jsonb_build_object('status', 'no_subject'); end if;
  if not exists (select 1 from private.str_holds h where h.case_id = p_case) then
    return jsonb_build_object('status', 'no_hold');
  end if;
  if exists (select 1 from private.str_hold_releases r
              where r.case_id = p_case
                and not exists (select 1 from private.str_hold_release_decisions d where d.release_id = r.id)) then
    return jsonb_build_object('status', 'release_waiting');
  end if;

  insert into private.str_hold_releases (case_id, user_id, note, requested_by)
  values (p_case, c.subject_id, btrim(p_note), actor)
  returning id into v_request;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'str.hold_release_asked', 'str_case', p_case::text,
          jsonb_build_object('scuml_item', 6, 'release_id', v_request));

  perform private.str_tell_staff(
    'An STR hold release needs a second person',
    'A request to end a money hold placed from a Suspicious Transaction Report case waits for a staff member other than the one who asked.',
    p_case);
  return jsonb_build_object('status', 'release_asked', 'release_id', v_request);
end;
$$;

revoke all on function public.str_release_hold(uuid, text) from public, anon;
grant execute on function public.str_release_hold(uuid, text) to authenticated;

create or replace function public.str_approve_release(p_release uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  r private.str_hold_releases%rowtype;
  v_ours timestamptz;
  v_now public.account_money_holds%rowtype;
  v_outcome text;
begin
  if not private.str_is_staff(actor) then return 'forbidden'; end if;
  select * into r from private.str_hold_releases x where x.id = p_release;
  if r.id is null then return 'not_found'; end if;
  perform 1 from private.str_cases c where c.id = r.case_id for update;
  if private.str_is_party(r.case_id, actor) then return 'conflicted'; end if;
  if exists (select 1 from private.str_hold_release_decisions d where d.release_id = p_release) then return 'already'; end if;
  /* SCUML item 19. */
  if r.requested_by = actor then return 'same_person'; end if;

  select h.hold_until into v_ours from private.str_holds h
   where h.user_id = r.user_id order by h.placed_at desc limit 1;
  select * into v_now from public.account_money_holds h where h.user_id = r.user_id for update;

  if v_now.user_id is not null and v_now.reason = 'plain' and v_now.hold_until > now()
     and v_now.hold_until = v_ours and not private.str_sanctions_confirmed(r.user_id) then
    update public.account_money_holds set hold_until = now() where user_id = r.user_id;
    v_outcome := 'released';
  else
    /* Not ours alone any more: another desk placed or renewed it, a confirmed
       sanctions match stands, or it has already ended. Nothing is changed. */
    v_outcome := 'other_hold';
  end if;

  insert into private.str_hold_release_decisions (release_id, outcome, approved_by)
  values (p_release, v_outcome, actor);
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'str.hold_release_' || v_outcome, 'str_case', r.case_id::text,
          jsonb_build_object('scuml_item', 6, 'release_id', p_release));
  return v_outcome;
end;
$$;

revoke all on function public.str_approve_release(uuid) from public, anon;
grant execute on function public.str_approve_release(uuid) to authenticated;

create or replace function public.str_pending_releases()
returns table (release_id uuid, case_id uuid, note text, requested_by uuid, requested_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare me uuid := (select auth.uid());
begin
  if not private.str_is_staff(me) then return; end if;
  return query
    select r.id, r.case_id, r.note, r.requested_by, r.requested_at
      from private.str_hold_releases r
     where not exists (select 1 from private.str_hold_release_decisions d where d.release_id = r.id)
       and not private.str_is_party(r.case_id, me)
     order by r.requested_at
     limit 200;
end;
$$;

revoke all on function public.str_pending_releases() from public, anon;
grant execute on function public.str_pending_releases() to authenticated;

do $readback$
declare bad text := '';
begin
  if has_table_privilege('authenticated', 'private.str_holds', 'select') then bad := bad || ' [holds are readable]'; end if;
  if has_function_privilege('anon', 'public.str_approve_release(uuid)', 'execute') then bad := bad || ' [anon can release]'; end if;
  if exists (select 1 from pg_proc p where p.proname = 'str_release_hold'
               and pg_get_functiondef(p.oid) like '%set hold_until = now()%') then
    bad := bad || ' [asking for a release still ends the hold]';
  end if;
  if bad <> '' then raise exception 'READ-BACK FAILED:%', bad; end if;
end;
$readback$;
