/*
 * SCUML items 20 and 15 (and 19). REVIEW FIXES TO 20260924175000 AND
 * 20260924175100.
 *
 * SCUML-EFCC AML/CFT Compliance Checklist for DNFBPs, items 20 (PEPs),
 * 15 (risk classification) and 19 (controls management cannot override).
 *
 *   1. WHO IS A PEP. Any effective staff record decides. Failing that, a
 *      person who has EVER declared yes is a PEP. A self-declared no never
 *      supersedes a yes or a flag; a yes made after a staff record still
 *      counts. Taking somebody off the record (flag_pep with false) is only a
 *      PROPOSAL until a second member of staff approves it
 *      (pep_clear_approvals, approver is never the proposer).
 *   2. A DOWNWARD OVERRIDE needs a second person. override_risk_class marks a
 *      row that lowers the class as needs_approval; it has no effect (on the
 *      gates, on the desk, on the next derivation) until approved in
 *      risk_override_approvals. Anyone whose current class is an override is
 *      re-derived every run, so a higher derived class still lands.
 *   5. MEMBERS' MONEY IS NEVER BLOCKED BY A RULE. The bank_accounts gate only
 *      refuses a person with an agents row. For a member it raises an item 15
 *      review (reason member_account) and lets the account through; staff
 *      place a hold (V-19, account_money_holds) if one is needed.
 *   7. VOLUME AND POPULATION count successful rent payments (tenant and
 *      lister, through the booking's SUCCESSFUL transaction) and completed
 *      wallet entries.
 *   8. edd_clear_for also requires the clearing review to have been raised
 *      inside the current run of high.
 *   9. reopen_edd_review: staff reopen an item 15 review; the gates shut until
 *      it is cleared again.
 *  10. The watcher uses abs() on amounts, watches an escrow when it is funded
 *      (not when it is opened), and a rent payment only when its booking's
 *      transaction succeeds (the rent_payments insert trigger is dropped).
 *  11. answer_pep_question is rate limited, and a declaration or staff flag
 *      raises no new review while one is already open for that person.
 *  14. pep_desk counts listers who have not yet answered.
 *
 * RETENTION CORRECTION. Account deletion does not delete the auth.users row:
 * it strips it to a tombstone (20260919160100), so the uuid on these records
 * stays and resolves to an anonymous, banned account. The on-delete-set-null
 * path in private.aml_append_only only matters if a row is ever deleted
 * outright. docs/RETENTION_SCHEDULE.md 3.3a is corrected to match.
 *
 * Money correctness belongs to the audit: everything added to a money table
 * here is still an AFTER trigger that only enqueues, or a BEFORE trigger that
 * only refuses a lister.
 */

/* ------------------------------------------------------------------------ */
/* New reasons.                                                             */
/* ------------------------------------------------------------------------ */

alter table public.edd_reviews drop constraint if exists edd_reviews_reason_check;
alter table public.edd_reviews add constraint edd_reviews_reason_check
  check (reason in ('transaction', 'declaration', 'staff_flag', 'high_risk', 'reopened', 'member_account'));

/* ------------------------------------------------------------------------ */
/* 1 and 4. Clearing a flag takes two people; who is a PEP.                 */
/* ------------------------------------------------------------------------ */

create table if not exists public.pep_clear_approvals (
  id          uuid primary key default gen_random_uuid(),
  flag_id     uuid not null unique references public.pep_flags(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz not null default clock_timestamp()
);
comment on table public.pep_clear_approvals is
  'SCUML items 20 and 19: the second person''s approval of taking somebody off the PEP record. Staff only; append only; kept five years.';
alter table public.pep_clear_approvals enable row level security;
revoke all on public.pep_clear_approvals from anon, authenticated;

drop trigger if exists pep_clear_approvals_append_only on public.pep_clear_approvals;
create trigger pep_clear_approvals_append_only
  before update or delete on public.pep_clear_approvals
  for each row execute function private.aml_append_only('approved_by');

create or replace function private.pep_clear_two_people()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  f public.pep_flags;
begin
  select * into f from public.pep_flags where id = new.flag_id;
  if f.id is null or f.flagged then
    raise exception 'Only a proposal to take somebody off the record can be approved.' using errcode = '22023';
  end if;
  if new.approved_by is null or not private.aml_staff(new.approved_by) then
    raise exception 'Only staff can approve this.' using errcode = '42501';
  end if;
  if f.set_by is null or f.set_by = new.approved_by then
    raise exception 'A second person must approve this. The person who proposed it cannot approve it (SCUML item 19).'
      using errcode = 'RM175';
  end if;
  return new;
end;
$$;
revoke all on function private.pep_clear_two_people() from public, anon, authenticated;

drop trigger if exists pep_clear_approvals_two_people on public.pep_clear_approvals;
create trigger pep_clear_approvals_two_people
  before insert on public.pep_clear_approvals
  for each row execute function private.pep_clear_two_people();

create or replace function private.is_pep(p_user uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s_flag boolean;
  s_at timestamptz;
begin
  if p_user is null then
    return false;
  end if;
  /* The latest EFFECTIVE staff record: a flag, or a clear a second person approved. */
  select f.flagged, f.set_at into s_flag, s_at
    from public.pep_flags f
   where f.user_id = p_user
     and (f.flagged or exists (select 1 from public.pep_clear_approvals c where c.flag_id = f.id))
   order by f.set_at desc, f.id desc
   limit 1;
  /* A yes the person declared after it (or ever, with no staff record) stands.
     A no never counts. */
  if exists (select 1 from public.pep_declarations d
              where d.user_id = p_user and d.is_pep
                and (s_at is null or d.declared_at > s_at)) then
    return true;
  end if;
  return coalesce(s_flag, false);
end;
$$;
revoke all on function private.is_pep(uuid) from public, anon, authenticated;

/* An item 20 review about the person themselves (not a transaction) still open. */
create or replace function private.pep_person_review_open(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.edd_reviews r
     where r.user_id = p_user and r.scuml_item = 20
       and r.reason in ('declaration', 'staff_flag')
       and not private.edd_review_settled(r.id)
  );
$$;
revoke all on function private.pep_person_review_open(uuid) from public, anon, authenticated;

create or replace function public.answer_pep_question(
  p_is_pep boolean,
  p_relation text,
  p_role text,
  p_asked_at text
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  row_id uuid;
  v_at timestamptz;
begin
  if me is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  /* A member looking for a home is never asked. */
  if not exists (select 1 from public.agents a where a.user_id = me) then
    raise exception 'This question is for people who list homes on Vallo.' using errcode = '42501';
  end if;
  if p_is_pep is null then
    raise exception 'Choose yes or no.' using errcode = '22023';
  end if;
  if not private.consume_rate_limit('pep_answer', me::text, 6, 3600) then
    raise exception 'That is a lot of answers in an hour. Please try again later.' using errcode = '54000';
  end if;

  insert into public.pep_declarations (user_id, is_pep, relation, role, asked_at)
  values (
    me,
    p_is_pep,
    case when p_is_pep then p_relation end,
    case when p_is_pep then nullif(btrim(p_role), '') end,
    p_asked_at
  )
  returning id, declared_at into row_id, v_at;

  if p_is_pep and not private.pep_person_review_open(me) then
    insert into public.edd_reviews (user_id, scuml_item, reason, source_table, source_id)
    values (me, 20, 'declaration', 'pep_declarations', row_id)
    on conflict (scuml_item, source_table, source_id, user_id) do nothing;
  end if;
  return v_at;
end;
$$;
revoke all on function public.answer_pep_question(boolean, text, text, text) from public, anon;
grant execute on function public.answer_pep_question(boolean, text, text, text) to authenticated;

/* flag_pep(true) flags at once; flag_pep(false) records a PROPOSAL to clear. */
create or replace function public.flag_pep(
  p_user uuid,
  p_flagged boolean,
  p_relation text,
  p_role text,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  yes boolean := coalesce(p_flagged, true);
  row_id uuid;
begin
  if not private.aml_staff(me) then
    raise exception 'Staff only.' using errcode = '42501';
  end if;
  if p_user is null or not exists (select 1 from auth.users u where u.id = p_user) then
    raise exception 'That person was not found.' using errcode = '22023';
  end if;
  insert into public.pep_flags (user_id, flagged, relation, role, note, set_by)
  values (
    p_user,
    yes,
    case when yes then p_relation end,
    case when yes then nullif(btrim(p_role), '') end,
    p_note,
    me
  )
  returning id into row_id;

  if yes and not private.pep_person_review_open(p_user) then
    insert into public.edd_reviews (user_id, scuml_item, reason, source_table, source_id)
    values (p_user, 20, 'staff_flag', 'pep_flags', row_id)
    on conflict (scuml_item, source_table, source_id, user_id) do nothing;
  end if;
  return row_id;
end;
$$;
revoke all on function public.flag_pep(uuid, boolean, text, text, text) from public, anon;
grant execute on function public.flag_pep(uuid, boolean, text, text, text) to authenticated;

create or replace function public.approve_pep_clear(p_flag uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  row_id uuid;
begin
  if not private.aml_staff(me) then
    raise exception 'Staff only.' using errcode = '42501';
  end if;
  if exists (select 1 from public.pep_clear_approvals c where c.flag_id = p_flag) then
    raise exception 'This is already approved.' using errcode = 'RM175';
  end if;
  insert into public.pep_clear_approvals (flag_id, approved_by)
  values (p_flag, me)
  returning id into row_id;
  return row_id;
end;
$$;
revoke all on function public.approve_pep_clear(uuid) from public, anon;
grant execute on function public.approve_pep_clear(uuid) to authenticated;

/* ------------------------------------------------------------------------ */
/* 10. The watcher.                                                         */
/* ------------------------------------------------------------------------ */

create or replace function private.pep_watch_money()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parties uuid[] := '{}';
  who uuid;
  amount bigint;
begin
  begin
    if tg_table_name = 'transactions' then
      if new.status::text <> 'SUCCESSFUL'
         or (tg_op = 'UPDATE' and old.status::text = 'SUCCESSFUL') then
        return null;
      end if;
      /* The guest and the lister of the booking, and, for a move-in charge,
         the tenant and the lister of the rent payment: a rent payment
         succeeds when this transaction does. */
      select array_remove(array[bk.guest_id, ag.user_id, rp.tenant_id, rp.lister_id], null)
        into parties
        from public.bookings bk
        left join public.listings l on l.id = bk.listing_id
        left join public.agents ag on ag.id = l.agent_id
        left join public.rent_payments rp on rp.booking_id = bk.id
       where bk.id = new.booking_id;
      amount := abs(new.amount_minor);
    elsif tg_table_name = 'escrows' then
      /* Funded, not merely opened. */
      if new.funded_at is null or (tg_op = 'UPDATE' and old.funded_at is not null) then
        return null;
      end if;
      parties := array_remove(array[new.payer_id, new.payee_id], null);
      amount := abs(new.amount_minor);
    elsif tg_table_name = 'wallet_entries' then
      select array_remove(array[w.user_id], null) into parties from public.wallets w where w.id = new.wallet_id;
      amount := abs(new.amount_minor);
    else
      return null;
    end if;

    for who in select distinct x from unnest(coalesce(parties, '{}')) x loop
      perform private.pep_enqueue(who, tg_table_name, new.id, amount);
    end loop;
  exception when others then
    raise warning 'SCUML item 20: no review was raised for % %: %', tg_table_name, new.id, sqlerrm;
  end;
  return null;
end;
$$;
revoke all on function private.pep_watch_money() from public, anon, authenticated;

drop trigger if exists escrows_zz_scuml20_pep_watch on public.escrows;
create trigger escrows_zz_scuml20_pep_watch
  after insert or update of funded_at on public.escrows
  for each row execute function private.pep_watch_money();
drop trigger if exists rent_payments_zz_scuml20_pep_watch on public.rent_payments;

/* ------------------------------------------------------------------------ */
/* 2. A downward override needs a second person.                            */
/* ------------------------------------------------------------------------ */

alter table public.risk_classes add column if not exists needs_approval boolean not null default false;
comment on column public.risk_classes.needs_approval is
  'SCUML items 15 and 19: an override that lowers the class. It has no effect until risk_override_approvals holds a second person''s approval.';

create table if not exists public.risk_override_approvals (
  id            uuid primary key default gen_random_uuid(),
  risk_class_id uuid not null unique references public.risk_classes(id) on delete restrict,
  approved_by   uuid references auth.users(id) on delete set null,
  approved_at   timestamptz not null default clock_timestamp()
);
comment on table public.risk_override_approvals is
  'SCUML items 15 and 19: the second person''s approval of a class lowered by hand. Staff only; append only; kept five years.';
alter table public.risk_override_approvals enable row level security;
revoke all on public.risk_override_approvals from anon, authenticated;

drop trigger if exists risk_override_approvals_append_only on public.risk_override_approvals;
create trigger risk_override_approvals_append_only
  before update or delete on public.risk_override_approvals
  for each row execute function private.aml_append_only('approved_by');

create or replace function private.risk_override_two_people()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.risk_classes;
begin
  select * into r from public.risk_classes where id = new.risk_class_id;
  if r.id is null or not r.needs_approval then
    raise exception 'Only a lowered class waiting on approval can be approved.' using errcode = '22023';
  end if;
  if new.approved_by is null or not private.aml_staff(new.approved_by) then
    raise exception 'Only staff can approve this.' using errcode = '42501';
  end if;
  if r.set_by is null or r.set_by = new.approved_by then
    raise exception 'A second person must approve this. The person who proposed it cannot approve it (SCUML item 19).'
      using errcode = 'RM175';
  end if;
  return new;
end;
$$;
revoke all on function private.risk_override_two_people() from public, anon, authenticated;

drop trigger if exists risk_override_approvals_two_people on public.risk_override_approvals;
create trigger risk_override_approvals_two_people
  before insert on public.risk_override_approvals
  for each row execute function private.risk_override_two_people();

/* In force: every row except a lowered class nobody has approved yet. */
create or replace function private.risk_row_in_force(p_row uuid, p_needs_approval boolean)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not p_needs_approval
      or exists (select 1 from public.risk_override_approvals a where a.risk_class_id = p_row);
$$;
revoke all on function private.risk_row_in_force(uuid, boolean) from public, anon, authenticated;

create or replace function private.risk_latest(p_user uuid)
returns public.risk_classes
language sql
stable
security definer
set search_path = ''
as $$
  select r.* from public.risk_classes r
   where r.user_id = p_user
     and private.risk_row_in_force(r.id, r.needs_approval)
   order by r.set_at desc, r.id desc
   limit 1;
$$;
revoke all on function private.risk_latest(uuid) from public, anon, authenticated;

create or replace function public.override_risk_class(
  p_user uuid,
  p_class text,
  p_reason text,
  p_review_due_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  cur public.risk_classes;
  lowers boolean;
  row_id uuid;
begin
  if not private.aml_staff(me) then
    raise exception 'Staff only.' using errcode = '42501';
  end if;
  if p_user is null or not exists (select 1 from auth.users u where u.id = p_user) then
    raise exception 'That person was not found.' using errcode = '22023';
  end if;
  if p_review_due_at is null
     or p_review_due_at < now() + interval '1 day'
     or p_review_due_at > now() + interval '3 years 1 day' then
    raise exception 'The next review must fall between tomorrow and three years from now.' using errcode = '22023';
  end if;
  cur := private.risk_latest(p_user);
  lowers := cur.id is not null and private.risk_rank(p_class) < private.risk_rank(cur.risk_class);

  insert into public.risk_classes (user_id, risk_class, factors, reasons, source, reason, set_by, review_due_at, needs_approval)
  values (p_user, p_class, public.risk_factors_for(p_user), '{staff_override}', 'override',
          btrim(coalesce(p_reason, '')), me, p_review_due_at, lowers)
  returning id into row_id;
  if p_class = 'high' then
    perform private.risk_open_edd(p_user, row_id);
  end if;
  return row_id;
end;
$$;
revoke all on function public.override_risk_class(uuid, text, text, timestamptz) from public, anon;
grant execute on function public.override_risk_class(uuid, text, text, timestamptz) to authenticated;

create or replace function public.approve_risk_override(p_row uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  row_id uuid;
begin
  if not private.aml_staff(me) then
    raise exception 'Staff only.' using errcode = '42501';
  end if;
  if exists (select 1 from public.risk_override_approvals a where a.risk_class_id = p_row) then
    raise exception 'This is already approved.' using errcode = 'RM175';
  end if;
  insert into public.risk_override_approvals (risk_class_id, approved_by)
  values (p_row, me)
  returning id into row_id;
  return row_id;
end;
$$;
revoke all on function public.approve_risk_override(uuid) from public, anon;
grant execute on function public.approve_risk_override(uuid) to authenticated;

/* ------------------------------------------------------------------------ */
/* 8 and 9. The gate test, and reopening.                                   */
/* ------------------------------------------------------------------------ */

create or replace function private.edd_clear_for(p_user uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  cur public.risk_classes;
  since timestamptz;
begin
  if p_user is null then
    return true;
  end if;
  cur := private.risk_latest(p_user);
  if cur.id is null or cur.risk_class <> 'high' then
    return true;
  end if;
  /* The start of the current run of high, over the rows in force. */
  select min(r.set_at) into since
    from public.risk_classes r
   where r.user_id = p_user
     and private.risk_row_in_force(r.id, r.needs_approval)
     and r.set_at > coalesce((
       select max(x.set_at) from public.risk_classes x
        where x.user_id = p_user and x.risk_class <> 'high'
          and private.risk_row_in_force(x.id, x.needs_approval)
     ), '-infinity'::timestamptz);
  /* A review staff reopened shuts the gate until it is settled again. */
  if exists (select 1 from public.edd_reviews v
              where v.user_id = p_user and v.scuml_item = 15 and v.reason = 'reopened'
                and not private.edd_review_settled(v.id)) then
    return false;
  end if;
  return exists (
    select 1
      from public.edd_reviews v
      join public.edd_decisions d on d.review_id = v.id
      join public.edd_approvals a on a.decision_id = d.id
     where v.user_id = p_user
       and v.scuml_item = 15
       and v.raised_at >= since
       and d.outcome = 'cleared'
       and a.approved_at >= since
  );
end;
$$;
revoke all on function private.edd_clear_for(uuid) from public, anon, authenticated;

create or replace function public.reopen_edd_review(p_user uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  row_id uuid;
begin
  if not private.aml_staff(me) then
    raise exception 'Staff only.' using errcode = '42501';
  end if;
  if p_user is null or not exists (select 1 from auth.users u where u.id = p_user) then
    raise exception 'That person was not found.' using errcode = '22023';
  end if;
  if exists (select 1 from public.edd_reviews v
              where v.user_id = p_user and v.scuml_item = 15 and v.reason = 'reopened'
                and not private.edd_review_settled(v.id)) then
    raise exception 'A reopened review is already waiting for this person.' using errcode = 'RM175';
  end if;
  insert into public.edd_reviews (user_id, scuml_item, reason, source_table, source_id)
  values (p_user, 15, 'reopened', 'edd_reopen', gen_random_uuid())
  returning id into row_id;
  return row_id;
end;
$$;
revoke all on function public.reopen_edd_review(uuid) from public, anon;
grant execute on function public.reopen_edd_review(uuid) to authenticated;

/* ------------------------------------------------------------------------ */
/* 5. The gate: listers are refused, members raise a review.               */
/* ------------------------------------------------------------------------ */

create or replace function private.edd_gate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
begin
  if tg_table_name = 'listings' then
    if new.status::text <> 'PUBLISHED' or new.is_demo then
      return new;
    end if;
    if tg_op = 'UPDATE' and old.status::text = 'PUBLISHED' then
      return new;
    end if;
    select a.user_id into owner from public.agents a where a.id = new.agent_id;
  else
    if tg_op = 'UPDATE'
       and new.account_number is not distinct from old.account_number
       and new.bank_code is not distinct from old.bank_code then
      return new;
    end if;
    if tg_table_name = 'bank_accounts' then
      owner := new.user_id;
      if not exists (select 1 from public.agents a where a.user_id = owner) then
        /* A member: rule-derived risk never blocks their money. Raise a review
           and let the account through; staff place a hold if one is needed. */
        if not private.edd_clear_for(owner) then
          insert into public.edd_reviews (user_id, scuml_item, reason, source_table, source_id)
          values (owner, 15, 'member_account', 'bank_accounts', new.id)
          on conflict (scuml_item, source_table, source_id, user_id) do nothing;
        end if;
        return new;
      end if;
    else
      select a.user_id into owner from public.agents a where a.id = new.agent_id;
    end if;
  end if;

  if not private.edd_clear_for(owner) then
    if tg_table_name = 'listings' then
      raise exception 'This listing needs a check by our team before it can go live. We will be in touch.'
        using errcode = 'RM175';
    end if;
    raise exception 'This account needs a check by our team before a payout account can be added. We will be in touch.'
      using errcode = 'RM175';
  end if;
  return new;
end;
$$;
revoke all on function private.edd_gate() from public, anon, authenticated;

/* ------------------------------------------------------------------------ */
/* 7. Volume and population.                                                */
/* ------------------------------------------------------------------------ */

create or replace function public.risk_factors_for(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  mine uuid[];
  lister boolean;
  rung int;
  volume bigint;
  open_reports int;
  fraud int;
  extra int;
begin
  /* Example listers never feed a real aggregate. */
  select array_agg(a.id), max(a.verification_tier)
    into mine, rung
    from public.agents a
   where a.user_id = p_user and not a.is_demo;
  lister := mine is not null;
  mine := coalesce(mine, '{}');

  /* Successful payments on either side, including move-in charges where the
     person is the rent payment's tenant or lister. */
  select coalesce(sum(abs(t.amount_minor)), 0) into volume
    from public.transactions t
    join public.bookings b on b.id = t.booking_id
    left join public.listings l on l.id = b.listing_id
   where t.status::text = 'SUCCESSFUL'
     and t.created_at > now() - interval '90 days'
     and (b.guest_id = p_user
          or l.agent_id = any (mine)
          or exists (select 1 from public.rent_payments rp
                      where rp.booking_id = b.id and (rp.tenant_id = p_user or rp.lister_id = p_user)));
  volume := volume + coalesce((
    select sum(abs(e.amount_minor)) from public.escrows e
     where e.funded_at > now() - interval '90 days'
       and (e.payer_id = p_user or e.payee_id = p_user)
  ), 0);
  volume := volume + coalesce((
    select sum(abs(we.amount_minor))
      from public.wallet_entries we
      join public.wallets w on w.id = we.wallet_id
     where w.user_id = p_user
       and we.status::text = 'COMPLETED'
       and we.created_at > now() - interval '90 days'
  ), 0);

  with targets as (
    select r.status::text as status, r.category
      from public.reports r
     where (r.target_type in ('user', 'profile') and r.target_id = p_user::text)
        or (r.target_type = 'agent' and r.target_id in (select m::text from unnest(mine) m))
        or (r.target_type = 'listing' and r.target_id in (
              select l.id::text from public.listings l where l.agent_id = any (mine)))
  )
  select count(*) filter (where t.status in ('open', 'reviewing')),
         count(*) filter (where t.status = 'resolved' and t.category in ('scam', 'off_platform_payment'))
    into open_reports, fraud
    from targets t;

  if exists (select 1 from information_schema.columns c
              where c.table_schema = 'public' and c.table_name = 'agent_suspensions'
                and c.column_name = 'fraud_upheld_at') then
    execute 'select count(*) from public.agent_suspensions s where s.agent_id = any ($1) and s.fraud_upheld_at is not null'
      into extra using mine;
    fraud := fraud + coalesce(extra, 0);
  end if;

  return jsonb_build_object(
    'pep', private.is_pep(p_user),
    'sanctions_hit', private.sanctions_hit_for(p_user),
    'lister', lister,
    'identity_rung', rung,
    'volume_90d_minor', volume,
    'open_reports', open_reports,
    'upheld_fraud', fraud
  );
end;
$$;
revoke all on function public.risk_factors_for(uuid) from public, anon, authenticated;
grant execute on function public.risk_factors_for(uuid) to service_role;

create or replace function public.risk_people_due(p_limit int)
returns table (user_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  with people as (
    select a.user_id as uid from public.agents a where not a.is_demo
    union select d.user_id from public.pep_declarations d
    union select f.user_id from public.pep_flags f
    union select b.guest_id from public.transactions t join public.bookings b on b.id = t.booking_id
           where t.status::text = 'SUCCESSFUL' and t.created_at > now() - interval '90 days'
    union select rp.tenant_id from public.rent_payments rp
            join public.transactions t on t.booking_id = rp.booking_id
           where t.status::text = 'SUCCESSFUL' and t.created_at > now() - interval '90 days'
    union select rp.lister_id from public.rent_payments rp
            join public.transactions t on t.booking_id = rp.booking_id
           where t.status::text = 'SUCCESSFUL' and t.created_at > now() - interval '90 days'
    union select e.payer_id from public.escrows e where e.funded_at > now() - interval '90 days'
    union select e.payee_id from public.escrows e where e.funded_at > now() - interval '90 days'
    union select w.user_id from public.wallet_entries we join public.wallets w on w.id = we.wallet_id
           where we.created_at > now() - interval '90 days'
  )
  select p.uid
    from people p
    left join lateral (
      select r.set_at, r.review_due_at, r.source from public.risk_classes r
       where r.user_id = p.uid and private.risk_row_in_force(r.id, r.needs_approval)
       order by r.set_at desc, r.id desc limit 1
    ) cur on true
   where p.uid is not null
     and exists (select 1 from auth.users u where u.id = p.uid)
     and (
       cur.set_at is null
       or cur.review_due_at <= now()
       /* An override is re-derived every run, so a higher derived class lands. */
       or cur.source = 'override'
       or exists (select 1 from public.pep_declarations d where d.user_id = p.uid and d.declared_at > cur.set_at)
       or exists (select 1 from public.pep_flags f where f.user_id = p.uid and f.set_at > cur.set_at)
       or exists (select 1 from public.pep_clear_approvals c join public.pep_flags f on f.id = c.flag_id
                   where f.user_id = p.uid and c.approved_at > cur.set_at)
       or exists (select 1 from public.reports r
                   where r.target_type in ('user', 'profile') and r.target_id = p.uid::text
                     and greatest(r.created_at, coalesce(r.resolved_at, r.created_at)) > cur.set_at)
     )
   order by cur.set_at nulls first
   limit greatest(1, least(coalesce(p_limit, 100), 500));
$$;
revoke all on function public.risk_people_due(int) from public, anon, authenticated;
grant execute on function public.risk_people_due(int) to service_role;

/* ------------------------------------------------------------------------ */
/* The two desks, over what is in force, with what waits on a second person. */
/* ------------------------------------------------------------------------ */

create or replace function public.pep_desk()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.aml_staff(auth.uid()) then
    raise exception 'Staff only.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'open', coalesce((
      select jsonb_agg(private.edd_review_json(r) order by r.raised_at)
        from public.edd_reviews r
       where r.scuml_item = 20 and not private.edd_review_settled(r.id)
    ), '[]'::jsonb),
    'settled', coalesce((
      select jsonb_agg(x.j order by x.ts desc) from (
        select private.edd_review_json(r) as j, r.raised_at as ts
          from public.edd_reviews r
         where r.scuml_item = 20 and private.edd_review_settled(r.id)
         order by r.raised_at desc
         limit 20
      ) x
    ), '[]'::jsonb),
    'people', coalesce((
      select jsonb_agg(p.j order by p.ts desc) from (
        select jsonb_build_object(
                 'user_id', w.user_id,
                 'name', private.aml_person_name(w.user_id),
                 'is_pep', true,
                 'relation', w.relation,
                 'role', w.role,
                 'source', w.source,
                 'at', w.ts
               ) as j, w.ts
          from (
            select distinct on (u.user_id) u.*
              from (
                select d.user_id, d.relation, d.role, 'declared'::text as source, d.declared_at as ts
                  from public.pep_declarations d where d.user_id is not null and d.is_pep
                union all
                select f.user_id, f.relation, f.role, 'staff'::text, f.set_at
                  from public.pep_flags f where f.user_id is not null and f.flagged
              ) u
             where private.is_pep(u.user_id)
             order by u.user_id, u.ts desc
          ) w
         order by w.ts desc
         limit 100
      ) p
    ), '[]'::jsonb),
    'pending_clears', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', f.id,
               'user_id', f.user_id,
               'name', private.aml_person_name(f.user_id),
               'note', f.note,
               'set_by', f.set_by,
               'set_by_name', private.aml_person_name(f.set_by),
               'set_at', f.set_at
             ) order by f.set_at)
        from public.pep_flags f
       where not f.flagged
         and f.user_id is not null
         and not exists (select 1 from public.pep_clear_approvals c where c.flag_id = f.id)
    ), '[]'::jsonb),
    'unasked', (
      select count(distinct a.user_id)
        from public.agents a
       where not a.is_demo
         and not exists (select 1 from public.pep_declarations d where d.user_id = a.user_id)
    )
  );
end;
$$;
revoke all on function public.pep_desk() from public, anon;
grant execute on function public.pep_desk() to authenticated;

create or replace function public.risk_desk()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.aml_staff(auth.uid()) then
    raise exception 'Staff only.' using errcode = '42501';
  end if;
  return (
    with cur as (
      select distinct on (r.user_id) r.*
        from public.risk_classes r
       where r.user_id is not null
         and private.risk_row_in_force(r.id, r.needs_approval)
       order by r.user_id, r.set_at desc, r.id desc
    )
    select jsonb_build_object(
      'counts', jsonb_build_object(
        'high',   (select count(*) from cur where cur.risk_class = 'high'),
        'medium', (select count(*) from cur where cur.risk_class = 'medium'),
        'low',    (select count(*) from cur where cur.risk_class = 'low'),
        'due',    (select count(*) from cur where cur.review_due_at <= now())
      ),
      'people', coalesce((
        select jsonb_agg(x.j order by x.rank desc, x.due) from (
          select jsonb_build_object(
                   'user_id', cur.user_id,
                   'name', private.aml_person_name(cur.user_id),
                   'class', cur.risk_class,
                   'source', cur.source,
                   'reason', cur.reason,
                   'reasons', to_jsonb(cur.reasons),
                   'factors', cur.factors,
                   'set_at', cur.set_at,
                   'set_by_name', case when cur.set_by is null then null else private.aml_person_name(cur.set_by) end,
                   'review_due_at', cur.review_due_at,
                   'edd_clear', private.edd_clear_for(cur.user_id)
                 ) as j,
                 private.risk_rank(cur.risk_class) as rank,
                 cur.review_due_at as due
            from cur
           where cur.risk_class in ('high', 'medium') or cur.review_due_at <= now()
           order by private.risk_rank(cur.risk_class) desc, cur.review_due_at
           limit 200
        ) x
      ), '[]'::jsonb),
      'open', coalesce((
        select jsonb_agg(private.edd_review_json(v) order by v.raised_at)
          from public.edd_reviews v
         where v.scuml_item = 15 and not private.edd_review_settled(v.id)
      ), '[]'::jsonb),
      'pending', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', r.id,
                 'user_id', r.user_id,
                 'name', private.aml_person_name(r.user_id),
                 'from', (select c.risk_class from cur c where c.user_id = r.user_id),
                 'to', r.risk_class,
                 'reason', r.reason,
                 'set_by', r.set_by,
                 'set_by_name', private.aml_person_name(r.set_by),
                 'set_at', r.set_at
               ) order by r.set_at)
          from public.risk_classes r
         where r.needs_approval
           and r.user_id is not null
           and not exists (select 1 from public.risk_override_approvals a where a.risk_class_id = r.id)
      ), '[]'::jsonb)
    )
  );
end;
$$;
revoke all on function public.risk_desk() from public, anon;
grant execute on function public.risk_desk() to authenticated;
