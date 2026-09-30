/*
 * THE LIFECYCLE EMAILS: THIRTEEN EVENTS THE APP ANNOUNCED AND EMAIL DID NOT.
 *
 * Applied 30 September 2026 with the founder's approval, after the PR #75
 * deploy that knows these templates was live.
 *
 * (It was held in pending/ on purpose: apply only after the app that knows
 * these templates is deployed.) The drain (`apps/web/src/lib/notify/outbox.ts`)
 * settles a row whose template the running code does not know as DROPPED,
 * permanently ("no template: ..."). Applied before the deploy, every event in
 * the gap would lose its email for good. The builders are in
 * `apps/web/src/lib/email/lifecycle-messages.ts` and the registry entries in
 * `apps/web/src/lib/notify/templates.ts`. When applying: apply, rename this
 * file to `<version>_email_lifecycle_triggers.sql` in supabase/migrations,
 * and record it.
 *
 * Every event below already writes an in-app notification (the trigger or
 * function named beside it); this adds the email, in the same transaction,
 * through `private.email_outbox_enqueue`, whose unique dedupe key makes each
 * one once-ever. Rows carry ids, and people's names, listing titles and
 * addresses are read by the drain at send time. THREE EXCEPTIONS, stated
 * rather than hidden, each a short text written FOR the recipient and copied
 * at enqueue time because the drain has no read for it:
 *   inspection.declined       `note`: the lister's own note to the requester,
 *                             first 300 characters;
 *   verification.rung_failed  `note`: the reviewer's note to the agent,
 *                             first 500 characters;
 *   reservation.*             `place_name`: the restaurant's public trading
 *                             name (or the listing title).
 * They live in public.email_outbox (RLS on, no policy, service role only)
 * until the row is purged with the rest of the queue.
 *
 *   inspection_requests  state -> PROPOSED   inspection.proposed  (requester)
 *                        state -> DECLINED   inspection.declined  (requester)
 *                        state -> WITHDRAWN  inspection.withdrawn (lister)
 *                        state -> COMPLETED  inspection.completed (both)
 *     (private.notify_inspection_change announces the same four in the app)
 *   support_ticket_messages  staff reply     support.replied      (ticket owner)
 *     (private.notify_support_reply)
 *   deal_agreements      inserted            agreement.waiting    (both)
 *                        status -> in_review agreement.submitted  (both)
 *                        status -> cancelled agreement.cancelled  (both)
 *     agreement.waiting uses the SAME dedupe key private.agreement_tell_both
 *     composes, so the stay path, which already sends it, still sends once;
 *     the rent path (public.agreement_open_rent_as) now sends it too. On the
 *     rent path the party who drew the agreement up is skipped only when the
 *     caller is visible as auth.uid(); called by the service role with
 *     p_actor, that party is told as well, as the stay path already does
 *     (agreement_open_rent_as sets no session value naming the actor).
 *   guarantee_claims     inserted            guarantee.claim_opened (claimant)
 *   agent_verification_checks  -> failed     verification.rung_failed (agent)
 *   listings             status -> SUBMITTED listing.submitted    (lister)
 *   reservations         status -> CONFIRMED reservation.confirmed (guest)
 *                        status -> CANCELLED reservation.cancelled (guest)
 *     (private.notify_reservation)
 *   refund_requests      inserted            refund.requested     (guest)
 *
 * Preferences: the viewing, table and refund templates answer to the
 * Bookings switch in the drain (`channel: "bookings"`), which reads it at
 * send time. The rest are obligations (an agreement, a claim, a support
 * answer, a verification decision, a listing receipt) and answer to nothing,
 * as `docs/email/WHAT_SENDS.md` records.
 *
 * NOT HERE, AND WHY: payment received and receipts belong to the crypto
 * payment work, which writes `payment.received` / `payment.receipt` from its
 * own trigger. A booking reminder is a schedule, not an event, and needs a
 * cron job. An email change is refused by design (the address never
 * changes).
 */

/* ---------------------------------------------------------------- viewings */

create or replace function private.enqueue_inspection_change_email()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.state is not distinct from old.state then
    return new;
  end if;

  if new.state = 'PROPOSED' then
    /* A lister can offer more than one time; each offer is its own email. */
    perform private.email_outbox_enqueue(
      new.requester_id, 'inspection.proposed',
      'inspection:' || new.id::text || ':PROPOSED:' || coalesce(extract(epoch from new.slot_at)::bigint::text, 'none'),
      jsonb_build_object('inspection_id', new.id, 'listing_id', new.listing_id, 'slot_at', new.slot_at));

  elsif new.state = 'DECLINED' then
    perform private.email_outbox_enqueue(
      new.requester_id, 'inspection.declined',
      'inspection:' || new.id::text || ':DECLINED',
      jsonb_build_object('inspection_id', new.id, 'listing_id', new.listing_id,
                         'note', nullif(left(btrim(coalesce(new.lister_note, '')), 300), '')));

  elsif new.state = 'WITHDRAWN' then
    perform private.email_outbox_enqueue(
      new.lister_id, 'inspection.withdrawn',
      'inspection:' || new.id::text || ':WITHDRAWN',
      jsonb_build_object('inspection_id', new.id, 'listing_id', new.listing_id,
                         'counterparty_id', new.requester_id,
                         'slot_at', coalesce(new.slot_at, new.requested_at)));

  elsif new.state = 'COMPLETED' then
    perform private.email_outbox_enqueue(
      new.requester_id, 'inspection.completed',
      'inspection:' || new.id::text || ':COMPLETED:' || new.requester_id::text,
      jsonb_build_object('inspection_id', new.id, 'listing_id', new.listing_id,
                         'audience', 'viewer', 'counterparty_id', new.lister_id));
    perform private.email_outbox_enqueue(
      new.lister_id, 'inspection.completed',
      'inspection:' || new.id::text || ':COMPLETED:' || coalesce(new.lister_id::text, 'none'),
      jsonb_build_object('inspection_id', new.id, 'listing_id', new.listing_id,
                         'audience', 'lister', 'counterparty_id', new.requester_id));
  end if;

  return new;
end;
$$;

drop trigger if exists inspection_requests_enqueue_change_email on public.inspection_requests;
create trigger inspection_requests_enqueue_change_email
  after update of state on public.inspection_requests
  for each row execute function private.enqueue_inspection_change_email();

/* ----------------------------------------------------------------- support */

create or replace function private.enqueue_support_reply_email()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  owner_user uuid;
  ticket_ref text;
begin
  if new.sender_role <> 'admin' then
    return new;
  end if;
  select t.user_id, t.reference into owner_user, ticket_ref
    from public.support_tickets t where t.id = new.ticket_id;
  /* A ticket filed signed out has no account to resolve an address from;
     the outbox only mails accounts. Its reply is read at the link the
     filing email carried. */
  if owner_user is null or ticket_ref is null then
    return new;
  end if;
  perform private.email_outbox_enqueue(
    owner_user, 'support.replied',
    'support:reply:' || new.id::text,
    jsonb_build_object('ticket_id', new.ticket_id, 'reference', ticket_ref));
  return new;
end;
$$;

drop trigger if exists support_ticket_messages_enqueue_reply_email on public.support_ticket_messages;
create trigger support_ticket_messages_enqueue_reply_email
  after insert on public.support_ticket_messages
  for each row execute function private.enqueue_support_reply_email();

/* -------------------------------------------------------------- agreements */

create or replace function private.enqueue_agreement_lifecycle_email()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  template text;
  who uuid;
begin
  if tg_op = 'INSERT' then
    template := 'agreement.waiting';
  elsif new.status is distinct from old.status and new.status = 'in_review' then
    template := 'agreement.submitted';
  elsif new.status is distinct from old.status and new.status = 'cancelled' then
    template := 'agreement.cancelled';
  else
    return new;
  end if;

  foreach who in array array[new.renter_id, new.owner_id] loop
    /* "Terms waiting for your confirmation" is not news to the person who
       just drew the terms up. When the caller is visible (auth.uid(), a
       member's own client) they are skipped. public.agreement_open_rent_as
       runs with p_actor and sets no session value this trigger could read,
       so under the service role both parties are told, which is what the
       stay path's private.agreement_tell_both already does. */
    if template = 'agreement.waiting' and who = (select auth.uid()) then
      continue;
    end if;
    /* The key private.agreement_tell_both composes, exactly, so an event
       both paths announce is one email. */
    perform private.email_outbox_enqueue(
      who, template,
      template || ':' || new.id::text || ':' || new.terms_version::text || ':' || who::text,
      jsonb_build_object('agreement_id', new.id, 'listing_id', new.listing_id,
                         'kind', new.kind, 'amount_minor', new.amount_minor,
                         'viewer', case when who = new.renter_id then 'renter' else 'owner' end));
  end loop;
  return new;
end;
$$;

drop trigger if exists deal_agreements_enqueue_lifecycle_email on public.deal_agreements;
create trigger deal_agreements_enqueue_lifecycle_email
  after insert or update of status on public.deal_agreements
  for each row execute function private.enqueue_agreement_lifecycle_email();

/* --------------------------------------------------------------- guarantee */

create or replace function private.enqueue_guarantee_claim_email()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.agreement_id is null then
    return new;
  end if;
  perform private.email_outbox_enqueue(
    new.claimant_id, 'guarantee.claim_opened',
    'guarantee:claim:' || new.id::text || ':opened',
    jsonb_build_object('claim_id', new.id, 'agreement_id', new.agreement_id,
                       'requested_minor', new.requested_minor));
  return new;
end;
$$;

drop trigger if exists guarantee_claims_enqueue_opened_email on public.guarantee_claims;
create trigger guarantee_claims_enqueue_opened_email
  after insert on public.guarantee_claims
  for each row execute function private.enqueue_guarantee_claim_email();

/* ------------------------------------------------------------ verification */

create or replace function private.enqueue_verification_failed_email()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user uuid;
  v_rung text;
begin
  if new.status <> 'failed' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;
  /* The same mapping private.enqueue_verification_rung_email makes, plus
     payout, whose failure the lister does need to hear about. */
  v_rung := case new.kind
    when 'identity' then 'identity'
    when 'address' then 'address'
    when 'in_person' then 'inspection'
    when 'payout' then 'payout'
    else null
  end;
  if v_rung is null then
    return new;
  end if;
  select a.user_id into v_user from public.agents a where a.id = new.agent_id;
  perform private.email_outbox_enqueue(
    v_user, 'verification.rung_failed',
    'verification:' || new.agent_id::text || ':' || new.kind || ':failed:'
      || extract(epoch from coalesce(new.decided_at, now()))::bigint::text,
    jsonb_build_object('agent_id', new.agent_id, 'rung', v_rung,
                       'note', nullif(left(btrim(coalesce(new.note, '')), 500), '')));
  return new;
end;
$$;

drop trigger if exists agent_verification_checks_enqueue_failed_email on public.agent_verification_checks;
create trigger agent_verification_checks_enqueue_failed_email
  after insert or update of status on public.agent_verification_checks
  for each row execute function private.enqueue_verification_failed_email();

/* ---------------------------------------------------------------- listings */

create or replace function private.enqueue_listing_submitted_email()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user uuid;
begin
  if new.status <> 'SUBMITTED' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;
  if new.is_demo then
    return new;
  end if;
  select a.user_id into v_user from public.agents a where a.id = new.agent_id;
  /* Each submission is its own receipt: a listing sent back and sent again
     is told both times. */
  perform private.email_outbox_enqueue(
    v_user, 'listing.submitted',
    'listing:' || new.id::text || ':SUBMITTED:' || extract(epoch from now())::bigint::text,
    jsonb_build_object('listing_id', new.id));
  return new;
end;
$$;

drop trigger if exists listings_enqueue_submitted_email on public.listings;
create trigger listings_enqueue_submitted_email
  after insert or update of status on public.listings
  for each row execute function private.enqueue_listing_submitted_email();

/* ------------------------------------------------------------ reservations */

create or replace function private.enqueue_reservation_email()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  template text;
  venue text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;
  template := case new.status
    when 'CONFIRMED' then 'reservation.confirmed'
    when 'CANCELLED' then 'reservation.cancelled'
    else null
  end;
  if template is null then
    return new;
  end if;
  /* The trading name a restaurant shows on its own page, or the listing
     title; the same place private.notify_reservation names. */
  if new.listing_id is not null then
    select l.title into venue from public.listings l where l.id = new.listing_id;
  else
    select b.name into venue from public.businesses b where b.id = new.business_id;
  end if;
  perform private.email_outbox_enqueue(
    new.guest_id, template,
    'reservation:' || new.id::text || ':' || new.status::text,
    jsonb_build_object('reservation_id', new.id, 'listing_id', new.listing_id,
                       'place_name', venue, 'reserved_for', new.reserved_for,
                       'party_size', new.party_size));
  return new;
end;
$$;

drop trigger if exists reservations_enqueue_email on public.reservations;
create trigger reservations_enqueue_email
  after update of status on public.reservations
  for each row execute function private.enqueue_reservation_email();

/* ----------------------------------------------------------------- refunds */

create or replace function private.enqueue_refund_requested_email()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_guest uuid := new.guest_id;
begin
  if v_guest is null then
    select b.guest_id into v_guest from public.bookings b where b.id = new.booking_id;
  end if;
  perform private.email_outbox_enqueue(
    v_guest, 'refund.requested',
    'refund:' || new.id::text || ':requested',
    jsonb_build_object('refund_request_id', new.id, 'booking_id', new.booking_id,
                       'due_by', new.due_by));
  return new;
end;
$$;

drop trigger if exists refund_requests_enqueue_email on public.refund_requests;
create trigger refund_requests_enqueue_email
  after insert on public.refund_requests
  for each row execute function private.enqueue_refund_requested_email();

/* Trigger functions only: nobody calls these by name. */
revoke all on function
  private.enqueue_inspection_change_email(),
  private.enqueue_support_reply_email(),
  private.enqueue_agreement_lifecycle_email(),
  private.enqueue_guarantee_claim_email(),
  private.enqueue_verification_failed_email(),
  private.enqueue_listing_submitted_email(),
  private.enqueue_reservation_email(),
  private.enqueue_refund_requested_email()
from public, anon, authenticated;

/* Read-back: every trigger is in place and enabled. */
do $check$
declare
  n integer;
begin
  select count(*) into n from pg_trigger
   where not tgisinternal and tgenabled <> 'D'
     and tgname in (
       'inspection_requests_enqueue_change_email',
       'support_ticket_messages_enqueue_reply_email',
       'deal_agreements_enqueue_lifecycle_email',
       'guarantee_claims_enqueue_opened_email',
       'agent_verification_checks_enqueue_failed_email',
       'listings_enqueue_submitted_email',
       'reservations_enqueue_email',
       'refund_requests_enqueue_email');
  if n <> 8 then
    raise exception 'email lifecycle: expected 8 enabled triggers, found %', n;
  end if;
end;
$check$;
