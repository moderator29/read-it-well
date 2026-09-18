-- M15. A business climbs a verification ladder.
--
-- The agent ladder (20260805095946) as data for businesses: one row per rung,
-- one decision, one reviewer, a tier the trigger derives and nobody types.
-- The rungs are the four of docs/research/HOST_ONBOARDING_RESEARCH.md section
-- 3.6, in the order a real host passes them: identity, registration, payout,
-- on_site. The tier is the count of rungs passed with no gap below, exactly
-- private.agent_tier's law, so a passed on-site visit with no identity check
-- behind it promotes nobody.
--
-- THE BADGE LAW, AS SCHEMA. businesses.verified lights only for a first-party
-- row with a passed identity rung. It is derived by trigger from source and
-- tier, never written by hand, and a CHECK makes it structurally impossible
-- for a partner row to carry a tier or a badge. A third-party row can
-- therefore never render "Verified", in any surface, ever.

create table if not exists public.business_verification_checks (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  rung        text not null check (rung in ('identity', 'registration', 'payout', 'on_site')),
  status      text not null check (status in ('passed', 'failed', 'pending')),
  note        text check (note is null or length(note) <= 400),
  reviewer_id uuid references auth.users(id) on delete set null,
  decided_at  timestamptz not null default now(),
  unique (business_id, rung)
);

comment on table public.business_verification_checks is
  'One row per rung per business. The rung order is identity, registration, payout, on_site; businesses.verification_tier is derived from these and never set by hand. A failed rung carries a note.';

create index if not exists business_verification_checks_business_idx
  on public.business_verification_checks (business_id);
create index if not exists business_verification_checks_reviewer_idx
  on public.business_verification_checks (reviewer_id);

alter table public.business_verification_checks enable row level security;

drop policy if exists business_verification_checks_admin_all on public.business_verification_checks;
create policy business_verification_checks_admin_all
  on public.business_verification_checks for all
  using (
    private.has_role((select auth.uid()), 'admin')
    or private.has_role((select auth.uid()), 'super_admin')
  )
  with check (
    private.has_role((select auth.uid()), 'admin')
    or private.has_role((select auth.uid()), 'super_admin')
  );

drop policy if exists business_verification_checks_select_own on public.business_verification_checks;
create policy business_verification_checks_select_own
  on public.business_verification_checks for select
  using (private.owns_business(business_id));

revoke all on public.business_verification_checks from anon;

/* --------------------------------------------------------- the derived tier */

alter table public.businesses
  add column if not exists verification_tier smallint not null default 0
    check (verification_tier between 0 and 4),
  add column if not exists verified boolean not null default false;

comment on column public.businesses.verification_tier is
  'Rungs passed with no gap below, 0 to 4. Derived by trigger from business_verification_checks; never written by hand.';
comment on column public.businesses.verified is
  'The badge. True only for a first_party row whose identity rung has passed. Derived by trigger; a partner row can never carry it.';

alter table public.businesses drop constraint if exists businesses_partner_never_verified_chk;
alter table public.businesses
  add constraint businesses_partner_never_verified_chk
  check (source = 'first_party' or (verified = false and verification_tier = 0));

alter table public.businesses drop constraint if exists businesses_verified_means_identity_chk;
alter table public.businesses
  add constraint businesses_verified_means_identity_chk
  check (verified = false or verification_tier >= 1);

create or replace function private.business_tier(target_business uuid)
returns smallint
language sql
stable
set search_path to 'public'
as $function$
  select coalesce(
    (
      select count(*)::smallint
      from unnest(array['identity', 'registration', 'payout', 'on_site']) with ordinality as rung(kind, position)
      where rung.position <= coalesce(
        (
          select min(missing.position) - 1
          from unnest(array['identity', 'registration', 'payout', 'on_site']) with ordinality as missing(kind, position)
          where not exists (
            select 1
            from public.business_verification_checks c
            where c.business_id = target_business
              and c.rung = missing.kind
              and c.status = 'passed'
          )
        ),
        4
      )
    ),
    0
  );
$function$;

revoke execute on function private.business_tier(uuid) from public, anon, authenticated;

-- The badge follows source and tier on the row itself, on every write, so a
-- row that changes source to partner drops both, and a row whose tier the
-- rung trigger just recomputed lights or clears the badge in the same write.
create or replace function private.derive_business_badge()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if new.source <> 'first_party' then
    new.verification_tier := 0;
    new.verified := false;
  else
    new.verified := new.verification_tier >= 1;
  end if;
  return new;
end;
$function$;

revoke execute on function private.derive_business_badge() from public, anon, authenticated;

drop trigger if exists businesses_derive_badge on public.businesses;
create trigger businesses_derive_badge
  before insert or update of source, verification_tier, verified on public.businesses
  for each row execute function private.derive_business_badge();

create or replace function private.sync_business_verification_tier()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  target uuid := coalesce(new.business_id, old.business_id);
begin
  update public.businesses
     set verification_tier = private.business_tier(target)
   where businesses.id = target;
  return null;
end;
$function$;

revoke execute on function private.sync_business_verification_tier() from public, anon, authenticated;

drop trigger if exists business_verification_checks_sync on public.business_verification_checks;
create trigger business_verification_checks_sync
  after insert or update or delete on public.business_verification_checks
  for each row execute function private.sync_business_verification_tier();
