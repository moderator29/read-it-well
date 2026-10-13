-- POV01 (pending migration pov01_payer_rail_choice_columns): the payer's
-- choice is stored on the agreement and only as 'escrow' or 'card' with its
-- moment; a policy row's payer_may_choose is history like every other
-- column, and only a rent escrow row may offer a choice.
-- Everything is rolled back by the final raise.
do $$
declare
  ag uuid;
  pol uuid;
  refused boolean;
begin
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'deal_agreements' and column_name = 'payer_rail_choice')
     or not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'deal_agreements' and column_name = 'payer_rail_chosen_at')
     or not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'payment_rail_policy' and column_name = 'payer_may_choose') then
    raise exception 'PROBE_FAIL pov01-payer-rail-choice-columns: a column is missing';
  end if;

  select id into ag from public.deal_agreements order by created_at desc limit 1;
  if ag is null then
    raise exception 'PROBE_FAIL pov01-payer-rail-choice-columns: fixtures missing (an agreement)';
  end if;

  -- 1. An unknown word is refused.
  refused := false;
  begin
    update public.deal_agreements set payer_rail_choice = 'wallet', payer_rail_chosen_at = now() where id = ag;
  exception when check_violation then refused := true;
  end;
  if not refused then
    raise exception 'PROBE_FAIL pov01-payer-rail-choice-columns: a choice other than escrow or card was stored';
  end if;

  -- 2. A choice without its moment is refused.
  refused := false;
  begin
    update public.deal_agreements set payer_rail_choice = 'card', payer_rail_chosen_at = null where id = ag;
  exception when check_violation then refused := true;
  end;
  if not refused then
    raise exception 'PROBE_FAIL pov01-payer-rail-choice-columns: a choice was stored without its moment';
  end if;

  -- 3. Both words, with the moment, are stored.
  update public.deal_agreements set payer_rail_choice = 'card', payer_rail_chosen_at = now() where id = ag;
  update public.deal_agreements set payer_rail_choice = 'escrow', payer_rail_chosen_at = now() where id = ag;

  -- 4. A sale row can never offer a choice.
  refused := false;
  begin
    insert into public.payment_rail_policy (listing_intent, rail, payer_may_choose, precedence, reason)
    values ('sale', 'escrow', true, 0, 'PROBE pov01: a sale offering card, rolled back');
  exception when check_violation then refused := true;
  end;
  if not refused then
    raise exception 'PROBE_FAIL pov01-payer-rail-choice-columns: a sale row offered the payer a choice';
  end if;

  -- 5. payer_may_choose is history: the guard refuses changing it.
  select id into pol from public.payment_rail_policy where effective_to is null limit 1;
  refused := false;
  begin
    update public.payment_rail_policy set payer_may_choose = not payer_may_choose where id = pol;
  exception when insufficient_privilege then refused := true;
  end;
  if not refused then
    raise exception 'PROBE_FAIL pov01-payer-rail-choice-columns: a policy row''s choice was edited in place';
  end if;

  -- 6. Members hold no write on the agreement: the choice goes through the RPC.
  if has_table_privilege('authenticated', 'public.deal_agreements', 'update')
     and has_column_privilege('authenticated', 'public.deal_agreements', 'payer_rail_choice', 'update') then
    raise exception 'PROBE_FAIL pov01-payer-rail-choice-columns: a member can write the choice directly';
  end if;

  raise exception 'PROBE_OK pov01-payer-rail-choice-columns';
end
$$;
