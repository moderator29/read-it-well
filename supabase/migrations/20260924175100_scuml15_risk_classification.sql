/*
 * SCUML item 15. EVERY CUSTOMER CLASSIFIED HIGH, MEDIUM OR LOW RISK, AND DUE
 * DILIGENCE TO MATCH.
 *
 * SCUML-EFCC AML/CFT Compliance Checklist for DNFBPs, item 15; Money
 * Laundering (Prevention and Prohibition) Act 2022. A warning, then ₦500,000.
 * Needs 20260924175000 (SCUML item 20) for is_pep and the EDD review tables.
 *
 * WHAT THIS BUILDS.
 *
 *   risk_classes          the history: one dated row each time a person's
 *                         class is set, derived or overridden. Append only.
 *                         The latest row is the person's class.
 *   risk_factors_for      the documented factors, read for one person: PEP,
 *                         sanctions hit, lister role, identity rung, volume
 *                         over 90 days, open reports, upheld fraud.
 *   record_derived_risk_class
 *                         the job's write. THE RULES ARE NOT HERE: they are one
 *                         pure function, apps/web/src/lib/compliance/risk-rules.ts
 *                         (classifyRisk, with its tests), which the job and the
 *                         staff actions call and then hand the answer to this.
 *   override_risk_class   staff set the class by hand, with a reason.
 *   the gates             a high-risk person needs a staff EDD review, decided
 *                         and approved by two people (edd_reviews, item 15),
 *                         before a listing of theirs publishes or a payout
 *                         account is added. Additive BEFORE triggers that only
 *                         refuse; nothing else about publishing or payouts
 *                         changes, and an example listing is never gated.
 *
 * THE SANCTIONS HOOK. Builder 6 owns sanctions screening (SCUML items 8 and 9).
 * private.sanctions_hit_for answers null ("not screened") until their tables
 * land; they replace its body with a read of their hits. A null never counts
 * as a hit and never as clear: the factor is stored as unknown.
 *
 * NEVER SHOWN TO THE PERSON, AND NOT A PUBLIC SCORE (V-21 still stands).
 * Every table is born locked; the desk read answers staff only; the factor and
 * write functions answer the service role only. A gate's refusal says a check
 * is needed and nothing about why.
 *
 * KEPT FIVE YEARS, APPEND ONLY, as item 20's records (docs/RETENTION_SCHEDULE.md
 * section 3.3a).
 */

/* ------------------------------------------------------------------------ */
/* The sanctions hook (builder 6 replaces the body).                        */
/* ------------------------------------------------------------------------ */

create or replace function private.sanctions_hit_for(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select null::boolean;
$$;
revoke all on function private.sanctions_hit_for(uuid) from public, anon, authenticated;
comment on function private.sanctions_hit_for(uuid) is
  'SCUML items 8, 9 and 15: true when a sanctions match on this person is open or confirmed, false when screened clear, null when not screened. A hook: builder 6 replaces this body when the screening tables land.';

/* ------------------------------------------------------------------------ */
/* The history.                                                             */
/* ------------------------------------------------------------------------ */

create table if not exists public.risk_classes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete set null,
  risk_class    text not null check (risk_class in ('high', 'medium', 'low')),
  factors       jsonb not null,
  reasons       text[] not null default '{}',
  source        text not null check (source in ('derived', 'override')),
  reason        text check (reason is null or char_length(btrim(reason)) between 10 and 600),
  set_by        uuid references auth.users(id) on delete set null,
  set_at        timestamptz not null default clock_timestamp(),
  review_due_at timestamptz not null,
  constraint risk_classes_override_has_reason check (source = 'derived' or reason is not null),
  constraint risk_classes_due_after_set check (review_due_at > set_at)
);
create index if not exists risk_classes_user_idx on public.risk_classes (user_id, set_at desc);
comment on table public.risk_classes is
  'SCUML item 15: each person''s risk class, dated, as an append-only history; the latest row is the class. Staff only, never shown to the person, not a public score (V-21). Kept five years.';

alter table public.risk_classes enable row level security;
revoke all on public.risk_classes from anon, authenticated;

drop trigger if exists risk_classes_append_only on public.risk_classes;
create trigger risk_classes_append_only
  before update or delete on public.risk_classes
  for each row execute function private.aml_append_only('user_id', 'set_by');

create or replace function private.risk_latest(p_user uuid)
returns public.risk_classes
language sql
stable
security definer
set search_path = ''
as $$
  select r.* from public.risk_classes r
   where r.user_id = p_user
   order by r.set_at desc, r.id desc
   limit 1;
$$;
revoke all on function private.risk_latest(uuid) from public, anon, authenticated;

create or replace function private.risk_rank(p_class text)
returns int
language sql
immutable
set search_path = ''
as $$
  select case p_class when 'high' then 3 when 'medium' then 2 when 'low' then 1 else 0 end;
$$;
revoke all on function private.risk_rank(text) from public, anon, authenticated;

/* ------------------------------------------------------------------------ */
/* The factors.                                                             */
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

  select coalesce(sum(t.amount_minor), 0) into volume
    from public.transactions t
    join public.bookings b on b.id = t.booking_id
    left join public.listings l on l.id = b.listing_id
   where t.status::text = 'SUCCESSFUL'
     and t.created_at > now() - interval '90 days'
     and (b.guest_id = p_user or l.agent_id = any (mine));
  volume := volume + coalesce((
    select sum(e.amount_minor) from public.escrows e
     where e.funded_at > now() - interval '90 days'
       and (e.payer_id = p_user or e.payee_id = p_user)
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

  /* A stop a senior reviewer upheld as fraud (V-90), where that column exists. */
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

/*
 * Who the job should classify next: every lister, every PEP record, everyone
 * who moved money in the last 90 days, with no class yet, a review that has
 * come due, or a PEP record or report newer than their class.
 */
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
    union select e.payer_id from public.escrows e where e.funded_at > now() - interval '90 days'
    union select e.payee_id from public.escrows e where e.funded_at > now() - interval '90 days'
  )
  select p.uid
    from people p
    left join lateral (
      select r.set_at, r.review_due_at from public.risk_classes r
       where r.user_id = p.uid order by r.set_at desc, r.id desc limit 1
    ) cur on true
   where p.uid is not null
     and exists (select 1 from auth.users u where u.id = p.uid)
     and (
       cur.set_at is null
       or cur.review_due_at <= now()
       or exists (select 1 from public.pep_declarations d where d.user_id = p.uid and d.declared_at > cur.set_at)
       or exists (select 1 from public.pep_flags f where f.user_id = p.uid and f.set_at > cur.set_at)
       or exists (select 1 from public.reports r
                   where r.target_type in ('user', 'profile') and r.target_id = p.uid::text
                     and greatest(r.created_at, coalesce(r.resolved_at, r.created_at)) > cur.set_at)
     )
   order by cur.set_at nulls first
   limit greatest(1, least(coalesce(p_limit, 100), 500));
$$;
revoke all on function public.risk_people_due(int) from public, anon, authenticated;
grant execute on function public.risk_people_due(int) to service_role;

/* A high class opens an item 15 EDD review. */
create or replace function private.risk_open_edd(p_user uuid, p_row uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.edd_reviews (user_id, scuml_item, reason, source_table, source_id)
  values (p_user, 15, 'high_risk', 'risk_classes', p_row)
  on conflict (scuml_item, source_table, source_id, user_id) do nothing;
$$;
revoke all on function private.risk_open_edd(uuid, uuid) from public, anon, authenticated;

/*
 * The job's write. Returns what it did: 'written', 'unchanged' (same class,
 * review not yet due) or 'override_stands' (staff set a class that is still in
 * force and the derived one is not higher).
 */
create or replace function public.record_derived_risk_class(
  p_user uuid,
  p_class text,
  p_factors jsonb,
  p_reasons text[],
  p_review_due_at timestamptz
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  cur public.risk_classes;
  row_id uuid;
begin
  if p_user is null or not exists (select 1 from auth.users u where u.id = p_user) then
    raise exception 'That person was not found.' using errcode = '22023';
  end if;
  cur := private.risk_latest(p_user);
  if cur.id is not null and cur.review_due_at > now() then
    if cur.source = 'override' and private.risk_rank(p_class) <= private.risk_rank(cur.risk_class) then
      return 'override_stands';
    end if;
    if cur.source = 'derived' and cur.risk_class = p_class then
      return 'unchanged';
    end if;
  end if;

  insert into public.risk_classes (user_id, risk_class, factors, reasons, source, review_due_at)
  values (p_user, p_class, coalesce(p_factors, '{}'::jsonb), coalesce(p_reasons, '{}'), 'derived', p_review_due_at)
  returning id into row_id;
  if p_class = 'high' then
    perform private.risk_open_edd(p_user, row_id);
  end if;
  return 'written';
end;
$$;
revoke all on function public.record_derived_risk_class(uuid, text, jsonb, text[], timestamptz) from public, anon, authenticated;
grant execute on function public.record_derived_risk_class(uuid, text, jsonb, text[], timestamptz) to service_role;

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
  insert into public.risk_classes (user_id, risk_class, factors, reasons, source, reason, set_by, review_due_at)
  values (p_user, p_class, public.risk_factors_for(p_user), '{staff_override}', 'override',
          btrim(coalesce(p_reason, '')), me, p_review_due_at)
  returning id into row_id;
  if p_class = 'high' then
    perform private.risk_open_edd(p_user, row_id);
  end if;
  return row_id;
end;
$$;
revoke all on function public.override_risk_class(uuid, text, text, timestamptz) from public, anon;
grant execute on function public.override_risk_class(uuid, text, text, timestamptz) to authenticated;

/* ------------------------------------------------------------------------ */
/* The gates.                                                               */
/* ------------------------------------------------------------------------ */

/*
 * Clear unless the person is high risk now and no item 15 EDD review was
 * decided "cleared" and approved by a second person since they became high.
 * "Since they became high" is the start of the current run of high rows, so a
 * periodic re-review of a high person does not shut a gate staff opened.
 */
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
  select min(r.set_at) into since
    from public.risk_classes r
   where r.user_id = p_user
     and r.set_at > coalesce((
       select max(x.set_at) from public.risk_classes x
        where x.user_id = p_user and x.risk_class <> 'high'
     ), '-infinity'::timestamptz);
  return exists (
    select 1
      from public.edd_reviews v
      join public.edd_decisions d on d.review_id = v.id
      join public.edd_approvals a on a.decision_id = d.id
     where v.user_id = p_user
       and v.scuml_item = 15
       and d.outcome = 'cleared'
       and a.approved_at >= since
  );
end;
$$;
revoke all on function private.edd_clear_for(uuid) from public, anon, authenticated;

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

drop trigger if exists listings_zz_scuml15_edd_gate on public.listings;
create trigger listings_zz_scuml15_edd_gate
  before insert or update of status on public.listings
  for each row execute function private.edd_gate();
drop trigger if exists payout_accounts_zz_scuml15_edd_gate on public.payout_accounts;
create trigger payout_accounts_zz_scuml15_edd_gate
  before insert or update of account_number, bank_code on public.payout_accounts
  for each row execute function private.edd_gate();
drop trigger if exists bank_accounts_zz_scuml15_edd_gate on public.bank_accounts;
create trigger bank_accounts_zz_scuml15_edd_gate
  before insert or update of account_number, bank_code on public.bank_accounts
  for each row execute function private.edd_gate();

/* ------------------------------------------------------------------------ */
/* The item 15 lane.                                                        */
/* ------------------------------------------------------------------------ */

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
      ), '[]'::jsonb)
    )
  );
end;
$$;
revoke all on function public.risk_desk() from public, anon;
grant execute on function public.risk_desk() to authenticated;
