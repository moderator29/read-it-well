-- SCUML items 6 and 8 (with 19): ONE SHARED HOLD-CLAIMS MODEL. Apply after
-- 20260924173100 and before the sanctions desk's 202609241761xx files, which
-- build on it.
--
-- The problem: `plain` is the one neutral reason code, and both the STR desk
-- (item 6) and the sanctions desk (item 8, a confirmed match) hold money with
-- it on the audit's single row per person in public.account_money_holds. A
-- release by either desk ended the other's hold.
--
-- The model: each desk keeps its own CLAIM, and the row is only ever the
-- result of the claims.
--
--   private.hold_claims(user_id, owner, until, set_by, set_at)
--       owner is 'str' or 'sanctions'; one claim per desk per person. Locked:
--       no grants, read and written only by the functions below.
--   private.hold_claim_set(user, owner, until, by)
--       upserts that desk's claim, never shortening it (only a clear ends
--       it), then recomputes the row.
--   private.hold_claim_clear(user, owner)
--       deletes only that desk's claim, then recomputes the row.
--   private.hold_rows(user_id, written_until, absorbed_until)
--       the end hold_recompute last wrote to each person's row, and the end
--       of the unregistered plain freeze it last saw set by hand. A hand-set
--       end replaces the one absorbed before (so a freeze staff shorten stays
--       short) and a row that ended or was lifted forgets it (so a lifted
--       freeze never comes back).
--   private.hold_recompute(user)
--       the row follows the latest live claim:
--         a live hold with a NON-plain reason (a "this was not me" hold) is
--           NOT TOUCHED AT ALL: not relabelled, not lengthened, not ended. The
--           claims wait, pending, until it ends;
--         a live `plain` row whose end this model did not write is a freeze
--           not registered as a claim: it is never shortened, and its end is
--           remembered (absorbed_until) so the row never drops below it while
--           it is live;
--         otherwise a live `plain` row is set to the latest live claim, and
--           ended (hold_until = now()) when no claim is live;
--         nothing is written when nothing would change;
--         `plain` is written only when a hold is created or replaces one that
--           has ended.
--   private.hold_claims_sweep()
--       recomputes every person with a live claim, so pending claims take
--       over once a "this was not me" hold ends. Run EVERY MINUTE by pg_cron
--       (`vallo_hold_claims_sweep`); public.hold_claims_sweep() is the same,
--       as a service-role-only wrapper. Returns how many people it
--       recomputed. It skips people whose account is gone, deletes their
--       claims and rows, and one person's failure is a warning, never the
--       end of the run.
--
--   THE REMAINING WINDOW. Between a "this was not me" hold ending and the
--   next sweep, up to 60 seconds, a person with a pending compliance claim is
--   not held. Hand-off to the audit: adding `or exists (a live
--   private.hold_claims row)` to private.money_hold_until would close it.
--   Execute on all four is granted to nobody; only definer functions call
--   them.
--
-- The STR desk on it:
--   public.str_place_hold(case)     claims 'str' for a rolling 30 days.
--   public.str_release_hold(case, note)  ASKS; ends nothing.
--   public.str_approve_release(request)  a SECOND staff member (item 19: not
--                                   the asker, never a party) clears the 'str'
--                                   claim. Any other claim, a sanctions
--                                   freeze above all, holds on regardless.
--   private.str_holds               an append-only log of every STR claim set
--                                   (the claim's end, not necessarily the row's).
--   public.str_pending_releases()   releases waiting on a second person.

-- ----------------------------------------------------------------------------
-- THE SHARED MODEL

create table if not exists private.hold_claims (
  user_id  uuid not null,
  owner    text not null check (owner in ('str', 'sanctions')),
  until    timestamptz not null,
  set_by   uuid,
  set_at   timestamptz not null default now(),
  primary key (user_id, owner)
);

comment on table private.hold_claims is
  'SCUML items 6 and 8. Each compliance desk''s own claim on a person''s money hold. public.account_money_holds follows the latest live claim (private.hold_recompute). No grants.';

revoke all on private.hold_claims from public, anon, authenticated;

create table if not exists private.hold_rows (
  user_id         uuid primary key,
  written_until   timestamptz,
  absorbed_until  timestamptz,
  written_at      timestamptz not null default now()
);

comment on table private.hold_rows is
  'SCUML items 6 and 8. The end private.hold_recompute last wrote to a person''s account_money_holds row, so a plain row written by anything else (a freeze not yet registered as a claim) is recognised and left alone. No grants.';

revoke all on private.hold_rows from public, anon, authenticated;

create or replace function private.hold_recompute(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_latest timestamptz;
  v_row public.account_money_holds%rowtype;
  v_written timestamptz;
  v_absorbed timestamptz;
  v_new timestamptz;
begin
  select max(c.until) into v_latest from private.hold_claims c where c.user_id = p_user and c.until > now();
  select * into v_row from public.account_money_holds h where h.user_id = p_user for update;
  select w.written_until, w.absorbed_until into v_written, v_absorbed from private.hold_rows w where w.user_id = p_user;
  if v_absorbed is not null and v_absorbed <= now() then v_absorbed := null; end if;

  if v_row.user_id is null then
    if v_latest is null then return; end if;
    insert into public.account_money_holds (user_id, hold_until, reason, created_at)
    values (p_user, v_latest, 'plain', now());
    v_new := v_latest;
  elsif v_row.hold_until > now() and v_row.reason <> 'plain' then
    /* Somebody else's live hold (a "this was not me" hold): not touched at
       all. The claims stay pending and the sweep hands over when it ends. */
    return;
  elsif v_row.hold_until > now() then
    /* A live plain row this model did not write is an unregistered freeze:
       remember its end, and never go below it while it is live. */
    if v_written is distinct from v_row.hold_until then
      /* The row's end is not the one this model wrote: somebody set it by
         hand (a freeze placed, shortened or lengthened by staff). That end
         REPLACES what was absorbed before, so a freeze staff shortened
         stays short. */
      v_absorbed := v_row.hold_until;
    end if;
    v_new := coalesce(v_latest, now());
    if v_absorbed is not null then v_new := greatest(v_new, v_absorbed); end if;
    if v_new is distinct from v_row.hold_until then
      update public.account_money_holds set hold_until = v_new where user_id = p_user;
    end if;
  elsif v_latest is not null then
    /* A hold that has ended (or that staff lifted by hand) is replaced by the
       pending claims, and nothing absorbed before survives it. */
    update public.account_money_holds set hold_until = v_latest, reason = 'plain' where user_id = p_user;
    v_new := v_latest;
    v_absorbed := null;
  else
    return;
  end if;

  /* Nothing written when nothing changed: the row's triggers stay quiet. */
  if v_written is distinct from v_new
     or v_absorbed is distinct from (select w.absorbed_until from private.hold_rows w where w.user_id = p_user) then
    insert into private.hold_rows (user_id, written_until, absorbed_until, written_at)
    values (p_user, v_new, v_absorbed, now())
    on conflict (user_id) do update
      set written_until = excluded.written_until, absorbed_until = excluded.absorbed_until, written_at = now();
  end if;
end;
$$;

create or replace function private.hold_claims_sweep()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid;
  n integer := 0;
begin
  /* An account that is gone takes its claims and its row record with it; the
     compliance record of the hold stays in str_holds and the audit log. */
  delete from private.hold_claims c where not exists (select 1 from auth.users a where a.id = c.user_id);
  delete from private.hold_rows w where not exists (select 1 from auth.users a where a.id = w.user_id);

  for u in
    select distinct c.user_id from private.hold_claims c
     where c.until > now() and exists (select 1 from auth.users a where a.id = c.user_id)
  loop
    begin
      perform private.hold_recompute(u);
      n := n + 1;
    exception when others then
      /* One person can never stop everyone else's hold being kept. */
      raise warning 'hold_claims_sweep: % could not be recomputed: %', u, sqlerrm;
    end;
  end loop;
  return n;
end;
$$;

create or replace function private.hold_claim_set(p_user uuid, p_owner text, p_until timestamptz, p_by uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare v_until timestamptz;
begin
  insert into private.hold_claims as hc (user_id, owner, until, set_by, set_at)
  values (p_user, p_owner, p_until, p_by, now())
  on conflict (user_id, owner) do update
    set until = greatest(hc.until, excluded.until), set_by = excluded.set_by, set_at = now()
  returning until into v_until;
  perform private.hold_recompute(p_user);
  return v_until;
end;
$$;

create or replace function private.hold_claim_clear(p_user uuid, p_owner text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare had boolean;
begin
  delete from private.hold_claims c where c.user_id = p_user and c.owner = p_owner;
  had := found;
  perform private.hold_recompute(p_user);
  return had;
end;
$$;

revoke all on function private.hold_recompute(uuid) from public, anon, authenticated, service_role;
revoke all on function private.hold_claims_sweep() from public, anon, authenticated, service_role;

/* The service role's door to the sweep, and nobody else's. */
create or replace function public.hold_claims_sweep()
returns integer
language sql
security definer
set search_path = ''
as $$ select private.hold_claims_sweep() $$;

revoke all on function public.hold_claims_sweep() from public, anon, authenticated;
grant execute on function public.hold_claims_sweep() to service_role;
revoke all on function private.hold_claim_set(uuid, text, timestamptz, uuid) from public, anon, authenticated, service_role;
revoke all on function private.hold_claim_clear(uuid, text) from public, anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- THE STR DESK ON THE MODEL

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
  'SCUML item 6. A log of every STR hold placed: the case, the person, the end of the ''str'' claim it set, who and when. The claim is in private.hold_claims; the audit''s row may carry another end while another hold is live. Append-only, kept five years.';

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
  outcome      text not null check (outcome in ('released', 'expired', 'other_hold')),
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
begin
  if not private.str_is_staff(actor) then return jsonb_build_object('status', 'forbidden'); end if;
  select * into c from private.str_cases x where x.id = p_case;
  if c.id is null then return jsonb_build_object('status', 'not_found'); end if;
  if private.str_is_party(p_case, actor) then return jsonb_build_object('status', 'conflicted'); end if;
  if c.subject_id is null then return jsonb_build_object('status', 'no_subject'); end if;
  if private.str_state(p_case) = 'not_filed' then return jsonb_build_object('status', 'closed'); end if;

  /* A rolling 30 days on this desk's own claim; the row follows the claims. */
  v_until := private.hold_claim_set(c.subject_id, 'str', v_until, actor);

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
  if not exists (select 1 from private.hold_claims h where h.user_id = c.subject_id and h.owner = 'str' and h.until > now()) then
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
  v_had boolean;
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

  /* Only this desk's claim is cleared. Any other claim (a sanctions freeze)
     keeps the money held; the row follows what is left. */
  /* Clear first, then look, in a separate statement: a condition that did
     both would read the row as it was before the clear. The answer is about
     the money: other_hold while anything still holds it (another claim, a
     not_me hold, a relabel by email recovery, an unregistered freeze);
     released when this desk's claim was the last thing holding it; expired
     when this desk's claim had already run out and nothing holds it. */
  v_had := private.hold_claim_clear(r.user_id, 'str');
  if exists (select 1 from public.account_money_holds h where h.user_id = r.user_id and h.hold_until > now()) then
    v_outcome := 'other_hold';
  elsif v_had then
    v_outcome := 'released';
  else
    v_outcome := 'expired';
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
               and pg_get_functiondef(p.oid) like '%hold_claim_clear%') then
    bad := bad || ' [asking for a release still ends the hold]';
  end if;
  if has_table_privilege('authenticated', 'private.hold_claims', 'select')
     or has_table_privilege('service_role', 'private.hold_claims', 'select') then
    bad := bad || ' [claims are readable]';
  end if;
  if has_function_privilege('authenticated', 'private.hold_claim_set(uuid, text, timestamptz, uuid)', 'execute')
     or has_function_privilege('service_role', 'private.hold_claim_clear(uuid, text)', 'execute') then
    bad := bad || ' [a claim can be set from outside]';
  end if;
  if has_table_privilege('authenticated', 'private.hold_rows', 'select') then bad := bad || ' [hold rows are readable]'; end if;
  if has_function_privilege('authenticated', 'private.hold_claims_sweep()', 'execute')
     or has_function_privilege('anon', 'private.hold_claims_sweep()', 'execute')
     or has_function_privilege('authenticated', 'public.hold_claims_sweep()', 'execute')
     or has_function_privilege('anon', 'public.hold_claims_sweep()', 'execute') then
    bad := bad || ' [a member can run the sweep]';
  end if;
  if bad <> '' then raise exception 'READ-BACK FAILED:%', bad; end if;
end;
$readback$;

/* Pending claims take over within a minute of a "this was not me" hold
   ending (the window is stated in the header). Scheduled with the rest of
   this migration, in its transaction. */
select cron.unschedule('vallo_hold_claims_sweep')
 where exists (select 1 from cron.job where jobname = 'vallo_hold_claims_sweep');
select cron.schedule('vallo_hold_claims_sweep', '* * * * *', 'select private.hold_claims_sweep();');
