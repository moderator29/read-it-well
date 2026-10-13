-- ROLLBACK for pov02.
-- A policy row is history, so a rollback is two more rows of history, never
-- an edit: the rows pov02 added (payer_may_choose) are retired from now, and
-- the nine rows of 5 October are written again as new rows with their old
-- answers (read live 13 October 2026), including the registered business's
-- apartment on the direct rail.
set lock_timeout = '5s';

update public.payment_rail_policy
   set effective_to = now()
 where effective_to is null and payer_may_choose;

insert into public.payment_rail_policy
  (property_type, listing_intent, lister_kind, rail, milestones, payer_may_choose, precedence, effective_from, reason)
select v.pt::public.property_type, null, v.lk::public.agent_type, v.rail, false, false, 0, now(),
       'Rollback of pov02 (' || v.pt || coalesce(', ' || v.lk, '') || '): the 5 October answer restored.'
  from (values
    ('rental', null, 'escrow'), ('home', null, 'escrow'), ('villa', null, 'escrow'), ('land', null, 'escrow'),
    ('shop', null, 'escrow'), ('office', null, 'escrow'), ('shortlet', null, 'escrow'),
    ('apartment', 'individual', 'escrow'), ('apartment', 'business', 'direct')
  ) as v(pt, lk, rail);
