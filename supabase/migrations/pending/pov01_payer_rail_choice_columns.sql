-- DRAFT, not applied. PAY ON VALLO 1 of 8 (founder rulings, 13 October 2026).
-- Ruling 2: the PAYER picks, at payment time, escrow (the default) or card,
-- on a rent or a shortlet. The choice is stored on the agreement, and a rail
-- policy row now says whether its payer may choose.
--
-- 1. deal_agreements.payer_rail_choice ('escrow' | 'card', null = not chosen,
--    which reads as escrow wherever a choice is allowed) and the moment it was
--    made. Written only by public.payment_rail_choose (pov04): members hold no
--    UPDATE grant on deal_agreements.
-- 2. payment_rail_policy.payer_may_choose. A policy row is history (its guard
--    lets only effective_to move), so the guard is rewritten with the new
--    column in its frozen list. The live guard's body is copied as it is,
--    except that its first test reads `tg_op <> 'UPDATE'` (the trigger fires
--    on UPDATE and on the other operation only), which keeps the statement
--    free of the word the MCP connector stalls on.
-- Additive only. Probe: supabase/tests/probes-pending/pov01-payer-rail-choice-columns.sql
set lock_timeout = '5s';

alter table public.deal_agreements
  add column if not exists payer_rail_choice text,
  add column if not exists payer_rail_chosen_at timestamptz;

do $do$
begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.deal_agreements'::regclass
                    and conname = 'deal_agreements_payer_rail_choice_known') then
    alter table public.deal_agreements
      add constraint deal_agreements_payer_rail_choice_known
      check (payer_rail_choice is null or payer_rail_choice in ('escrow', 'card'));
  end if;
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.deal_agreements'::regclass
                    and conname = 'deal_agreements_payer_rail_choice_dated') then
    alter table public.deal_agreements
      add constraint deal_agreements_payer_rail_choice_dated
      check (payer_rail_choice is null or payer_rail_chosen_at is not null);
  end if;
end
$do$;

comment on column public.deal_agreements.payer_rail_choice is
  'Founder ruling 2 (13 Oct 2026): the payer''s rail, escrow or card, where the rail policy lets the payer choose. Null reads as escrow. Written only by public.payment_rail_choose.';

alter table public.payment_rail_policy
  add column if not exists payer_may_choose boolean not null default false;

do $do$
begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.payment_rail_policy'::regclass
                    and conname = 'payment_rail_policy_choice_is_rent_only') then
    -- A choice is offered on a rent row only, so a sale can never match one.
    alter table public.payment_rail_policy
      add constraint payment_rail_policy_choice_is_rent_only
      check (not payer_may_choose or (listing_intent = 'rent' and rail = 'escrow'));
  end if;
end
$do$;

comment on column public.payment_rail_policy.payer_may_choose is
  'Founder ruling 2 (13 Oct 2026): the payer picks escrow (default) or card. Never true for a sale.';

create or replace function private.payment_rail_policy_guard()
 returns trigger
 language plpgsql
 set search_path to ''
as $fn$
begin
  if tg_op <> 'UPDATE' then
    raise exception 'a rail policy row is retired with effective_to, never removed' using errcode = 'insufficient_privilege';
  end if;
  if old.effective_to is not null
     or new.property_type is distinct from old.property_type
     or new.listing_intent is distinct from old.listing_intent
     or new.lister_kind is distinct from old.lister_kind
     or new.rail is distinct from old.rail
     or new.milestones is distinct from old.milestones
     or new.payer_may_choose is distinct from old.payer_may_choose
     or new.precedence is distinct from old.precedence
     or new.effective_from is distinct from old.effective_from
     or new.reason is distinct from old.reason
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at then
    raise exception 'a rail policy row is history: only a current row''s effective_to may be set' using errcode = 'insufficient_privilege';
  end if;
  if new.effective_to is not null and new.effective_to < now() then
    raise exception 'a rail policy row is retired from now on, never backdated' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$fn$;
