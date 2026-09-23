-- THE PROPOSAL IN A THREAD, END TO END, AGAINST THE LIVE DATABASE.
--
-- Run through `mcp__Supabase__apply_migration`. It ENDS IN A DELIBERATE
-- `raise exception`, so the whole transaction rolls back and nothing reaches a
-- live product table: not the conversation it creates, not the agreement, not
-- the wallet entries, not the audit rows.
--
-- IT MEASURES A DELTA AND NEVER AN ABSOLUTE. These are live wallets with real
-- balances in them. A probe that asserts "the payer ends at 500,000" passes on
-- an empty database and fails on a real one, which is the wrong way round.
--
-- THE REFUSALS RUN FIRST, before any door is shown to work, so a later pass
-- cannot be mistaken for a door that was open all along.
do $probe$
declare
  agent_u uuid; guest_u uuid; stranger uuid;
  convo uuid; demo_convo uuid; esc uuid;
  r jsonb; who uuid; w uuid; before_minor bigint; src text;
begin
  select id into agent_u from auth.users order by created_at limit 1;
  select id into guest_u from auth.users order by created_at desc limit 1;
  select id into stranger from auth.users where id not in (agent_u, guest_u) order by created_at limit 1;
  if agent_u is null or guest_u is null or stranger is null then
    raise exception 'PROBE CANNOT RUN: needs three distinct auth users';
  end if;

  /* No claims: this is how a server action arrives, as the service role. */
  perform set_config('request.jwt.claims', '', true);

  insert into public.conversations (guest_id, agent_id, listing_id, context_kind)
  values (guest_u, agent_u, null, 'listing') returning id into convo;

  select id into demo_convo from public.conversations
   where listing_id is not null and id <> convo limit 1;

  r := public.escrow_propose_as(stranger, convo, agent_u, 'agency_fee', 500000, true);
  if r->>'status' <> 'not_a_party' then
    raise exception 'PROBE FAILED: a stranger proposed into somebody else''s thread: %', r;
  end if;

  r := public.escrow_propose_as(agent_u, convo, stranger, 'agency_fee', 500000, false);
  if r->>'status' <> 'not_a_party' then
    raise exception 'PROBE FAILED: a member proposed an agreement with somebody outside the thread: %', r;
  end if;

  r := public.escrow_propose_as(agent_u, convo, guest_u, 'purchase_balance', 500000, false);
  if r->>'status' <> 'purpose_not_open' then
    raise exception 'PROBE FAILED: purchase_balance was accepted: %', r;
  end if;

  r := public.escrow_propose_as(agent_u, convo, guest_u, 'purchase_deposit', 500000, false);
  if r->>'status' <> 'purpose_not_open' then
    raise exception 'PROBE FAILED: purchase_deposit was accepted: %', r;
  end if;

  r := public.escrow_propose_as(agent_u, convo, guest_u, 'agency_fee', 0, false);
  if r->>'status' <> 'bad_amount' then
    raise exception 'PROBE FAILED: a zero amount was accepted: %', r;
  end if;

  r := public.escrow_propose_as(agent_u, convo, agent_u, 'agency_fee', 500000, false);
  if r->>'status' <> 'same_party' then
    raise exception 'PROBE FAILED: a proposal to oneself was accepted: %', r;
  end if;

  /* EVERY CONVERSATION ON THIS DATABASE IS ABOUT AN EXAMPLE LISTING, so this
     is the answer the first real person would have met. */
  if demo_convo is not null then
    r := public.escrow_propose_as(
      (select agent_id from public.conversations where id = demo_convo),
      demo_convo,
      (select guest_id from public.conversations where id = demo_convo),
      'agency_fee', 500000, false);
    if r->>'status' <> 'demo_listing' then
      raise exception 'PROBE FAILED: a proposal against an example property answered % instead of demo_listing', r;
    end if;
  end if;

  -- THE PROPOSAL ITSELF. The agent asks; the guest pays.
  r := public.escrow_propose_as(agent_u, convo, guest_u, 'agency_fee', 500000, false);
  if r->>'status' <> 'ok' or r->>'state' <> 'INITIATED' then
    raise exception 'PROBE FAILED: a good proposal was refused: %', r;
  end if;
  esc := (r->>'escrow_id')::uuid;

  if (select payer_id from public.escrows where id = esc) <> guest_u then
    raise exception 'PROBE FAILED: the wrong person is the payer';
  end if;
  if (select conversation_id from public.escrows where id = esc) <> convo then
    raise exception 'PROBE FAILED: the agreement does not remember its thread';
  end if;

  -- THE AUDIT ROW NAMES THE PROPOSER. Before 20260923093233 it named nobody.
  select actor_id, metadata->>'actor_source' into who, src
  from public.audit_log
  where entity_type = 'escrow' and entity_id = esc::text and action = 'escrow.initiated';
  if who is null then
    raise exception 'PROBE FAILED: the birth row still names nobody';
  end if;
  if who <> agent_u then
    raise exception 'PROBE FAILED: the birth row names % and the proposer was %', who, agent_u;
  end if;
  if src <> 'row' then
    raise exception 'PROBE FAILED: actor_source says % and the service role has no session', src;
  end if;

  r := public.escrow_propose_as(agent_u, convo, guest_u, 'agency_fee', 100000, false);
  if r->>'status' <> 'already_open' then
    raise exception 'PROBE FAILED: a second proposal was accepted in the same thread: %', r;
  end if;

  r := public.escrow_fund_proposal_as(agent_u, esc, 21);
  if r->>'status' <> 'not_a_party' then
    raise exception 'PROBE FAILED: the payee funded the proposal: %', r;
  end if;
  r := public.escrow_fund_proposal_as(stranger, esc, 21);
  if r->>'status' <> 'not_a_party' then
    raise exception 'PROBE FAILED: a stranger funded the proposal: %', r;
  end if;

  insert into public.wallets (user_id) values (guest_u) on conflict (user_id) do nothing;
  select id into w from public.wallets where user_id = guest_u;

  r := public.escrow_fund_proposal_as(guest_u, esc, 21);
  if r->>'status' <> 'insufficient' then
    raise exception 'PROBE FAILED: an empty balance funded 500000 kobo: %', r;
  end if;

  before_minor := private.wallet_spendable_locked(w);
  insert into public.wallet_entries (wallet_id, kind, direction, amount_minor, reference, status)
  values (w, 'deposit', 'credit', 500000, 'probe-seed-propose-' || w::text, 'COMPLETED');

  r := public.escrow_fund_proposal_as(guest_u, esc, 21);
  if r->>'status' <> 'ok' or r->>'state' <> 'HELD' then
    raise exception 'PROBE FAILED: the payer could not fund their own proposal: %', r;
  end if;
  if (select auto_release_at from public.escrows where id = esc) is null then
    raise exception 'PROBE FAILED: nothing set a payout date';
  end if;

  r := public.escrow_fund_proposal_as(guest_u, esc, 21);
  if r->>'status' <> 'not_fundable' then
    raise exception 'PROBE FAILED: a funded proposal was funded again: %', r;
  end if;

  -- THE REFERENCE IS THE ROW'S, exactly as references.ts requires.
  if not exists (
    select 1 from public.wallet_entries
    where reference = 'rm-esc-' || esc::text || '-hold' and kind = 'escrow_hold'
  ) then
    raise exception 'PROBE FAILED: the hold did not post under the derived reference';
  end if;
  if (select count(*) from public.wallet_entries where metadata->>'escrow_id' = esc::text) <> 1 then
    raise exception 'PROBE FAILED: more than one ledger entry for one hold';
  end if;

  if private.wallet_spendable_locked(w) <> before_minor then
    raise exception 'PROBE FAILED: the payer is at a delta of %, not 0.',
      private.wallet_spendable_locked(w) - before_minor;
  end if;
  if (private.escrow_invariants_check() ->> 'ok')::boolean is not true then
    raise exception 'PROBE FAILED: the float stopped balancing: %',
      private.escrow_invariants_check() ->> 'breaches';
  end if;

  r := public.escrow_cancel_as(guest_u, esc, 'changed my mind');
  if r->>'status' not in ('already_funded', 'not_cancellable') then
    raise exception 'PROBE FAILED: a funded agreement was withdrawn: %', r;
  end if;

  raise exception
    'PROBE ALL PASS (rolled back). Refusals: stranger, outsider, purchase_balance, purchase_deposit, zero, self, example property, second proposal, payee funding, stranger funding, empty balance, refunding twice, withdrawing a funded one. Passes: proposal INITIATED, birth row names the proposer from the row, funding to HELD under rm-esc-<id>-hold, one ledger entry, spendable delta 0, float balanced.';
end
$probe$;
