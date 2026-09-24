/*
 * SCUML item 20. POLITICALLY EXPOSED PERSONS: IDENTIFIED, MONITORED, AND
 * THEIR TRANSACTIONS REVIEWED WITH ENHANCED DUE DILIGENCE.
 *
 * SCUML-EFCC AML/CFT Compliance Checklist for DNFBPs, item 20; Money
 * Laundering (Prevention and Prohibition) Act 2022. Fine ₦300,000, rising
 * to ₦1,000,000 beyond two years.
 *
 * WHAT THIS BUILDS.
 *
 *   pep_declarations  the lister's own answer, dated: are you, a family member
 *                     or a close associate a politically exposed person, and
 *                     in what role. Asked at lister verification and at payout
 *                     account setup. A member looking for a home is never
 *                     asked: answer_pep_question refuses anyone without an
 *                     agents row.
 *   pep_flags         staff's own record of a person, set or cleared, with a
 *                     note. The latest of a declaration or a flag decides.
 *   edd_reviews       the compliance lane's work items. Every transaction by a
 *                     PEP (a successful payment, an escrow, a wallet entry, a
 *                     rent payment) raises one, as does a yes declaration or a
 *                     staff flag. SCUML item 15 raises its own (high risk).
 *   edd_decisions     staff record the source of funds and an outcome.
 *   edd_approvals     a SECOND member of staff approves. The approver may not
 *                     be the decider (SCUML item 19, two-person rule).
 *
 * MONEY CODE IS NEVER BLOCKED. The watchers are AFTER triggers that only
 * enqueue, each inside its own exception block, so a failure to raise a review
 * is a warning in the log and never a failed payment. Money correctness
 * belongs to the audit. Nothing here stops money: a stop is a staff-placed
 * account_money_holds row (V-19).
 *
 * NOTHING IS PUBLIC. Every table is born locked (RLS on, no policy, no grant
 * to anon or authenticated). Reads go through definer functions that answer
 * staff only. The person is told nothing that would tip them off: the one
 * thing they can read back is the date they last answered the question.
 *
 * KEPT FIVE YEARS, APPEND ONLY. No row is edited or deleted
 * (private.aml_append_only). Deleting an account sets the person's id to null
 * through the foreign key, which is the one change the guard allows: the
 * person is anonymised and the record stays. See docs/RETENTION_SCHEDULE.md
 * section 3.3a.
 */

/* ------------------------------------------------------------------------ */
/* Shared: who is staff, and the append-only guard.                         */
/* ------------------------------------------------------------------------ */

create or replace function private.aml_staff(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user is not null and exists (
    select 1 from public.user_roles r
     where r.user_id = p_user
       and r.role in ('admin'::public.app_role, 'super_admin'::public.app_role)
  );
$$;
revoke all on function private.aml_staff(uuid) from public, anon, authenticated;

comment on function private.aml_staff(uuid) is
  'SCUML items 20 and 15: admin or super_admin. The one staff test the compliance functions use.';

/*
 * TG_ARGV names the person columns that deletion may clear. An UPDATE is
 * allowed only when every other column is unchanged and each named column
 * that changed became null. Anything else, and every DELETE, is refused.
 */
create or replace function private.aml_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  o jsonb;
  n jsonb;
  k text;
begin
  if tg_op = 'DELETE' then
    raise exception 'This is a compliance record (SCUML). It is kept for five years and is never deleted.'
      using errcode = 'RM175';
  end if;
  o := to_jsonb(old);
  n := to_jsonb(new);
  foreach k in array tg_argv loop
    if n -> k = 'null'::jsonb then
      o := o - k;
      n := n - k;
    end if;
  end loop;
  if o is distinct from n then
    raise exception 'This is a compliance record (SCUML). It is never edited; record a new row instead.'
      using errcode = 'RM175';
  end if;
  return new;
end;
$$;
revoke all on function private.aml_append_only() from public, anon, authenticated;

/* ------------------------------------------------------------------------ */
/* The records.                                                             */
/* ------------------------------------------------------------------------ */

create table if not exists public.pep_declarations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  is_pep      boolean not null,
  relation    text check (relation in ('self', 'family', 'associate')),
  role        text check (role is null or char_length(btrim(role)) between 2 and 200),
  asked_at    text not null check (asked_at in ('verification', 'payout')),
  declared_at timestamptz not null default clock_timestamp(),
  constraint pep_declarations_role_with_yes check (
    (is_pep and relation is not null and role is not null)
    or (not is_pep and relation is null and role is null)
  )
);
create index if not exists pep_declarations_user_idx on public.pep_declarations (user_id, declared_at desc);
comment on table public.pep_declarations is
  'SCUML item 20: a lister''s own answer to the PEP question, dated. Staff only; append only; kept five years (docs/RETENTION_SCHEDULE.md 3.3a).';

create table if not exists public.pep_flags (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid references auth.users(id) on delete set null,
  flagged  boolean not null,
  relation text check (relation in ('self', 'family', 'associate')),
  role     text check (role is null or char_length(btrim(role)) between 2 and 200),
  note     text not null check (char_length(btrim(note)) between 2 and 600),
  set_by   uuid references auth.users(id) on delete set null,
  set_at   timestamptz not null default clock_timestamp()
);
create index if not exists pep_flags_user_idx on public.pep_flags (user_id, set_at desc);
comment on table public.pep_flags is
  'SCUML item 20: staff''s own PEP record of a person, set or cleared, dated. Staff only; append only; kept five years.';

create table if not exists public.edd_reviews (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete set null,
  scuml_item   smallint not null check (scuml_item in (15, 20)),
  reason       text not null check (reason in ('transaction', 'declaration', 'staff_flag', 'high_risk')),
  source_table text not null,
  source_id    uuid not null,
  amount_minor bigint check (amount_minor is null or amount_minor >= 0),
  raised_at    timestamptz not null default clock_timestamp()
);
/* One review per person per source row: a payment that is updated twice is
   still one transaction. */
create unique index if not exists edd_reviews_one_per_source
  on public.edd_reviews (scuml_item, source_table, source_id, user_id);
create index if not exists edd_reviews_user_idx on public.edd_reviews (user_id, raised_at desc);
comment on table public.edd_reviews is
  'SCUML items 20 and 15: enhanced due diligence work items. Raised by AFTER triggers and definer functions only. Staff only; append only; kept five years.';

create table if not exists public.edd_decisions (
  id              uuid primary key default gen_random_uuid(),
  review_id       uuid not null references public.edd_reviews(id) on delete restrict,
  source_of_funds text not null check (char_length(btrim(source_of_funds)) between 2 and 1000),
  outcome         text not null check (outcome in ('cleared', 'refer')),
  note            text check (note is null or char_length(note) <= 1000),
  decided_by      uuid references auth.users(id) on delete set null,
  decided_at      timestamptz not null default clock_timestamp()
);
create index if not exists edd_decisions_review_idx on public.edd_decisions (review_id, decided_at desc);
comment on table public.edd_decisions is
  'SCUML items 20 and 15: the source of funds staff recorded and their outcome. Takes effect only when a second person approves (edd_approvals).';

create table if not exists public.edd_approvals (
  id          uuid primary key default gen_random_uuid(),
  decision_id uuid not null unique references public.edd_decisions(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz not null default clock_timestamp()
);
comment on table public.edd_approvals is
  'SCUML items 20, 15 and 19: the second person''s approval of an EDD decision. The approver is never the decider.';

/* Born locked. */
alter table public.pep_declarations enable row level security;
alter table public.pep_flags        enable row level security;
alter table public.edd_reviews      enable row level security;
alter table public.edd_decisions    enable row level security;
alter table public.edd_approvals    enable row level security;
revoke all on public.pep_declarations, public.pep_flags, public.edd_reviews,
              public.edd_decisions, public.edd_approvals
  from anon, authenticated;

drop trigger if exists pep_declarations_append_only on public.pep_declarations;
create trigger pep_declarations_append_only
  before update or delete on public.pep_declarations
  for each row execute function private.aml_append_only('user_id');
drop trigger if exists pep_flags_append_only on public.pep_flags;
create trigger pep_flags_append_only
  before update or delete on public.pep_flags
  for each row execute function private.aml_append_only('user_id', 'set_by');
drop trigger if exists edd_reviews_append_only on public.edd_reviews;
create trigger edd_reviews_append_only
  before update or delete on public.edd_reviews
  for each row execute function private.aml_append_only('user_id');
drop trigger if exists edd_decisions_append_only on public.edd_decisions;
create trigger edd_decisions_append_only
  before update or delete on public.edd_decisions
  for each row execute function private.aml_append_only('decided_by');
drop trigger if exists edd_approvals_append_only on public.edd_approvals;
create trigger edd_approvals_append_only
  before update or delete on public.edd_approvals
  for each row execute function private.aml_append_only('approved_by');

/* The two-person rule, in the table, so no code path can skip it. */
create or replace function private.edd_approver_is_not_the_decider()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  decider uuid;
begin
  select d.decided_by into decider from public.edd_decisions d where d.id = new.decision_id;
  if new.approved_by is null or not private.aml_staff(new.approved_by) then
    raise exception 'Only staff can approve a due diligence decision.' using errcode = '42501';
  end if;
  if decider is null or decider = new.approved_by then
    raise exception 'A second person must approve this. The person who decided cannot approve their own decision (SCUML item 19).'
      using errcode = 'RM175';
  end if;
  return new;
end;
$$;
revoke all on function private.edd_approver_is_not_the_decider() from public, anon, authenticated;

drop trigger if exists edd_approvals_two_people on public.edd_approvals;
create trigger edd_approvals_two_people
  before insert on public.edd_approvals
  for each row execute function private.edd_approver_is_not_the_decider();

/* ------------------------------------------------------------------------ */
/* Is this person a PEP: the latest word, the person's or staff's.          */
/* ------------------------------------------------------------------------ */

create or replace function private.is_pep(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select w.yes from (
      select d.is_pep as yes, d.declared_at as ts from public.pep_declarations d where d.user_id = p_user
      union all
      select f.flagged, f.set_at from public.pep_flags f where f.user_id = p_user
    ) w
    order by w.ts desc
    limit 1
  ), false);
$$;
revoke all on function private.is_pep(uuid) from public, anon, authenticated;

/* ------------------------------------------------------------------------ */
/* Enqueue only. Never raises into the caller.                              */
/* ------------------------------------------------------------------------ */

create or replace function private.pep_enqueue(p_user uuid, p_table text, p_id uuid, p_amount bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user is null or p_id is null or not private.is_pep(p_user) then
    return;
  end if;
  insert into public.edd_reviews (user_id, scuml_item, reason, source_table, source_id, amount_minor)
  values (p_user, 20, 'transaction', p_table, p_id, greatest(coalesce(p_amount, 0), 0))
  on conflict (scuml_item, source_table, source_id, user_id) do nothing;
end;
$$;
revoke all on function private.pep_enqueue(uuid, text, uuid, bigint) from public, anon, authenticated;

create or replace function private.pep_watch_money()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  a uuid;
  b uuid;
  amount bigint;
begin
  begin
    if tg_table_name = 'transactions' then
      if new.status::text <> 'SUCCESSFUL'
         or (tg_op = 'UPDATE' and old.status::text = 'SUCCESSFUL') then
        return null;
      end if;
      select bk.guest_id, ag.user_id into a, b
        from public.bookings bk
        left join public.listings l on l.id = bk.listing_id
        left join public.agents ag on ag.id = l.agent_id
       where bk.id = new.booking_id;
      amount := new.amount_minor;
    elsif tg_table_name = 'escrows' then
      a := new.payer_id;
      b := new.payee_id;
      amount := new.amount_minor;
    elsif tg_table_name = 'wallet_entries' then
      select w.user_id into a from public.wallets w where w.id = new.wallet_id;
      amount := new.amount_minor;
    elsif tg_table_name = 'rent_payments' then
      a := new.tenant_id;
      b := new.lister_id;
      amount := new.total_minor;
    else
      return null;
    end if;

    perform private.pep_enqueue(a, tg_table_name, new.id, amount);
    if b is distinct from a then
      perform private.pep_enqueue(b, tg_table_name, new.id, amount);
    end if;
  exception when others then
    raise warning 'SCUML item 20: no review was raised for % %: %', tg_table_name, new.id, sqlerrm;
  end;
  return null;
end;
$$;
revoke all on function private.pep_watch_money() from public, anon, authenticated;

drop trigger if exists transactions_zz_scuml20_pep_watch on public.transactions;
create trigger transactions_zz_scuml20_pep_watch
  after insert or update of status on public.transactions
  for each row execute function private.pep_watch_money();
drop trigger if exists escrows_zz_scuml20_pep_watch on public.escrows;
create trigger escrows_zz_scuml20_pep_watch
  after insert on public.escrows
  for each row execute function private.pep_watch_money();
drop trigger if exists wallet_entries_zz_scuml20_pep_watch on public.wallet_entries;
create trigger wallet_entries_zz_scuml20_pep_watch
  after insert on public.wallet_entries
  for each row execute function private.pep_watch_money();
drop trigger if exists rent_payments_zz_scuml20_pep_watch on public.rent_payments;
create trigger rent_payments_zz_scuml20_pep_watch
  after insert on public.rent_payments
  for each row execute function private.pep_watch_money();

/* ------------------------------------------------------------------------ */
/* The lister answers.                                                      */
/* ------------------------------------------------------------------------ */

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

  insert into public.pep_declarations (user_id, is_pep, relation, role, asked_at)
  values (
    me,
    p_is_pep,
    case when p_is_pep then p_relation end,
    case when p_is_pep then nullif(btrim(p_role), '') end,
    p_asked_at
  )
  returning id, declared_at into row_id, v_at;

  if p_is_pep then
    insert into public.edd_reviews (user_id, scuml_item, reason, source_table, source_id)
    values (me, 20, 'declaration', 'pep_declarations', row_id)
    on conflict (scuml_item, source_table, source_id, user_id) do nothing;
  end if;
  return v_at;
end;
$$;
revoke all on function public.answer_pep_question(boolean, text, text, text) from public, anon;
grant execute on function public.answer_pep_question(boolean, text, text, text) to authenticated;

/* The only thing the person reads back: when they last answered. */
create or replace function public.my_pep_answered_at()
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select max(d.declared_at) from public.pep_declarations d where d.user_id = auth.uid();
$$;
revoke all on function public.my_pep_answered_at() from public, anon;
grant execute on function public.my_pep_answered_at() to authenticated;

/* ------------------------------------------------------------------------ */
/* Staff: flag, decide, approve, read.                                      */
/* ------------------------------------------------------------------------ */

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
    coalesce(p_flagged, true),
    case when coalesce(p_flagged, true) then p_relation end,
    case when coalesce(p_flagged, true) then nullif(btrim(p_role), '') end,
    p_note,
    me
  )
  returning id into row_id;

  if coalesce(p_flagged, true) then
    insert into public.edd_reviews (user_id, scuml_item, reason, source_table, source_id)
    values (p_user, 20, 'staff_flag', 'pep_flags', row_id)
    on conflict (scuml_item, source_table, source_id, user_id) do nothing;
  end if;
  return row_id;
end;
$$;
revoke all on function public.flag_pep(uuid, boolean, text, text, text) from public, anon;
grant execute on function public.flag_pep(uuid, boolean, text, text, text) to authenticated;

/* Settled: the review's latest decision has its second person. */
create or replace function private.edd_review_settled(p_review uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.edd_decisions d
      join public.edd_approvals a on a.decision_id = d.id
     where d.review_id = p_review
  );
$$;
revoke all on function private.edd_review_settled(uuid) from public, anon, authenticated;

create or replace function public.decide_edd_review(
  p_review uuid,
  p_source_of_funds text,
  p_outcome text,
  p_note text
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
  if not exists (select 1 from public.edd_reviews r where r.id = p_review) then
    raise exception 'That review was not found.' using errcode = '22023';
  end if;
  if private.edd_review_settled(p_review) then
    raise exception 'This review is already decided and approved.' using errcode = 'RM175';
  end if;
  insert into public.edd_decisions (review_id, source_of_funds, outcome, note, decided_by)
  values (p_review, btrim(coalesce(p_source_of_funds, '')), p_outcome, nullif(btrim(p_note), ''), me)
  returning id into row_id;
  return row_id;
end;
$$;
revoke all on function public.decide_edd_review(uuid, text, text, text) from public, anon;
grant execute on function public.decide_edd_review(uuid, text, text, text) to authenticated;

create or replace function public.approve_edd_decision(p_decision uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  review uuid;
  latest uuid;
  row_id uuid;
begin
  if not private.aml_staff(me) then
    raise exception 'Staff only.' using errcode = '42501';
  end if;
  select d.review_id into review from public.edd_decisions d where d.id = p_decision;
  if review is null then
    raise exception 'That decision was not found.' using errcode = '22023';
  end if;
  if private.edd_review_settled(review) then
    raise exception 'This review is already decided and approved.' using errcode = 'RM175';
  end if;
  select d.id into latest from public.edd_decisions d
   where d.review_id = review order by d.decided_at desc, d.id desc limit 1;
  if latest is distinct from p_decision then
    raise exception 'A newer decision was recorded on this review. Approve that one.' using errcode = 'RM175';
  end if;
  insert into public.edd_approvals (decision_id, approved_by)
  values (p_decision, me)
  returning id into row_id;
  return row_id;
end;
$$;
revoke all on function public.approve_edd_decision(uuid) from public, anon;
grant execute on function public.approve_edd_decision(uuid) to authenticated;

create or replace function private.aml_person_name(p_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    nullif(btrim(concat_ws(' ', p.first_name, p.surname)), ''),
    nullif(btrim(p.display_name), ''),
    case when p_user is null then 'A deleted account' else 'A member' end
  )
  from (select 1) one
  left join public.profiles p on p.id = p_user;
$$;
revoke all on function private.aml_person_name(uuid) from public, anon, authenticated;

/* One review, as the lanes draw it. */
create or replace function private.edd_review_json(r public.edd_reviews)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', r.id,
    'user_id', r.user_id,
    'name', private.aml_person_name(r.user_id),
    'item', r.scuml_item,
    'reason', r.reason,
    'source_table', r.source_table,
    'source_id', r.source_id,
    'amount_minor', r.amount_minor,
    'raised_at', r.raised_at,
    'decision', (
      select jsonb_build_object(
        'id', d.id,
        'source_of_funds', d.source_of_funds,
        'outcome', d.outcome,
        'note', d.note,
        'decided_by', d.decided_by,
        'decided_by_name', private.aml_person_name(d.decided_by),
        'decided_at', d.decided_at,
        'approved_by_name', (select private.aml_person_name(a.approved_by) from public.edd_approvals a where a.decision_id = d.id),
        'approved_at', (select a.approved_at from public.edd_approvals a where a.decision_id = d.id)
      )
      from public.edd_decisions d
      where d.review_id = r.id
      order by d.decided_at desc, d.id desc
      limit 1
    )
  );
$$;
revoke all on function private.edd_review_json(public.edd_reviews) from public, anon, authenticated;

/*
 * The item 20 lane. Staff only, and a refusal is an error, never an empty
 * answer: a failed read must not draw as "nothing waiting".
 */
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
                 'is_pep', w.yes,
                 'relation', w.relation,
                 'role', w.role,
                 'source', w.source,
                 'at', w.ts
               ) as j, w.ts
          from (
            select distinct on (u.user_id) u.*
              from (
                select d.user_id, d.is_pep as yes, d.relation, d.role, 'declared'::text as source, d.declared_at as ts
                  from public.pep_declarations d where d.user_id is not null
                union all
                select f.user_id, f.flagged, f.relation, f.role, 'staff'::text, f.set_at
                  from public.pep_flags f where f.user_id is not null
              ) u
             order by u.user_id, u.ts desc
          ) w
         where w.yes
         order by w.ts desc
         limit 100
      ) p
    ), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.pep_desk() from public, anon;
grant execute on function public.pep_desk() to authenticated;
