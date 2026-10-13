-- Applied 13 October 2026. PAY ON VALLO 2 of 8. Needs pov01.
-- Ruling 2: on a rent or a shortlet the payer picks escrow (the default,
-- recommended) or card. A sale is always escrow. Hotels and restaurants keep
-- their own rows (card).
--
-- A policy row is history, so the nine rent rows of 5 October are retired
-- from now (effective_to = now(), the only change their guard allows) and
-- replaced, in the same transaction, by rows that are escrow by default and
-- let the payer choose. The new rows name the rent intent, so a sale never
-- matches them; the sale row (precedence 100) is untouched.
--
-- One founder decision moves: a registered business's apartment was direct
-- (3A.2). Ruling 2 makes every rent and shortlet escrow by default with the
-- payer's choice, so its new row is escrow with the choice.
--
-- Retired (live ids, read 13 October 2026):
--   7d8b0368 rental, 64a15101 home, 8176a4a2 villa, 48ab9c08 land,
--   054fa444 shop, 087f5394 office, ab87c6d0 shortlet,
--   87d20cc3 apartment (individual), 671e4bc1 apartment (business, direct).
-- Kept: fc8969aa sale (escrow, milestones), 9ea41c93 hotel (direct),
--   fe5ec312 restaurant (direct).
-- Probe: supabase/tests/probes-pending/pov02-rent-and-shortlet-policy-rows.sql
set lock_timeout = '5s';

update public.payment_rail_policy
   set effective_to = now()
 where effective_to is null
   and id in ('7d8b0368-d092-4d87-b304-f106841f4769', '64a15101-8c87-4055-86a9-0602f6882f35',
              '8176a4a2-dda7-49e2-a243-555a04ed9407', '48ab9c08-ed77-4b6c-a460-a1ba949c427d',
              '054fa444-4b0a-459e-bf55-5f8f423a4de4', '087f5394-e941-4d45-a3b7-4669908d2427',
              'ab87c6d0-1d2b-479d-befc-f72bf5d03873', '87d20cc3-7f87-459e-a1b1-bbaccf1f352b',
              '671e4bc1-012c-47c3-9ef5-e54a7728a286');

insert into public.payment_rail_policy
  (property_type, listing_intent, lister_kind, rail, milestones, payer_may_choose, precedence, effective_from, reason)
select v.pt::public.property_type, 'rent'::public.listing_intent, v.lk::public.agent_type, 'escrow', false, true, 0, now(),
       'Founder ruling 13 Oct 2026: on a ' || v.label || ' the payer picks escrow (default) or card.'
  from (values
    ('rental', null, 'rental'),
    ('home', null, 'home'),
    ('villa', null, 'villa'),
    ('land', null, 'land lease'),
    ('shop', null, 'shop'),
    ('office', null, 'office'),
    ('shortlet', null, 'shortlet'),
    ('apartment', 'individual', 'individual''s apartment'),
    ('apartment', 'business', 'registered business''s apartment')
  ) as v(pt, lk, label)
 where not exists (
   select 1 from public.payment_rail_policy p
    where p.effective_to is null and p.payer_may_choose
      and p.property_type = v.pt::public.property_type
      and p.listing_intent = 'rent'
      and p.lister_kind is not distinct from v.lk::public.agent_type);
