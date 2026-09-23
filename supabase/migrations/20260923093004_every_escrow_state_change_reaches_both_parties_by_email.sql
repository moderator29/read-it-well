-- EIGHT ESCROW EMAILS, FOURTEEN RENDERINGS, SEVENTEEN TESTS, AND NOBODY EVER
-- RECEIVED ONE.
--
-- `lib/email/escrow-messages.ts` is finished work. Every sentence in it goes
-- through `lib/escrow/copy.ts`, so the structure rule, the date rule and the
-- banned word list are enforced in code rather than by a reviewer. It has a
-- builder for each of the eight states an agreement can end a transition in,
-- both sides of every one of them, and a refund message that did not exist
-- anywhere before it was written. Nothing sent any of it.
--
-- WHY NOT, AND WHY IT WAS NEVER GOING TO BE FIXED IN TYPESCRIPT. An escrow
-- state change is not one event at one call site. It happens in
-- `escrow_fund_from_wallet_as`, `escrow_confirm_as`, `escrow_request_release_as`,
-- `escrow_raise_dispute_as`, `escrow_cancel_as`, `escrow_admin_resolve`,
-- `escrow_settle`, `escrow_hold`, and in `escrow_sweep_timeouts`, which is a
-- pg_cron job with no TypeScript anywhere near it. Nine writers. Wiring a send
-- into each is nine chances to forget the ninth, and the ninth is the one that
-- releases money while nobody is watching.
--
-- SO THE TRIGGER IS THE JOIN, AND THE TABLE IS THE ONE THING ALL NINE AGREE
-- ON. Whatever moved the state, the state moved in `public.escrows`, under the
-- same lock, in the same transaction. One trigger there catches every path
-- that exists today and every path anybody writes tomorrow, including one
-- written in SQL by somebody who has never read this file.
--
-- ----------------------------------------------------------------------------
-- BOTH PARTIES, EVERY TIME, AND THAT IS THE POINT.
--
-- Two rows per transition, one per side, each with its own `viewer`, because
-- every builder in that module takes a viewer and says a different true thing
-- to each. An agreement where the payer can see what is happening and the
-- payee cannot is the shape of every marketplace support ticket ever written.
--
-- FUNDED IS THE ONE STATE WITH NO EMAIL, DELIBERATELY. It exists so the two
-- updates that carry an agreement from INITIATED to HELD have somewhere to be
-- between them, and it is gone within the same call. `ESCROW_EMAIL_STATES`
-- lists eight, not nine, for exactly this reason, and a message announcing a
-- state that lasts a microsecond would be a message about our own plumbing.
--
-- ----------------------------------------------------------------------------
-- WHAT IS IN THE PAYLOAD, AND WHAT IS NOT.
--
-- Ids, an amount in integer kobo, an enum, two timestamps, and the words a
-- party or an operator wrote which are going to that party's own inbox
-- verbatim. NO NAME AND NO ADDRESS. The counterparty's name and the property's
-- title are resolved at send time in `lib/notify/templates.ts`, one batched
-- read per drain, so the queue itself holds nothing about a person beyond the
-- id of the account it belongs to.
--
-- THE FILTER IS INSIDE THE FUNCTION RATHER THAN IN A `when` CLAUSE, because a
-- `when` clause on an `after insert or update` trigger cannot mention `old`
-- and cannot mention `tg_op`, so the two halves have to be told apart where
-- both are in scope.

create or replace function private.escrow_enqueue_emails()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_extra jsonb := '{}'::jsonb;
  v_net bigint;
  v_commission bigint;
begin
  /* A row that was written without its state moving is not an event. */
  if tg_op = 'UPDATE' and old.state is not distinct from new.state then
    return new;
  end if;

  /* FUNDED has no email; see the head. Nothing else is filtered here, so a
     state added to the enum without a builder is a loud missing template in
     the drain rather than a silent nothing. */
  if new.state = 'FUNDED' then
    return new;
  end if;

  v_commission := coalesce(new.commission_minor, 0);
  v_net := greatest(new.amount_minor - v_commission, 0);

  v_extra := case new.state
    when 'HELD' then jsonb_build_object('auto_release_at', new.auto_release_at)
    when 'RELEASE_REQUESTED' then jsonb_build_object(
      'auto_release_at', new.auto_release_at,
      'requested_by', new.release_requested_by
    )
    when 'RELEASED' then jsonb_build_object(
      'commission_minor', v_commission,
      'net_minor', v_net,
      /* Nobody objected and the date arrived: the sweep let it go rather than
         a person confirming it, and the copy says so. */
      'automatic', (new.auto_release_at is not null
                    and new.released_at is not null
                    and new.released_at >= new.auto_release_at)
    )
    when 'REFUNDED' then jsonb_build_object('reason', new.resolution_note)
    when 'DISPUTED' then jsonb_build_object(
      'raised_by', new.disputed_by,
      'reason', new.dispute_reason
    )
    when 'RESOLVED' then jsonb_build_object(
      'direction', case when new.released_at is not null then 'release' else 'refund' end,
      'ruling', new.resolution_note,
      'commission_minor', v_commission,
      'net_minor', v_net
    )
    when 'CANCELLED' then jsonb_build_object(
      'actor_id', new.resolved_by,
      'note', new.resolution_note
    )
    else '{}'::jsonb
  end;

  perform private.email_outbox_enqueue(
    new.payer_id,
    'escrow.' || new.state::text,
    'escrow:' || new.id::text || ':' || new.state::text || ':' || new.payer_id::text,
    jsonb_build_object(
      'escrow_id', new.id,
      'state', new.state::text,
      'viewer', 'payer',
      'counterparty_id', new.payee_id,
      'listing_id', new.listing_id,
      'purpose', new.purpose::text,
      'amount_minor', new.amount_minor
    ) || v_extra
  );

  perform private.email_outbox_enqueue(
    new.payee_id,
    'escrow.' || new.state::text,
    'escrow:' || new.id::text || ':' || new.state::text || ':' || new.payee_id::text,
    jsonb_build_object(
      'escrow_id', new.id,
      'state', new.state::text,
      'viewer', 'payee',
      'counterparty_id', new.payer_id,
      'listing_id', new.listing_id,
      'purpose', new.purpose::text,
      'amount_minor', new.amount_minor
    ) || v_extra
  );

  return new;
end;
$$;

/*
 * NO EXCEPTION HANDLER HERE, AND THAT IS THE DECISION RATHER THAN AN
 * OVERSIGHT. The enqueue is one insert into a table this migration owns, with
 * `on conflict do nothing`, whose only foreign key points at an account that
 * must exist for the escrow row to exist at all. There is no realistic failure
 * left to swallow, and swallowing would put back exactly the silence this
 * whole file is closing: a transition that happened and an email that never
 * will, with nothing anywhere saying so.
 */
revoke all on function private.escrow_enqueue_emails()
  from public, anon, authenticated;

drop trigger if exists escrows_enqueue_emails on public.escrows;
create trigger escrows_enqueue_emails
  after insert or update on public.escrows
  for each row
  execute function private.escrow_enqueue_emails();

comment on trigger escrows_enqueue_emails on public.escrows is
  'Queues one email per party per state change into public.email_outbox. The only join between the nine writers of escrows.state and the email layer.';

-- ----------------------------------------------------------------------------
-- RULE 21, AND THE TRIGGER READ BACK RATHER THAN ASSUMED.

do $$
declare
  v_open int;
  v_trigger int;
begin
  select count(*) into v_open
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private' and p.proname = 'escrow_enqueue_emails'
     and (has_function_privilege('anon', p.oid, 'EXECUTE')
       or has_function_privilege('authenticated', p.oid, 'EXECUTE'));
  if v_open <> 0 then
    raise exception 'rule 21: private.escrow_enqueue_emails is executable by anon or authenticated';
  end if;

  select count(*) into v_trigger
    from pg_trigger t join pg_class c on c.oid = t.tgrelid
   where c.relname = 'escrows' and t.tgname = 'escrows_enqueue_emails'
     and not t.tgisinternal and t.tgenabled = 'O';
  if v_trigger <> 1 then
    raise exception 'the escrow email trigger is not installed and enabled (%)', v_trigger;
  end if;
end
$$;
