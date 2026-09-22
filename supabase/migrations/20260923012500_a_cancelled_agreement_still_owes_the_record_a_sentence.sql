/*
 * TWO FAULTS THE EVIDENCE PROBE TURNED UP ON ITS WAY PAST.
 *
 * ONE. `escrows_resolution_has_a_note` has been on this table since August:
 *
 *   check (resolved_at is null or (resolved_by is not null
 *          and resolution_note is not null
 *          and char_length(btrim(resolution_note)) >= 4))
 *
 * `public.escrow_cancel_as`, shipped a few hours ago in 20260922221000, sets
 * `resolved_at` and `resolved_by` and passes the caller's reason straight
 * through. Called with no reason, or with a reason of three characters, it
 * would have violated that constraint and RAISED, where every other refusal
 * in this feature answers with a status. A declined proposal is the ordinary
 * case; it would have failed on the ordinary case.
 *
 * It was not caught by the concurrency probe, and the reason is worth writing
 * down: the probe's minimal schema copied the COLUMNS of `escrows` and not its
 * CHECK CONSTRAINTS, so the scratch database was more permissive than
 * production and the probe passed something production would have refused.
 * The harness now carries the five real constraints, and with them it
 * reproduces this fault exactly.
 *
 * The fix is not to loosen the constraint. A record that says an agreement
 * ended and does not say why is the kind of record nobody can use six months
 * later. A cancellation always has a sentence: the person's own, or the
 * platform's plain one.
 *
 * TWO. EVERY STATE TRANSITION IS AUDITED, AND THE ACTOR WAS ALWAYS NULL.
 * `private.escrow_guard_transition` records `auth.uid()` as the actor. Every
 * escrow write on this platform now runs through a server action as the
 * SERVICE ROLE, where `auth.uid()` is null, so the audit trail recorded who
 * did what as nobody, every time, for every transition. The row already
 * carries the actor in `release_requested_by`, `disputed_by` and `resolved_by`
 * because each door writes it; the trigger now falls back to those, and the
 * metadata says which of the two answered.
 */

create or replace function public.escrow_cancel_as(
  p_actor uuid,
  p_escrow uuid,
  p_reason text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.escrows;
  note text;
begin
  if p_actor is null then
    return jsonb_build_object('status', 'signed_out');
  end if;
  if p_escrow is null then
    return jsonb_build_object('status', 'bad_request');
  end if;

  select * into e from public.escrows where id = p_escrow for update;
  if e.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if p_actor <> e.payer_id and p_actor <> e.payee_id then
    return jsonb_build_object('status', 'not_a_party');
  end if;
  if e.state = 'CANCELLED' then
    /* A second tap is not a second cancellation. */
    return jsonb_build_object('status', 'ok', 'escrow_id', e.id, 'state', 'CANCELLED',
                              'amount_minor', e.amount_minor);
  end if;
  if e.state not in ('INITIATED', 'FUNDED') then
    return jsonb_build_object('status', 'not_cancellable', 'state', e.state);
  end if;

  /*
   * THE LINE THIS FUNCTION EXISTS FOR.
   *
   * FUNDED is legal in the state machine because the two updates that carry an
   * escrow from INITIATED to HELD pass through it, and a crash between them
   * would strand a row there. But a hold that POSTED is money that left a
   * balance, and money that left a balance has to be refunded rather than
   * cancelled. So the state is not the test: the ledger is.
   */
  if exists (
    select 1 from public.wallet_entries w
     where w.kind = 'escrow_hold'
       and (w.metadata ->> 'escrow_id') = e.id::text
  ) then
    return jsonb_build_object('status', 'already_funded', 'state', e.state);
  end if;

  /*
   * `escrows_resolution_has_a_note` wants at least four characters beside
   * `resolved_at`, and it is right to. Where the person gave no reason the
   * record gets the plain one rather than nothing.
   */
  note := nullif(btrim(coalesce(p_reason, '')), '');
  if note is null or char_length(note) < 4 then
    note := case when p_actor = e.payer_id
                 then 'Withdrawn by the person who proposed it, before any money moved.'
                 else 'Declined by the person it was proposed to, before any money moved.' end;
  end if;

  update public.escrows
     set state = 'CANCELLED',
         resolution_note = note,
         resolved_by = p_actor,
         resolved_at = now()
   where id = e.id;

  perform private.notify(
    case when p_actor = e.payer_id then e.payee_id else e.payer_id end,
    'wallet',
    case when p_actor = e.payer_id then 'A proposed payment was withdrawn' else 'A proposed payment was declined' end,
    'Nothing was taken from either balance.',
    '/escrow/' || e.id::text
  );

  return jsonb_build_object(
    'status', 'ok', 'escrow_id', e.id, 'state', 'CANCELLED',
    'amount_minor', e.amount_minor, 'note', note
  );
end;
$$;

create or replace function private.escrow_guard_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  /*
   * auth.uid() FIRST, BECAUSE A SIGNED-IN ACTOR IS THE BEST ANSWER. Then the
   * columns the doors themselves write, because every escrow write runs as the
   * service role through a server action and auth.uid() is null there. Before
   * this line every escrow transition in the audit log recorded its actor as
   * nobody.
   */
  actor uuid := coalesce(
    auth.uid(),
    case new.state
      when 'RELEASE_REQUESTED' then new.release_requested_by
      when 'DISPUTED' then new.disputed_by
      when 'RESOLVED' then new.resolved_by
      when 'CANCELLED' then new.resolved_by
      else null
    end,
    new.resolved_by,
    new.disputed_by,
    new.release_requested_by
  );
begin
  if new.state is distinct from old.state then
    if not private.escrow_transition_is_legal(old.state, new.state) then
      raise exception
        'escrow % cannot go from % to %', old.id, old.state, new.state
        using errcode = 'check_violation';
    end if;

    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values (
      actor,
      'escrow.' || lower(new.state::text),
      'escrow',
      new.id::text,
      jsonb_build_object(
        'from', old.state,
        'to', new.state,
        'amount_minor', new.amount_minor,
        'purpose', new.purpose,
        'payer_id', new.payer_id,
        'payee_id', new.payee_id,
        'listing_id', new.listing_id,
        'dispute_reason', new.dispute_reason,
        'resolution_note', new.resolution_note,
        'resolved_by', new.resolved_by,
        'commission_minor', new.commission_minor,
        'actor_source', case when auth.uid() is not null then 'session' else 'row' end
      )
    );
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.escrow_cancel_as(uuid, uuid, text) from public, anon, authenticated;
revoke all on function private.escrow_guard_transition() from public, anon, authenticated;
grant execute on function public.escrow_cancel_as(uuid, uuid, text) to service_role;

do $$
declare leak text;
begin
  select string_agg(p.oid::regprocedure::text || ' -> ' || r.rolname, ', ') into leak
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    cross join (values ('anon'), ('authenticated')) as r(rolname)
   where ((n.nspname = 'public' and p.proname = 'escrow_cancel_as')
       or (n.nspname = 'private' and p.proname = 'escrow_guard_transition'))
     and has_function_privilege(r.rolname, p.oid, 'EXECUTE');
  if leak is not null then raise exception 'RULE 21 VIOLATED: %', leak; end if;
end;
$$;
