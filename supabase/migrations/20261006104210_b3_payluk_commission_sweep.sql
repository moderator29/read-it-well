-- B3 (Session 2, round 3). THE PAYLUK COMMISSION SWEEP: its log and its desk read. DRAFT. NOT APPLIED.
--
-- D51: Vallo's 2 percent on escrow is a Payluk merchant-dashboard setting and
-- accrues in Vallo's Payluk MERCHANT wallet as `commission` transactions. It
-- does not arrive by itself. The job (apps/web/src/lib/payouts/commission-sweep.ts)
-- reads GET /v1/merchant/balance, and would withdraw to Vallo's bank, but
-- Payluk documents NO API route that withdraws the merchant wallet
-- (docs/payments/PAYLUK_LIVE_DOCS_FINDINGS.md, section 7 item 6: "there is no
-- API route for a merchant-wallet withdrawal; presumably dashboard only"). So
-- every run that finds money records `withdrawal_unavailable` and the Money
-- desk shows the balance waiting, until Payluk confirms a route in writing.
--
-- WHAT LANDS
--   public.payluk_commission_sweeps   append-only run log: when, the outcome, the
--                                     balance read (kobo, converted from Payluk's naira),
--                                     any withdrawal, any failure. Service role writes;
--                                     nobody else reads it directly.
--   public.admin_payluk_commission_sweep()   the Money desk read: latest balance,
--                                     last run, last success, last failure, recent runs.
--                                     Gated on private.staff_can(uid, 'finance').
--
-- NOT HERE, ON PURPOSE: the revenue record. The ledger is agent B2's. A
-- withdrawal that Payluk CONFIRMS becomes one Vallo-revenue ledger line (shape
-- in the B3 report); until then nothing here is revenue, it is an observation.
--
-- A run with no Payluk key writes nothing (the job no-ops before touching this).
-- Additive, idempotent, RLS on, no member grant. Truly append only: service_role
-- keeps select and insert (its default-ACL update/delete/truncate are revoked) and
-- a before-truncate trigger refuses truncate. Every new function is revoked from
-- public AND anon (default privileges grant anon EXECUTE on new functions).
-- error_detail holds Payluk's raw message: finance-staff only via the desk read,
-- never on a member surface.

begin;

create table if not exists public.payluk_commission_sweeps (
  id                      uuid primary key default gen_random_uuid(),
  started_at              timestamptz not null default now(),
  finished_at             timestamptz,
  environment             text not null check (environment in ('staging', 'production')),
  outcome                 text not null check (outcome in
                            ('balance_read', 'nothing_to_sweep', 'withdrawal_unavailable',
                             'withdrawal_submitted', 'paced', 'failed')),
  main_balance_minor      bigint check (main_balance_minor >= 0),
  escrow_balance_minor    bigint check (escrow_balance_minor >= 0),
  currency                text,
  withdrawal_minor        bigint check (withdrawal_minor >= 0),
  withdrawal_reference    text,
  rate_limit_remaining    integer,
  error_code              text,
  error_detail            text check (error_detail is null or length(error_detail) <= 500),
  constraint payluk_commission_sweeps_failed_has_code check (outcome <> 'failed' or error_code is not null)
);
create index if not exists payluk_commission_sweeps_started_idx on public.payluk_commission_sweeps (started_at desc);

create or replace function private.payluk_sweep_append_only()
returns trigger language plpgsql set search_path to '' as $$
begin
  raise exception 'payluk_commission_sweeps: the sweep log is append only' using errcode = '42501';
end;
$$;
create or replace trigger payluk_commission_sweeps_append_only
  before update or delete on public.payluk_commission_sweeps
  for each row execute function private.payluk_sweep_append_only();
create or replace trigger payluk_commission_sweeps_no_truncate
  before truncate on public.payluk_commission_sweeps
  for each statement execute function private.payluk_sweep_append_only();
revoke all on function private.payluk_sweep_append_only() from public, anon, authenticated;

alter table public.payluk_commission_sweeps enable row level security;
revoke all on public.payluk_commission_sweeps from public, anon, authenticated, service_role;
grant select, insert on public.payluk_commission_sweeps to service_role;

create or replace function public.admin_payluk_commission_sweep()
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare
  actor uuid := auth.uid();
  last_read public.payluk_commission_sweeps%rowtype;
begin
  if not private.staff_can(actor, 'finance') then
    return jsonb_build_object('status', 'forbidden');
  end if;
  select * into last_read from public.payluk_commission_sweeps
   where main_balance_minor is not null order by started_at desc limit 1;
  return jsonb_build_object(
    'status', 'ok',
    'balance', case when last_read.id is null then null else jsonb_build_object(
       'main_minor', last_read.main_balance_minor, 'escrow_minor', last_read.escrow_balance_minor,
       'currency', last_read.currency, 'read_at', last_read.started_at) end,
    'last_run', (select to_jsonb(s) from public.payluk_commission_sweeps s order by s.started_at desc limit 1),
    'last_withdrawal', (select to_jsonb(s) from public.payluk_commission_sweeps s
                         where s.outcome = 'withdrawal_submitted' order by s.started_at desc limit 1),
    'last_failure', (select to_jsonb(s) from public.payluk_commission_sweeps s
                      where s.outcome = 'failed' order by s.started_at desc limit 1),
    'recent', coalesce((select jsonb_agg(to_jsonb(s) order by s.started_at desc)
                          from (select * from public.payluk_commission_sweeps order by started_at desc limit 20) s), '[]'::jsonb));
end;
$$;
revoke all on function public.admin_payluk_commission_sweep() from public, anon;
grant execute on function public.admin_payluk_commission_sweep() to authenticated;

-- READ-BACK.
do $$
begin
  if not exists (select 1 from pg_class c join pg_namespace s on s.oid = c.relnamespace
                  where s.nspname = 'public' and c.relname = 'payluk_commission_sweeps' and c.relrowsecurity) then
    raise exception 'b3_payluk_commission_sweep: RLS is not on';
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'payluk_commission_sweeps_append_only')
     or not exists (select 1 from pg_trigger where tgname = 'payluk_commission_sweeps_no_truncate') then
    raise exception 'b3_payluk_commission_sweep: append-only or no-truncate trigger missing';
  end if;
  if has_table_privilege('service_role', 'public.payluk_commission_sweeps', 'update')
     or has_table_privilege('service_role', 'public.payluk_commission_sweeps', 'delete')
     or has_table_privilege('service_role', 'public.payluk_commission_sweeps', 'truncate')
     or not has_table_privilege('service_role', 'public.payluk_commission_sweeps', 'insert') then
    raise exception 'b3_payluk_commission_sweep: service_role grants are not select+insert only';
  end if;
  if has_function_privilege('anon', 'private.payluk_sweep_append_only()', 'execute')
     or has_function_privilege('authenticated', 'private.payluk_sweep_append_only()', 'execute')
     or not has_function_privilege('authenticated', 'public.admin_payluk_commission_sweep()', 'execute') then
    raise exception 'b3_payluk_commission_sweep: function grants are wrong';
  end if;
  if has_table_privilege('authenticated', 'public.payluk_commission_sweeps', 'select')
     or has_table_privilege('authenticated', 'public.payluk_commission_sweeps', 'insert')
     or has_table_privilege('anon', 'public.payluk_commission_sweeps', 'select') then
    raise exception 'b3_payluk_commission_sweep: the sweep log is readable or writable by members';
  end if;
  if has_function_privilege('anon', 'public.admin_payluk_commission_sweep()', 'execute') then
    raise exception 'b3_payluk_commission_sweep: anon can call the desk read';
  end if;
end $$;

commit;
