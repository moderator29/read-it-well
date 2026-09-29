/*
 * THE REVIEW OF THE LANDLORD LINE, ANSWERED. Fixes to migrations 20260924110000
 * to 20260924110200, none of which is applied yet, written as their own file
 * so the reviewer's findings and the answer to each can be read side by side.
 *
 * 1. A CLOSED LISTING STAYS CLOSED FOR EVERY ROLE, NOT ONLY FOR A CLIENT.
 *    Lifting a stop (`private.reinstate_agent`) restored every SUSPENDED
 *    listing the stop had withdrawn, under definer rights, and a listing the
 *    agent closed as let while stopped came straight back to PUBLISHED. The
 *    old guard keyed on `current_user`, which a definer function is not. Now a
 *    trigger refuses any change to the status or the close of a closed row
 *    from a client (with a sentence), and from any definer path it SKIPS the
 *    row (the update touches nothing, so `reinstate_agent`'s own `found` stays
 *    false and the listing is not counted or announced as restored). The only
 *    way back is `reopen_listing`, staff only, with a note and an audit row,
 *    which sets a transaction-local setting the trigger reads.
 *
 * 2. A LET TAKES DOWN ONLY THE COPIES IT CAN PROVE IT SPEAKS FOR.
 *    An unverified "let elsewhere", or a "principal" who is really the agent's
 *    second SIM answering 2, could close a rival's copy of the same property.
 *    Now:
 *      let_through_vallo    closes every copy: the paid charge is the proof.
 *      let_owner_confirmed  closes the copies whose APPROVED mandate names the
 *                           same principal key as the one who answered.
 *      anything else        closes this listing only.
 *    Every copy left open is told, and its own principal is asked at once
 *    (`sibling_let`), within the per-number limit below. The match panel now
 *    says "Different owner on record" when both keys exist and differ, and the
 *    principal key comes from APPROVED mandates only, never from what a lister
 *    typed into a pending one.
 *
 * 3. THE CONSENT SENTENCE IS THE TRUE MAXIMUM. At most one vacancy message to
 *    a NUMBER in any seven days, whatever the reason and however many agents
 *    list the flat; the sentence the reviewer reads now says "never more than
 *    once a week". An answer of 1 or 2 applies to every copy on the property
 *    whose approved mandate names the same principal, so one message per number
 *    still covers all of that principal's copies.
 *
 * 4. SILENCE COUNTS ONLY FROM SOMEBODY WHO CAN STILL BE ASKED. The sweep
 *    ignores questions to a principal who has stopped, withdrawn, lost their
 *    approval or expired, and questions past their own expiry; a stop or a
 *    withdrawal clears the mark at once. With the flag off, the mark is ignored
 *    everywhere immediately rather than at the next sweep.
 *
 * 5. NOTHING IS SENT THAT IS NOT LOGGED, AND NOTHING IS CLAIMED THAT WAS NOT
 *    SENT. `landlord_line_claim` re-checks consent immediately before a send;
 *    the message log's gate reads the question's own mandate and requires it
 *    to be marked sent; a question marked sent an hour ago with no logged
 *    message goes back to unsent; and the tenant is told "we sent the landlord
 *    these figures" only when a message on a real channel is logged.
 *
 * 6. SMALLER ANSWERS. An answer is re-checked against the mandate's approval,
 *    expiry and consent when it arrives. The "I never instructed this agent"
 *    notice to the lister is held until staff act (the risk alert still goes
 *    up). The lister is told when the owner's "2" closes their listing. The
 *    reply page returns the rent figures only while the question is open.
 *    `close_listing` refuses an example. Open inspections on a closed listing
 *    are declined. Re-consenting a number that has stopped needs a note.
 */

/* ---------------------------------------------- the key: approved mandates */

create or replace function private.listing_principal_key(p_listing uuid)
returns text
language sql
stable
security definer
set search_path to ''
as $function$
  select m.principal_key
    from public.listing_mandates m
   where m.listing_id = p_listing
     and m.review_status = 'approved'::public.document_review_status
     and m.principal_key is not null
   order by m.created_at desc
   limit 1;
$function$;

revoke all on function private.listing_principal_key(uuid) from public, anon, authenticated;

/* ------------------------------ the match panel says when owners differ */

drop function if exists public.property_candidates(uuid);
create function public.property_candidates(p_listing uuid)
returns table (
  listing_id uuid,
  reference text,
  title text,
  status public.listing_status,
  lister_name text,
  property_id uuid,
  same_principal boolean,
  different_principal boolean,
  distance_m integer,
  same_shape boolean,
  move_in_total_minor bigint
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  me public.listings%rowtype;
  my_key text;
begin
  if not private.is_staff() then
    raise exception 'only staff may see proposed property matches' using errcode = 'insufficient_privilege';
  end if;
  select * into me from public.listings where id = p_listing;
  if not found then
    return;
  end if;
  my_key := private.listing_principal_key(p_listing);

  return query
  with pool as (
    select c.*,
           private.listing_principal_key(c.id) as their_key,
           case when me.location is not null and c.location is not null
                then round(extensions.st_distance(me.location, c.location))::integer end as metres,
           (c.bedrooms = me.bedrooms and c.property_type = me.property_type) as shape_match
      from public.listings c
     where c.id <> me.id
       and c.is_demo = false
       and me.is_demo = false
       and c.closed_at is null
       and c.listing_intent = me.listing_intent
       and c.status in ('SUBMITTED', 'UNDER_REVIEW', 'MORE_INFO_REQUIRED', 'APPROVED', 'PUBLISHED')
       and (me.property_id is null or c.property_id is distinct from me.property_id)
       and not exists (
         select 1 from public.property_decisions d
          where d.decision = 'kept_apart'
            and ((d.listing_id = me.id and d.other_listing_id = c.id)
              or (d.listing_id = c.id and d.other_listing_id = me.id)))
  )
  select p.id, p.reference, p.title, p.status,
         coalesce(nullif(btrim(b.name), ''), nullif(btrim(a.display_name), '')),
         p.property_id,
         (my_key is not null and p.their_key = my_key),
         (my_key is not null and p.their_key is not null and p.their_key <> my_key),
         p.metres, p.shape_match, p.total_move_in_cost_minor
    from pool p
    left join public.agents a on a.id = p.agent_id
    left join public.businesses b on b.id = p.firm_id
   where p.shape_match
     and ((my_key is not null and p.their_key = my_key) or (p.metres is not null and p.metres <= 40))
   order by (my_key is not null and p.their_key = my_key) desc, p.metres nulls last
   limit 12;
end;
$function$;

revoke all on function public.property_candidates(uuid) from public, anon;
grant execute on function public.property_candidates(uuid) to authenticated;

/* ------------------------------------------ a closed listing stays closed */

/* The client half of the old guard moves here; the facts half stays. */
create or replace function private.listing_platform_facts_guard()
returns trigger
language plpgsql
security invoker
set search_path to ''
as $function$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.property_id := null;
    new.availability_confirmed_at := null;
    new.not_reconfirmed_since := null;
    new.closed_at := null;
    new.close_reason := null;
    new.closed_rent_payment_id := null;
    return new;
  end if;
  if new.property_id is distinct from old.property_id
     or new.availability_confirmed_at is distinct from old.availability_confirmed_at
     or new.not_reconfirmed_since is distinct from old.not_reconfirmed_since
     or new.closed_at is distinct from old.closed_at
     or new.close_reason is distinct from old.close_reason
     or new.closed_rent_payment_id is distinct from old.closed_rent_payment_id then
    raise exception 'these facts are written by the platform, never by editing a listing'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$function$;

create or replace function private.closed_listing_stays_closed()
returns trigger
language plpgsql
security invoker
set search_path to ''
as $function$
begin
  if old.closed_at is null then
    return new;
  end if;
  if coalesce(current_setting('vallo.listing_reopen', true), '') = 'on' then
    return new;
  end if;
  if new.status is distinct from old.status
     or new.closed_at is distinct from old.closed_at
     or new.close_reason is distinct from old.close_reason then
    if current_user in ('authenticated', 'anon') then
      raise exception 'This listing was closed, and a closed listing stays closed. List the property again as a new listing.'
        using errcode = 'check_violation';
    end if;
    /* A definer path (a stop being lifted, a bulk restore) skips the row, so
       nothing it counts or announces includes a listing that stayed closed. */
    return null;
  end if;
  return new;
end;
$function$;

revoke all on function private.closed_listing_stays_closed() from public, anon, authenticated;

drop trigger if exists listings_closed_stays_closed on public.listings;
create trigger listings_closed_stays_closed
  before update on public.listings
  for each row execute function private.closed_listing_stays_closed();

/* The one way back: staff, a reason, an audit row. */
create or replace function public.reopen_listing(p_listing uuid, p_note text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  l public.listings%rowtype;
  back public.listing_status;
begin
  if not private.is_staff() then
    raise exception 'only staff may reopen a closed listing' using errcode = 'insufficient_privilege';
  end if;
  if p_note is null or length(btrim(p_note)) < 8 then
    raise exception 'say why the listing is being reopened' using errcode = 'check_violation';
  end if;
  select * into l from public.listings where id = p_listing for update;
  if l.id is null or l.closed_at is null then
    return jsonb_build_object('state', 'not_closed');
  end if;
  back := case when l.published_at is not null then 'PUBLISHED'::public.listing_status
               else 'APPROVED'::public.listing_status end;

  perform set_config('vallo.listing_reopen', 'on', true);
  update public.listings
     set status = back, closed_at = null, close_reason = null, closed_rent_payment_id = null
   where id = p_listing;
  perform set_config('vallo.listing_reopen', '', true);

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values ((select auth.uid()), 'listing.reopen', 'listing', p_listing::text,
          jsonb_build_object('was_closed_as', l.close_reason, 'note', left(btrim(p_note), 400), 'status', back));
  return jsonb_build_object('state', 'reopened', 'status', back);
end;
$function$;

revoke all on function public.reopen_listing(uuid, text) from public, anon;
grant execute on function public.reopen_listing(uuid, text) to authenticated;

/* ------------------------------------------------- one message a week, per number */

alter table public.principal_asks drop constraint if exists principal_asks_reason_check;
alter table public.principal_asks
  add constraint principal_asks_reason_check
    check (reason in ('fortnightly', 'inspection_confirmed', 'rent_paid', 'sibling_let'));

/* Has this number been sent a vacancy question in the last seven days? */
create or replace function private.principal_number_asked_recently(p_mandate uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
      from public.principal_asks q
      join public.listing_mandates qm on qm.id = q.mandate_id
      join public.listing_mandates me on me.id = p_mandate
     where q.purpose = 'vacancy'
       and qm.principal_phone = me.principal_phone
       and q.created_at > now() - interval '7 days');
$function$;

revoke all on function private.principal_number_asked_recently(uuid) from public, anon, authenticated;

create or replace function public.landlord_line_enqueue()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  n_fortnight integer := 0;
  n_inspection integer := 0;
  n_rent integer := 0;
begin
  if not private.landlord_line_open() then
    return jsonb_build_object('open', false);
  end if;

  /* One per NUMBER per statement (distinct on the phone), and none to a number
     asked in the last seven days: the consent sentence's own maximum. */
  insert into public.principal_asks (mandate_id, listing_id, purpose, reason, inspection_id)
  select distinct on (m.principal_phone) m.id, l.id, 'vacancy', 'inspection_confirmed', r.id
    from public.inspection_requests r
    join public.listings l on l.id = r.listing_id
    join public.listing_mandates m on m.listing_id = l.id
   where r.state = 'CONFIRMED'::public.inspection_state
     and coalesce(r.responded_at, r.updated_at) > now() - interval '2 days'
     and l.status = 'PUBLISHED'::public.listing_status
     and l.listing_intent = 'rent'::public.listing_intent
     and l.closed_at is null
     and m.kind in ('letting', 'management')
     and private.principal_may_be_messaged(m.id)
     and not private.principal_number_asked_recently(m.id)
     and not exists (select 1 from public.principal_asks a where a.inspection_id = r.id)
   order by m.principal_phone, r.updated_at desc
  on conflict do nothing;
  get diagnostics n_inspection = row_count;

  /* The fortnightly question, oldest-asked listing first, so a number with four
     agents on it has each copy asked in turn within the weekly limit. */
  insert into public.principal_asks (mandate_id, listing_id, purpose, reason)
  select distinct on (m.principal_phone) m.id, l.id, 'vacancy', 'fortnightly'
    from public.listings l
    join public.listing_mandates m on m.listing_id = l.id
   where l.status = 'PUBLISHED'::public.listing_status
     and l.listing_intent = 'rent'::public.listing_intent
     and l.is_demo = false
     and l.closed_at is null
     and m.kind in ('letting', 'management')
     and private.principal_may_be_messaged(m.id)
     and not private.principal_number_asked_recently(m.id)
     and not exists (select 1 from public.principal_asks a
                      where a.listing_id = l.id and a.purpose = 'vacancy'
                        and a.created_at > now() - interval '14 days')
   order by m.principal_phone,
            (select max(a.created_at) from public.principal_asks a where a.listing_id = l.id) nulls first;
  get diagnostics n_fortnight = row_count;

  insert into public.principal_asks (mandate_id, listing_id, purpose, reason, rent_payment_id)
  select distinct on (rp.id) m.id, rp.listing_id, 'rent', 'rent_paid', rp.id
    from public.rent_payments rp
    join public.listing_mandates m on m.listing_id = rp.listing_id
   where rp.created_at > now() - interval '30 days'
     and m.kind in ('letting', 'management')
     and private.principal_may_be_messaged(m.id)
     and exists (select 1 from public.transactions tx
                  where tx.booking_id = rp.booking_id
                    and tx.status = 'SUCCESSFUL'::public.transaction_status)
     and not exists (select 1 from public.principal_asks a
                      where a.rent_payment_id = rp.id and a.purpose = 'rent')
   order by rp.id, m.created_at desc
  on conflict do nothing;
  get diagnostics n_rent = row_count;

  return jsonb_build_object('open', true, 'fortnightly', n_fortnight,
                            'inspection_confirmed', n_inspection, 'rent_paid', n_rent);
end;
$function$;

revoke all on function public.landlord_line_enqueue() from public, anon, authenticated;
grant execute on function public.landlord_line_enqueue() to service_role;

/* ------------------------------------------- nothing sent that is not logged */

/* A question marked sent an hour ago with nothing logged never reached anybody. */
create or replace function private.unsend_unlogged_asks()
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  n integer;
begin
  update public.principal_asks q
     set sent_at = null, token_hash = null, reply_code = null, expires_at = null
   where q.sent_at is not null
     and q.sent_at < now() - interval '1 hour'
     and q.answered_at is null
     and not exists (select 1 from public.principal_messages pm where pm.ask_id = q.id);
  get diagnostics n = row_count;
  return n;
end;
$function$;

revoke all on function private.unsend_unlogged_asks() from public, anon, authenticated;

/* Wrap issue so every run first returns the unlogged ones to the queue. The
   issue body itself is the one in 20260924110200 and is unchanged. */
create or replace function public.landlord_line_requeue()
returns integer
language sql
security definer
set search_path to ''
as $function$
  select private.unsend_unlogged_asks();
$function$;

revoke all on function public.landlord_line_requeue() from public, anon, authenticated;
grant execute on function public.landlord_line_requeue() to service_role;

/* Immediately before a send: may this question still go out? */
create or replace function public.landlord_line_claim(p_ask uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select private.landlord_line_open()
     and exists (
       select 1 from public.principal_asks q
        where q.id = p_ask
          and q.sent_at is not null
          and q.answered_at is null
          and q.expires_at > now()
          and private.principal_may_be_messaged(q.mandate_id)
          /* "Is it still available?" about a listing that closed since the
             question was issued is not sent; a rent message still is. */
          and (q.purpose = 'rent'
               or exists (select 1 from public.listings l
                           where l.id = q.listing_id and l.closed_at is null)));
$function$;

revoke all on function public.landlord_line_claim(uuid) from public, anon, authenticated;
grant execute on function public.landlord_line_claim(uuid) to service_role;

/* The log's gate reads the question's own mandate and requires it sent. */
create or replace function private.principal_messages_consent_gate()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  q public.principal_asks%rowtype;
begin
  select * into q from public.principal_asks where id = new.ask_id;
  if q.id is null or q.sent_at is null then
    raise exception 'a message is logged only for a question that was issued'
      using errcode = 'check_violation';
  end if;
  new.mandate_id := q.mandate_id;
  if not private.landlord_line_open() then
    raise exception 'the landlord line is switched off, so nothing is sent to a principal'
      using errcode = 'insufficient_privilege';
  end if;
  if not private.principal_may_be_messaged(q.mandate_id) then
    raise exception 'this principal has not consented to be messaged, so no message may be recorded as sent'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$function$;

/* --------------------------------------------------------- the closing */

drop function if exists private.close_listings(uuid, text, uuid, uuid);
create or replace function private.close_listings(
  p_listing uuid,
  p_reason text,
  p_rent_payment uuid,
  p_actor uuid,
  p_principal_key text default null
)
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  me public.listings%rowtype;
  t record;
  follower uuid;
  lister uuid;
  words text;
  n integer := 0;
  is_let boolean := p_reason in ('let_through_vallo', 'let_elsewhere', 'let_owner_confirmed');
  m record;
  claims text;
begin
  select * into me from public.listings where id = p_listing for update;
  if not found then
    raise exception 'no such listing' using errcode = 'no_data_found';
  end if;
  if me.closed_at is not null then
    return 0;
  end if;

  for t in
    select l.id, l.agent_id
      from public.listings l
     where l.closed_at is null
       and (l.id = p_listing
            or (me.property_id is not null and l.property_id = me.property_id
                and l.status in ('PUBLISHED', 'APPROVED', 'SUBMITTED', 'UNDER_REVIEW', 'MORE_INFO_REQUIRED')
                and (p_reason = 'let_through_vallo'
                     or (p_reason = 'let_owner_confirmed' and p_principal_key is not null
                         and exists (select 1 from public.listing_mandates lm
                                      where lm.listing_id = l.id
                                        and lm.review_status = 'approved'::public.document_review_status
                                        and lm.principal_key = p_principal_key)))))
     order by (l.id = p_listing) desc
     for update
  loop
    update public.listings
       set status = 'SUSPENDED'::public.listing_status,
           closed_at = now(),
           close_reason = case when t.id = p_listing then p_reason else 'let_same_property' end,
           closed_rent_payment_id = case when t.id = p_listing then p_rent_payment end
     where id = t.id;
    n := n + 1;

    words := private.listing_place_words(t.id);
    select a.user_id into lister from public.agents a where a.id = t.agent_id;

    for follower in
      select distinct x.uid
        from (
          select r.requester_id as uid from public.inspection_requests r
           where r.listing_id = t.id and r.state in ('REQUESTED', 'CONFIRMED', 'PROPOSED')
          union
          select s.user_id from public.saved_items s where s.listing_id = t.id
        ) x
       where x.uid is distinct from lister
    loop
      perform private.notify(
        follower, 'listing'::public.notification_kind,
        case when is_let or t.id <> p_listing then 'A flat you were following has been let'
             else 'A listing you were following has closed' end,
        'The ' || words || ' is no longer available. Here are others nearby.',
        '/search?q=' || replace(coalesce(nullif(btrim((select area from public.listings where id = t.id)), ''), ''), ' ', '+'));
    end loop;

    /* Open inspections on a closed listing end with it. The transition guard
       lets the lister or the platform decline, not a member of staff acting on
       someone else's listing, so the decline runs as the platform: the claims
       are cleared for this one statement and put back. */
    claims := current_setting('request.jwt.claims', true);
    begin
      perform set_config('request.jwt.claims', '{}', true);
      update public.inspection_requests
         set state = 'DECLINED'::public.inspection_state
       where listing_id = t.id and state in ('REQUESTED', 'CONFIRMED', 'PROPOSED');
      perform set_config('request.jwt.claims', coalesce(claims, ''), true);
    exception when check_violation then
      perform set_config('request.jwt.claims', coalesce(claims, ''), true);
    end;

    if t.id <> p_listing then
      perform private.notify(lister, 'listing'::public.notification_kind,
        'Your listing was closed because the flat has been let',
        'The same ' || words || ' was let, so every listing of it with the same owner came down together.',
        '/agent/listings');
    elsif p_reason = 'let_owner_confirmed' then
      perform private.notify(lister, 'listing'::public.notification_kind,
        'The owner told us the flat has been let',
        'The owner named on the mandate for the ' || words || ' answered that it has been let, so the listing was closed.',
        '/agent/listings');
    end if;

    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values (p_actor, 'listing.close', 'listing', t.id::text,
            jsonb_build_object('reason', case when t.id = p_listing then p_reason else 'let_same_property' end,
                               'closed_with', p_listing, 'property_id', me.property_id));
  end loop;

  /* Copies of a let property that this let could not speak for: tell their
     listers, and ask their own principal at once, within the weekly limit. */
  if is_let and me.property_id is not null then
    for m in
      select l.id as listing_id, a.user_id, lm.id as mandate_id
        from public.listings l
        join public.agents a on a.id = l.agent_id
        left join lateral (
          select x.id from public.listing_mandates x
           where x.listing_id = l.id and x.review_status = 'approved'::public.document_review_status
           order by x.created_at desc limit 1) lm on true
       where l.property_id = me.property_id and l.closed_at is null and l.id <> p_listing
    loop
      perform private.notify(m.user_id, 'listing'::public.notification_kind,
        'Another listing of the same flat was marked let',
        'If yours has been let too, close it. We have asked its owner, where we can.',
        '/agent/listings');
      if m.mandate_id is not null and private.landlord_line_open()
         and private.principal_may_be_messaged(m.mandate_id)
         and not private.principal_number_asked_recently(m.mandate_id) then
        insert into public.principal_asks (mandate_id, listing_id, purpose, reason)
        values (m.mandate_id, m.listing_id, 'vacancy', 'sibling_let');
      end if;
    end loop;
  end if;

  return n;
end;
$function$;

revoke all on function private.close_listings(uuid, text, uuid, uuid, text) from public, anon, authenticated;

create or replace function public.close_listing(
  p_listing uuid,
  p_reason text,
  p_rent_payment uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  me public.listings%rowtype;
  paid uuid;
  n integer;
begin
  if (select auth.uid()) is null then
    raise exception 'sign in to close a listing' using errcode = 'insufficient_privilege';
  end if;
  if not (private.owns_listing(p_listing) or private.is_staff()) then
    raise exception 'only the lister may close this listing' using errcode = 'insufficient_privilege';
  end if;
  if p_reason not in ('let_through_vallo', 'let_elsewhere', 'owner_withdrew', 'mandate_ended') then
    raise exception 'choose how the listing ended' using errcode = 'check_violation';
  end if;

  select * into me from public.listings where id = p_listing;
  if me.is_demo then
    raise exception 'an example listing is not closed; it is retired from the examples desk' using errcode = 'check_violation';
  end if;
  if me.listing_intent <> 'rent'::public.listing_intent then
    raise exception 'only a rental is closed with a reason' using errcode = 'check_violation';
  end if;
  if me.closed_at is not null then
    return jsonb_build_object('closed', 0, 'already', true);
  end if;
  if me.status not in ('PUBLISHED', 'APPROVED') then
    raise exception 'only a live or approved listing can be closed' using errcode = 'check_violation';
  end if;

  if p_reason = 'let_through_vallo' then
    select rp.id into paid
      from public.rent_payments rp
     where rp.listing_id = p_listing
       and (p_rent_payment is null or rp.id = p_rent_payment)
       and exists (select 1 from public.transactions tx
                    where tx.booking_id = rp.booking_id
                      and tx.status = 'SUCCESSFUL'::public.transaction_status)
     order by rp.created_at desc
     limit 1;
    if paid is null then
      raise exception 'no rent has been paid through Vallo for this listing, so it cannot be closed as let through Vallo'
        using errcode = 'check_violation';
    end if;
  end if;

  n := private.close_listings(p_listing, p_reason, paid, (select auth.uid()), null);
  return jsonb_build_object('closed', n, 'already', false);
end;
$function$;

revoke all on function public.close_listing(uuid, text, uuid) from public, anon;
grant execute on function public.close_listing(uuid, text, uuid) to authenticated;

/* ------------------------------------------------------------- answering */

create or replace function private.principal_apply_answer(
  p_ask uuid,
  p_answer text,
  p_via text,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  a public.principal_asks%rowtype;
  rp public.rent_payments%rowtype;
  key text;
  prop uuid;
  words text;
begin
  select * into a from public.principal_asks where id = p_ask for update;
  if a.answered_at is not null then
    return jsonb_build_object('state', 'used');
  end if;
  /* The mandate must still stand when the answer arrives. */
  if not private.principal_may_be_messaged(a.mandate_id) then
    return jsonb_build_object('state', 'closed');
  end if;
  if not ((a.purpose = 'vacancy' and p_answer in ('available', 'let', 'not_instructed'))
       or (a.purpose = 'rent' and p_answer in ('confirmed', 'disputed'))) then
    return jsonb_build_object('state', 'invalid');
  end if;

  update public.principal_asks
     set answered_at = now(), answer = p_answer, answered_via = p_via,
         note = nullif(left(btrim(coalesce(p_note, '')), 400), '')
   where id = a.id;

  words := private.listing_place_words(a.listing_id);
  select m.principal_key into key from public.listing_mandates m where m.id = a.mandate_id;
  select l.property_id into prop from public.listings l where l.id = a.listing_id;

  if p_answer = 'available' then
    /* This listing, and every open copy on the same property whose approved
       mandate names the same principal: one message covers them all. */
    update public.listings l
       set availability_confirmed_at = now(), not_reconfirmed_since = null
     where l.closed_at is null
       and (l.id = a.listing_id
            or (prop is not null and key is not null and l.property_id = prop
                and exists (select 1 from public.listing_mandates lm
                             where lm.listing_id = l.id
                               and lm.review_status = 'approved'::public.document_review_status
                               and lm.principal_key = key)));
  elsif p_answer = 'let' then
    perform private.close_listings(a.listing_id, 'let_owner_confirmed', null, null, key);
  elsif p_answer = 'not_instructed' then
    perform private.close_listings(a.listing_id, 'owner_denied_mandate', null, null, null);
    /* The lister is NOT told yet: staff call the principal back first. */
    insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
    values ('high'::public.alert_severity, 'open'::public.alert_status,
            'A landlord says they never instructed this agent',
            'The principal named on the mandate for the ' || words || ' answered 3: they have not instructed this lister. The listing was closed at once and the lister has not been told. Call the principal back before anything else.',
            'listing', a.listing_id::text);
  elsif a.purpose = 'rent' then
    select * into rp from public.rent_payments where id = a.rent_payment_id;
    if p_answer = 'disputed' then
      insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
      values ('high'::public.alert_severity, 'open'::public.alert_status,
              'A landlord disputes the rent a tenant paid',
              'The principal for the ' || words || ' says the figures paid are not what they agreed.'
                || coalesce(' Their note: ' || nullif(left(btrim(coalesce(p_note, '')), 400), ''), ''),
              'rent_payment', a.rent_payment_id::text);
      perform private.notify(rp.tenant_id, 'booking'::public.notification_kind,
        'The landlord has questioned the rent figures',
        'The owner of the ' || words || ' says the figures are not what they agreed. Our team is looking into it and will contact you.',
        '/rent/pay/' || rp.inspection_id::text);
    else
      perform private.notify(rp.tenant_id, 'booking'::public.notification_kind,
        'The landlord confirmed the rent figures',
        'The owner of the ' || words || ' confirmed the figures you paid.',
        '/rent/pay/' || rp.inspection_id::text);
    end if;
  end if;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (null, 'principal.answer.' || p_answer, 'principal_ask', a.id::text,
          jsonb_build_object('listing_id', a.listing_id, 'via', p_via, 'purpose', a.purpose));

  return jsonb_build_object('state', 'answered', 'purpose', a.purpose, 'answer', p_answer);
end;
$function$;

revoke all on function private.principal_apply_answer(uuid, text, text, text) from public, anon, authenticated;

/* The reply page read: the rent figures only while the question is open. */
create or replace function public.landlord_line_read(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  a public.principal_asks%rowtype;
  l public.listings%rowtype;
  rp public.rent_payments%rowtype;
  lister text;
  state text;
begin
  a := private.principal_ask_by_token(p_token);
  if a.id is null then
    return jsonb_build_object('state', 'unknown');
  end if;
  if not private.landlord_line_open() then
    return jsonb_build_object('state', 'closed');
  end if;

  select * into l from public.listings where id = a.listing_id;
  select coalesce(nullif(btrim(b.name), ''), nullif(btrim(ag.display_name), '')) into lister
    from public.listings x
    left join public.agents ag on ag.id = x.agent_id
    left join public.businesses b on b.id = x.firm_id
   where x.id = a.listing_id;

  state := case when a.answered_at is not null then 'used'
                when a.expires_at <= now() then 'expired'
                else 'open' end;

  if a.purpose = 'rent' and state = 'open' then
    select * into rp from public.rent_payments where id = a.rent_payment_id;
  end if;

  return jsonb_build_object(
    'state', state,
    'purpose', a.purpose,
    'place', private.listing_place_words(a.listing_id),
    'area', l.area,
    'city', l.city,
    'bedrooms', l.bedrooms,
    'property_type', l.property_type,
    'lister_name', lister,
    'asked_at', a.sent_at,
    'expires_at', a.expires_at,
    'answered_at', a.answered_at,
    'answer', case when state = 'used' then a.answer end,
    'rent', case when a.purpose = 'rent' and state = 'open' then jsonb_build_object(
        'rent_minor', rp.rent_minor,
        'caution_minor', rp.caution_minor,
        'service_minor', rp.service_minor,
        'agency_minor', rp.agency_minor,
        'legal_minor', rp.legal_minor,
        'agreement_minor', rp.agreement_minor,
        'total_minor', rp.total_minor,
        'total_stated', rp.total_stated,
        'currency', rp.currency,
        'move_in', rp.move_in,
        'rent_period', rp.rent_period) end
  );
end;
$function$;

revoke all on function public.landlord_line_read(text) from public;
grant execute on function public.landlord_line_read(text) to anon, authenticated;

/* The tenant is told "we sent the landlord these figures" only when we did. */
create or replace function public.rent_landlord_fact(p_inspection uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  rp public.rent_payments%rowtype;
  a public.principal_asks%rowtype;
  who text;
  delivered timestamptz;
begin
  select * into rp from public.rent_payments
   where inspection_id = p_inspection
     and (tenant_id = (select auth.uid()) or lister_id = (select auth.uid()));
  if not found then
    return null;
  end if;

  select * into a from public.principal_asks
   where rent_payment_id = rp.id and purpose = 'rent' and sent_at is not null;
  if not found then
    return null;
  end if;

  select min(pm.created_at) into delivered
    from public.principal_messages pm
   where pm.ask_id = a.id and pm.channel <> 'stub';
  if a.answered_at is null and delivered is null then
    return null;
  end if;

  select private.principal_first_name(m.principal_name) into who
    from public.listing_mandates m where m.id = a.mandate_id;

  return jsonb_build_object(
    'state', case a.answer when 'confirmed' then 'confirmed' when 'disputed' then 'disputed' else 'waiting' end,
    'answered_at', a.answered_at,
    'asked_at', coalesce(delivered, a.sent_at),
    'first_name', who);
end;
$function$;

revoke all on function public.rent_landlord_fact(uuid) from public, anon;
grant execute on function public.rent_landlord_fact(uuid) to authenticated;

/* ---------------------------------------------- silence, and the flag off */

create or replace function private.sweep_not_reconfirmed()
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  n integer := 0;
begin
  if not private.landlord_line_open() then
    update public.listings set not_reconfirmed_since = null where not_reconfirmed_since is not null;
    return 0;
  end if;

  /* A mark stands only while the principal can still be asked. */
  update public.listings l
     set not_reconfirmed_since = null
   where l.not_reconfirmed_since is not null
     and not exists (
       select 1 from public.listing_mandates m
        where m.listing_id = l.id and private.principal_may_be_messaged(m.id));

  update public.listings l
     set not_reconfirmed_since = now()
   where l.status = 'PUBLISHED'::public.listing_status
     and l.not_reconfirmed_since is null
     and l.closed_at is null
     and exists (
       select 1 from public.principal_asks a
        where a.listing_id = l.id
          and a.purpose = 'vacancy'
          and a.sent_at is not null
          and a.answered_at is null
          and a.sent_at <= now() - interval '21 days'
          and a.expires_at > now()
          and private.principal_may_be_messaged(a.mandate_id)
          and (l.availability_confirmed_at is null or a.sent_at > l.availability_confirmed_at)
          and exists (select 1 from public.principal_messages pm
                       where pm.ask_id = a.id and pm.channel <> 'stub'));
  get diagnostics n = row_count;
  return n;
end;
$function$;

revoke all on function private.sweep_not_reconfirmed() from public, anon, authenticated;

create or replace function private.inspection_needs_an_open_listing()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  l record;
begin
  select closed_at, not_reconfirmed_since into l from public.listings where id = new.listing_id;
  if l.closed_at is not null then
    raise exception 'This listing has been closed, so it is not taking inspections.'
      using errcode = 'check_violation';
  end if;
  if l.not_reconfirmed_since is not null and private.landlord_line_open() then
    raise exception 'The owner has not reconfirmed this listing is available, so it is not taking new inspections.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$function$;

create or replace function public.listing_landlord_facts(p_listings uuid[])
returns table (
  listing_id uuid,
  owner_confirmed_at timestamptz,
  not_reconfirmed boolean,
  offer_count integer
)
language sql
stable
security definer
set search_path to ''
as $function$
  select l.id,
         case when private.landlord_line_open() then l.availability_confirmed_at end,
         l.not_reconfirmed_since is not null and private.landlord_line_open(),
         -- how many AGENTS offer this property, so the card can say "Offered by
         -- 3 agents"; one agent's two copies are one offer
         case when l.property_id is null then 1
              else (select count(distinct o.agent_id)::integer from public.listings o
                     where o.property_id = l.property_id
                       and o.status = 'PUBLISHED'::public.listing_status
                       and o.is_demo = false) end
    from public.listings l
   where l.id = any(p_listings[1:200])
     and l.status = 'PUBLISHED'::public.listing_status
     and l.is_demo = false
     and (select auth.uid()) is not null;
$function$;

/* --------------------------------------------- stopping clears the marks */

create or replace function private.principal_stop_number(p_phone text, p_via text)
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  n integer := 0;
begin
  if p_phone is null then
    return 0;
  end if;
  update public.listing_mandates
     set principal_consent_withdrawn_at = now()
   where principal_phone = p_phone
     and principal_consented_at is not null
     and (principal_consent_withdrawn_at is null or principal_consent_withdrawn_at < principal_consented_at);
  get diagnostics n = row_count;

  delete from public.principal_asks q
   using public.listing_mandates m
   where m.id = q.mandate_id and m.principal_phone = p_phone and q.sent_at is null;
  update public.principal_asks q
     set expires_at = now()
    from public.listing_mandates m
   where m.id = q.mandate_id and m.principal_phone = p_phone
     and q.sent_at is not null and q.answered_at is null;
  update public.listings l
     set not_reconfirmed_since = null
    from public.listing_mandates m
   where m.listing_id = l.id and m.principal_phone = p_phone and l.not_reconfirmed_since is not null;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (null, 'mandate.consent.stopped', 'principal', null,
          jsonb_build_object('mandates', n, 'via', p_via));
  return n;
end;
$function$;

/* Re-consenting a number that has stopped needs a note; withdrawal clears marks. */
drop function if exists public.record_principal_consent(uuid, text, text);
create or replace function public.record_principal_consent(
  p_mandate uuid,
  p_answer text,
  p_sentence text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  m public.listing_mandates%rowtype;
  stopped timestamptz;
begin
  if not private.is_staff() then
    raise exception 'only staff record a principal''s consent' using errcode = 'insufficient_privilege';
  end if;
  if p_answer not in ('given', 'withdrawn') then
    raise exception 'consent is given or withdrawn' using errcode = 'check_violation';
  end if;

  select * into m from public.listing_mandates where id = p_mandate for update;
  if not found then
    raise exception 'no such mandate' using errcode = 'no_data_found';
  end if;
  if m.principal_phone is null then
    raise exception 'this mandate has no number for the principal, so there is nobody to ask' using errcode = 'check_violation';
  end if;

  if p_answer = 'given' then
    if p_sentence is null or length(btrim(p_sentence)) < 40 then
      raise exception 'record the sentence that was read' using errcode = 'check_violation';
    end if;
    select max(x.principal_consent_withdrawn_at) into stopped
      from public.listing_mandates x where x.principal_phone = m.principal_phone;
    if stopped is not null and (p_note is null or length(btrim(p_note)) < 8) then
      raise exception 'this number asked us to stop on %; record what the principal said on this call', stopped::date
        using errcode = 'check_violation';
    end if;
    update public.listing_mandates
       set principal_consented_at = now(),
           principal_consent_read_by = (select auth.uid()),
           principal_consent_sentence = btrim(p_sentence),
           principal_consent_withdrawn_at = null
     where id = p_mandate
     returning * into m;
  else
    update public.listing_mandates
       set principal_consent_withdrawn_at = now()
     where id = p_mandate
     returning * into m;
    delete from public.principal_asks where mandate_id = p_mandate and sent_at is null;
    update public.principal_asks
       set expires_at = now()
     where mandate_id = p_mandate and answered_at is null and sent_at is not null;
    update public.listings set not_reconfirmed_since = null
     where id = m.listing_id and not_reconfirmed_since is not null;
  end if;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values ((select auth.uid()), 'mandate.consent.' || p_answer, 'listing_mandate', p_mandate::text,
          jsonb_build_object('listing_id', m.listing_id, 'note', nullif(left(btrim(coalesce(p_note, '')), 400), '')));

  return jsonb_build_object(
    'consented_at', m.principal_consented_at,
    'withdrawn_at', m.principal_consent_withdrawn_at);
end;
$function$;

revoke all on function public.record_principal_consent(uuid, text, text, text) from public, anon;
grant execute on function public.record_principal_consent(uuid, text, text, text) to authenticated;

/* The console sees whether this NUMBER has ever stopped, on any mandate. */
drop function if exists public.mandate_consents(uuid[]);
create function public.mandate_consents(p_mandates uuid[])
returns table (
  mandate_id uuid,
  consented_at timestamptz,
  read_by_name text,
  withdrawn_at timestamptz,
  has_number boolean,
  number_stopped_at timestamptz
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
begin
  if not private.is_staff() then
    raise exception 'only staff read consent' using errcode = 'insufficient_privilege';
  end if;
  return query
  select m.id, m.principal_consented_at,
         coalesce(nullif(btrim(p.display_name), ''), nullif(btrim(p.first_name), ''), 'A member of staff'),
         m.principal_consent_withdrawn_at,
         m.principal_phone is not null,
         (select max(x.principal_consent_withdrawn_at) from public.listing_mandates x
           where x.principal_phone = m.principal_phone)
    from public.listing_mandates m
    left join public.profiles p on p.id = m.principal_consent_read_by
   where m.id = any(p_mandates[1:200]);
end;
$function$;

revoke all on function public.mandate_consents(uuid[]) from public, anon;
grant execute on function public.mandate_consents(uuid[]) to authenticated;

/* Staff reads for the console: which listings are closed, and why. */
create or replace function public.closed_listing_reasons(p_listings uuid[])
returns table (listing_id uuid, close_reason text, closed_at timestamptz)
language sql
stable
security definer
set search_path to ''
as $function$
  select l.id, l.close_reason, l.closed_at
    from public.listings l
   where l.id = any(p_listings[1:500])
     and l.closed_at is not null
     and (private.is_staff() or private.owns_listing(l.id));
$function$;

revoke all on function public.closed_listing_reasons(uuid[]) from public, anon;
grant execute on function public.closed_listing_reasons(uuid[]) to authenticated;

create or replace function public.closed_listing_count()
returns integer
language sql
stable
security definer
set search_path to ''
as $function$
  select case when private.is_staff()
              then (select count(*)::integer from public.listings where closed_at is not null) end;
$function$;

revoke all on function public.closed_listing_count() from public, anon;
grant execute on function public.closed_listing_count() to authenticated;
