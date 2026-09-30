-- B9: AN AGREEMENT KEEPS A SNAPSHOT OF EVERY VERSION OF ITS TERMS
-- (30 September 2026).
-- Applied 30 September 2026 with the founder's approval. Idempotent and
-- additive: one table, one trigger function, one trigger, one backfill of the
-- CURRENT version of each agreement. No agreement, confirmation, status,
-- payment or settlement is changed, and no existing function is replaced.
--
-- WHY. Changing anything in an agreement moves `terms_version` and lapses
-- every confirmation (`public.agreement_amend_as`), which is right. But the
-- old terms were overwritten in place, so the person asked to confirm again
-- could not see WHAT moved: the history said "Terms changed" and nothing
-- else. That is exactly where a quiet price change would hide.
--
-- WHAT.
--   public.deal_agreement_versions  one immutable row per (agreement, version):
--                                   the terms jsonb and the total, as they
--                                   stood at that version. Written ONLY by the
--                                   trigger below; members can never insert,
--                                   update or delete.
--   private.snapshot_agreement_version()
--                                   AFTER INSERT OR UPDATE OF terms,
--                                   terms_version, amount_minor on
--                                   deal_agreements: upserts the row for the
--                                   agreement's current version. The upsert
--                                   (not do-nothing) keeps the snapshot equal
--                                   to the final state of that version if a
--                                   same-version write ever touches the terms
--                                   (the quote trigger normalises them before
--                                   the row lands, so this is belt and braces).
--
-- READ ACCESS. RLS on. The two parties to the agreement read its versions,
-- nobody else, through the same membership test the agreement itself uses
-- (renter_id or owner_id is the caller). Staff access is not added here; it
-- can be added by the lead through the existing staff predicate if wanted.
--
-- WHO CHANGED IT is not duplicated here: `deal_agreement_events` already
-- records the actor, the action ('amended') and the resulting terms_version.
-- The app joins the two.
--
-- HISTORY BEFORE THIS FILE cannot be recovered: the old terms were never
-- kept. The backfill snapshots each agreement's CURRENT version only, so the
-- "what changed" card appears from the first amendment made after this is
-- applied. The app degrades to today's screen when an earlier version has no
-- snapshot (or the table does not exist yet).
--
-- RETENTION. Rows cascade with their agreement, so they are kept exactly as
-- long as the agreement is (docs/RETENTION_SCHEDULE.md), which the founder is
-- asked to confirm.

create table if not exists public.deal_agreement_versions (
  agreement_id  uuid not null references public.deal_agreements (id) on delete cascade,
  terms_version integer not null,
  terms         jsonb not null default '{}'::jsonb,
  amount_minor  bigint not null,
  created_at    timestamptz not null default now(),
  primary key (agreement_id, terms_version),
  constraint deal_agreement_versions_version_chk check (terms_version >= 1)
);

comment on table public.deal_agreement_versions is
  'B9: the terms of each agreement version, kept immutably so a party can see what changed since they confirmed. Written only by private.snapshot_agreement_version.';

alter table public.deal_agreement_versions enable row level security;
revoke all on public.deal_agreement_versions from anon, authenticated;
grant select on public.deal_agreement_versions to authenticated;

drop policy if exists deal_agreement_versions_parties_read on public.deal_agreement_versions;
create policy deal_agreement_versions_parties_read
  on public.deal_agreement_versions
  for select
  to authenticated
  using (
    exists (
      select 1
        from public.deal_agreements a
       where a.id = deal_agreement_versions.agreement_id
         and (select auth.uid()) in (a.renter_id, a.owner_id)
    )
  );

create or replace function private.snapshot_agreement_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.terms_version is null or new.terms_version < 1 then
    return new;
  end if;
  insert into public.deal_agreement_versions (agreement_id, terms_version, terms, amount_minor)
  values (new.id, new.terms_version, coalesce(new.terms, '{}'::jsonb), coalesce(new.amount_minor, 0))
  on conflict (agreement_id, terms_version)
  do update set terms = excluded.terms, amount_minor = excluded.amount_minor;
  return new;
end;
$function$;

revoke all on function private.snapshot_agreement_version() from public, anon, authenticated;

drop trigger if exists deal_agreements_zz_snapshot_version on public.deal_agreements;
create trigger deal_agreements_zz_snapshot_version
  after insert or update of terms, terms_version, amount_minor
  on public.deal_agreements
  for each row
  execute function private.snapshot_agreement_version();

-- Backfill: the current version of every agreement (older ones are gone).
insert into public.deal_agreement_versions (agreement_id, terms_version, terms, amount_minor)
select a.id, a.terms_version, coalesce(a.terms, '{}'::jsonb), coalesce(a.amount_minor, 0)
  from public.deal_agreements a
 where a.terms_version >= 1
on conflict (agreement_id, terms_version) do nothing;

-- Read-back: the table exists with RLS on, the policy and trigger are in
-- place, and every agreement has a snapshot of its current version.
do $$
declare
  missing integer;
begin
  if to_regclass('public.deal_agreement_versions') is null then
    raise exception 'B9: deal_agreement_versions was not created';
  end if;
  if not (select c.relrowsecurity from pg_catalog.pg_class c where c.oid = 'public.deal_agreement_versions'::regclass) then
    raise exception 'B9: RLS is not on for deal_agreement_versions';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_policies
     where schemaname = 'public' and tablename = 'deal_agreement_versions'
       and policyname = 'deal_agreement_versions_parties_read'
  ) then
    raise exception 'B9: the parties read policy is missing';
  end if;
  if exists (
    select 1 from pg_catalog.pg_policies
     where schemaname = 'public' and tablename = 'deal_agreement_versions' and cmd <> 'SELECT'
  ) then
    raise exception 'B9: a write policy exists on deal_agreement_versions; only the trigger may write';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_trigger
     where tgrelid = 'public.deal_agreements'::regclass and tgname = 'deal_agreements_zz_snapshot_version'
  ) then
    raise exception 'B9: the snapshot trigger is missing';
  end if;
  select count(*) into missing
    from public.deal_agreements a
   where a.terms_version >= 1
     and not exists (
       select 1 from public.deal_agreement_versions v
        where v.agreement_id = a.id and v.terms_version = a.terms_version
     );
  if missing > 0 then
    raise exception 'B9: % agreements have no snapshot of their current version', missing;
  end if;
end;
$$;
