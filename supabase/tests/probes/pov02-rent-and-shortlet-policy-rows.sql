-- POV02 (pending migration pov02_rent_and_shortlet_policy_rows): every rent
-- and shortlet answer is escrow with the payer's choice; a sale is the sale
-- row (escrow, no choice); a hotel and a restaurant are direct with no
-- choice; the nine rows of 5 October are retired, not removed.
-- Everything is rolled back by the final raise.
do $$
declare
  r record;
  v record;
begin
  for v in select * from (values
      ('rental', null), ('home', null), ('villa', null), ('land', null), ('shop', null),
      ('office', null), ('shortlet', null), ('apartment', 'individual'), ('apartment', 'business')
    ) as t(pt, lk) loop
    r := public.resolve_payment_rail(v.pt::public.property_type, 'rent'::public.listing_intent, v.lk::public.agent_type);
    if r.rail is distinct from 'escrow' then
      raise exception 'PROBE_FAIL pov02-rent-and-shortlet-policy-rows: % (%) for rent resolved %, not escrow', v.pt, v.lk, r.rail;
    end if;
    if not exists (select 1 from public.payment_rail_policy p where p.id = r.policy_id and p.payer_may_choose) then
      raise exception 'PROBE_FAIL pov02-rent-and-shortlet-policy-rows: % (%) for rent offers no choice', v.pt, v.lk;
    end if;
  end loop;

  r := public.resolve_payment_rail('land'::public.property_type, 'sale'::public.listing_intent, 'business'::public.agent_type);
  if r.rail is distinct from 'escrow'
     or exists (select 1 from public.payment_rail_policy p where p.id = r.policy_id and p.payer_may_choose) then
    raise exception 'PROBE_FAIL pov02-rent-and-shortlet-policy-rows: a sale is not escrow without a choice';
  end if;

  r := public.resolve_payment_rail('hotel'::public.property_type, 'rent'::public.listing_intent, 'business'::public.agent_type);
  if r.rail is distinct from 'direct'
     or exists (select 1 from public.payment_rail_policy p where p.id = r.policy_id and p.payer_may_choose) then
    raise exception 'PROBE_FAIL pov02-rent-and-shortlet-policy-rows: a hotel is not card only';
  end if;

  r := public.resolve_payment_rail('restaurant'::public.property_type, 'rent'::public.listing_intent, 'business'::public.agent_type);
  if r.rail is distinct from 'direct'
     or exists (select 1 from public.payment_rail_policy p where p.id = r.policy_id and p.payer_may_choose) then
    raise exception 'PROBE_FAIL pov02-rent-and-shortlet-policy-rows: a restaurant is not card only';
  end if;

  if (select count(*) from public.payment_rail_policy
       where id in ('7d8b0368-d092-4d87-b304-f106841f4769', '64a15101-8c87-4055-86a9-0602f6882f35',
                    '8176a4a2-dda7-49e2-a243-555a04ed9407', '48ab9c08-ed77-4b6c-a460-a1ba949c427d',
                    '054fa444-4b0a-459e-bf55-5f8f423a4de4', '087f5394-e941-4d45-a3b7-4669908d2427',
                    'ab87c6d0-1d2b-479d-befc-f72bf5d03873', '87d20cc3-7f87-459e-a1b1-bbaccf1f352b',
                    '671e4bc1-012c-47c3-9ef5-e54a7728a286')
         and effective_to is not null) <> 9 then
    raise exception 'PROBE_FAIL pov02-rent-and-shortlet-policy-rows: the nine rows of 5 October are not all retired and kept';
  end if;

  raise exception 'PROBE_OK pov02-rent-and-shortlet-policy-rows';
end
$$;
