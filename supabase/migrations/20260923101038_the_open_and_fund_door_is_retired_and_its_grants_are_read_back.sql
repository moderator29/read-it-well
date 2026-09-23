-- THE OPEN-AND-FUND DOOR IS RETIRED, AND THE GRANTS ARE READ BACK IN HERE.
--
-- WHAT IS BEING RETIRED AND WHY. `public.escrow_fund_from_wallet_as` opens an
-- agreement and funds it in ONE transaction. Because the row does not exist
-- when the call starts, there is nothing to derive a funding reference from,
-- so its caller had to invent one. Research 5.3 is absolute on this point: the
-- idempotency key is derived from the escrow row's id, never freshly
-- generated, "because a random uuid per attempt would make every retry a
-- second payment". The unique index on `wallet_entries.reference` catches a
-- retry that reuses the SAME string, but a client that retries by calling the
-- server action again gets a NEW string, and opens a SECOND agreement holding
-- a SECOND amount out of the same person's balance.
--
-- `public.escrow_fund_from_wallet` is its one-line delegate, which passes
-- `auth.uid()` and is therefore already dead under the service role: every
-- escrow write in this product arrives as the service role, where `auth.uid()`
-- is null and the body answers `signed_out`.
--
-- The door that replaces both is the pair applied on 23 September:
-- `escrow_propose_as` writes a row in INITIATED and moves nothing, and
-- `escrow_fund_proposal_as` funds a row that ALREADY EXISTS and derives
-- `rm-esc-<escrow uuid>-hold` inside the database from that row. There is
-- nothing for a caller to choose and therefore nothing for a caller to get
-- wrong. This closes departure 2 in ADR-E1 section 4.
--
-- WHY THIS IS A REVOKE AND NOT A DROP. The stop list forbids revoking
-- something somebody legitimately holds, so: `service_role` is the only role
-- holding EXECUTE on either function, the only thing that calls as the service
-- role is a server action, and the only server action that reached either one
-- was `openHeldPayment`, which is deleted in the same commit as this file.
-- Nobody holds it. Nothing calls it.
--
-- The FUNCTIONS THEMSELVES ARE DELIBERATELY LEFT IN PLACE, and this is not
-- timidity. `scripts/probes/escrow_concurrency.sh` is P-1 to P-6, and it funds
-- every one of those six probes through `escrow_fund_from_wallet_as`: it lifts
-- the function TEXT out of `supabase/migrations/*.sql` into a scratch cluster
-- and runs the body that ships. `scripts/probes/escrow_ruling.sql` and
-- `scripts/probes/escrow_revoke.sh` name it too. Dropping the function here
-- would not have made those probes fail: the extractor reads `create or
-- replace function` statements out of the migration files and would never see
-- a `drop`, so all six would have gone on passing against a body that no
-- longer exists in production. That is the exact shape of a blind light. The
-- probes are re-pointed at the proposal door, or they are not, as a piece of
-- work of its own; until then the body stays readable and UNREACHABLE.
--
-- NOTHING IS CREATED OR REPLACED HERE, so build rule 21's restatement rule has
-- nothing to restate. The revokes from `public`, `anon` and `authenticated`
-- are repeated anyway, because they cost nothing and because a reader of this
-- file should not have to open three earlier migrations to learn that the
-- roles a person can actually reach were already shut.

revoke all on function public.escrow_fund_from_wallet(uuid, uuid, escrow_purpose, bigint, text, integer) from public;
revoke all on function public.escrow_fund_from_wallet(uuid, uuid, escrow_purpose, bigint, text, integer) from anon;
revoke all on function public.escrow_fund_from_wallet(uuid, uuid, escrow_purpose, bigint, text, integer) from authenticated;
revoke all on function public.escrow_fund_from_wallet(uuid, uuid, escrow_purpose, bigint, text, integer) from service_role;

revoke all on function public.escrow_fund_from_wallet_as(uuid, uuid, uuid, escrow_purpose, bigint, text, integer) from public;
revoke all on function public.escrow_fund_from_wallet_as(uuid, uuid, uuid, escrow_purpose, bigint, text, integer) from anon;
revoke all on function public.escrow_fund_from_wallet_as(uuid, uuid, uuid, escrow_purpose, bigint, text, integer) from authenticated;
revoke all on function public.escrow_fund_from_wallet_as(uuid, uuid, uuid, escrow_purpose, bigint, text, integer) from service_role;

comment on function public.escrow_fund_from_wallet_as(uuid, uuid, uuid, escrow_purpose, bigint, text, integer) is
  'RETIRED 23 September 2026. Opened and funded in one call, so its funding reference could not be derived from the row and had to be invented per attempt. EXECUTE is revoked from every role including service_role. The body is kept only because scripts/probes/escrow_concurrency.sh lifts its text into a scratch cluster for P-1 to P-6. Use escrow_propose_as then escrow_fund_proposal_as.';
comment on function public.escrow_fund_from_wallet(uuid, uuid, escrow_purpose, bigint, text, integer) is
  'RETIRED 23 September 2026 with the _as sibling it delegates to. It passed auth.uid(), which is null under the service role, so it answered signed_out to every call this product could have made.';

-- THE READ-BACK, INSIDE THE MIGRATION THAT DID THE WORK.
--
-- `revoke` does not fail when there was nothing to revoke, and it does not
-- fail when it revoked less than it was asked to, so a migration of nothing
-- but revokes reports success either way. This asks the catalogue what is
-- actually true afterwards, and it raises rather than notices.
--
-- THE CONTROL IS THE LINE THAT MAKES THE REFUSALS MEAN ANYTHING. Four roles
-- answering "no" looks identical to a question that cannot answer "yes". So
-- the same predicate, on the same role, in the same transaction, is asked
-- about `escrow_fund_proposal_as`, which service_role MUST still hold because
-- it is the door the product uses. If that one comes back false this raises
-- too, and loudly, because it would mean the funding path is now shut.
do $$
declare
  retired text[] := array[
    'public.escrow_fund_from_wallet(uuid, uuid, escrow_purpose, bigint, text, integer)',
    'public.escrow_fund_from_wallet_as(uuid, uuid, uuid, escrow_purpose, bigint, text, integer)'
  ];
  fn text;
  role_name text;
  still_held text[] := '{}';
  control_holds boolean;
begin
  foreach fn in array retired loop
    foreach role_name in array array['public', 'anon', 'authenticated', 'service_role'] loop
      if has_function_privilege(role_name, fn, 'EXECUTE') then
        still_held := still_held || (role_name || ' -> ' || fn);
      end if;
    end loop;
  end loop;

  control_holds := has_function_privilege(
    'service_role',
    'public.escrow_fund_proposal_as(uuid, uuid, integer)',
    'EXECUTE'
  );

  if not control_holds then
    raise exception
      'THE CONTROL FAILED. service_role cannot execute escrow_fund_proposal_as, which is the door the product funds through. Either this migration revoked the wrong function or the funding path was already shut. Nothing above is evidence.';
  end if;

  if array_length(still_held, 1) is not null then
    raise exception
      'THE REVOKE DID NOT TAKE. EXECUTE is still held: %. The control passed, so the question can answer yes: this is a real grant, not a broken check.',
      array_to_string(still_held, ', ');
  end if;

  raise notice
    'RETIRED, READ BACK FROM pg_proc: 2 functions, 4 roles, 8 refusals, 0 grants left. THE CONTROL ANSWERED: service_role still holds EXECUTE on escrow_fund_proposal_as in the same transaction.';
end
$$;
