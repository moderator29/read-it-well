-- V-95, REVIEW FIX: AN ANSWER MUST MATCH THE BRIEF, THE THREE-ANSWER CHECK
-- IS LOCKED, AND POSTING A BRIEF IS RATE LIMITED.
--
-- answer_brief told the renter a home "matches your brief" without checking
-- it did. It now requires the listing's closed-list neighbourhood to be one
-- of the brief's, in the brief's state, with the same intent, and the kind,
-- bedroom minimum and ceiling wherever the brief sets them (hint
-- brief_no_match). The three-answer check runs under a transaction advisory
-- lock on (brief, lister), so two answers sent at once cannot both pass it.
-- post_brief allows ten briefs a day per renter (hint rate_limited), since
-- the three-open cap alone can be cycled by closing and posting again.
-- Everything else is as in 20260924122000.

create or replace function public.post_brief(
  p_state_code text,
  p_areas text[],
  p_intent text,
  p_property_type text,
  p_bedrooms_min integer,
  p_max_minor bigint,
  p_move_from date,
  p_saved_search uuid default null
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  caller uuid := (select auth.uid());
  clean text[];
  made uuid;
begin
  if caller is null then
    raise exception 'sign in' using errcode = '42501';
  end if;
  -- Ten briefs a day at most: the three-open cap alone lets a renter close
  -- and post again without end.
  if not private.consume_rate_limit('post_brief', caller::text, 10, 86400) then
    raise exception 'too many briefs today' using errcode = 'P0001', hint = 'rate_limited';
  end if;
  select coalesce(array_agg(distinct n), '{}') into clean
    from (select private.public_neighbourhood(a, p_state_code) as n from unnest(coalesce(p_areas, '{}')) as a) x
   where n is not null;
  if coalesce(array_length(clean, 1), 0) = 0 or coalesce(array_length(clean, 1), 0) > 3
     or coalesce(array_length(clean, 1), 0) <> coalesce(array_length(p_areas, 1), 0) then
    raise exception 'choose one to three neighbourhoods from the list' using errcode = '22023', hint = 'brief_areas';
  end if;
  if p_move_from is not null and (p_move_from < current_date or p_move_from > current_date + 366) then
    raise exception 'a move date within the next year' using errcode = '22023', hint = 'brief_move';
  end if;
  if (select count(*) from public.briefs b where b.user_id = caller and b.closed_at is null and b.expires_at > now()) >= 3 then
    raise exception 'three open briefs at most' using errcode = 'P0001', hint = 'brief_limit';
  end if;
  if p_saved_search is not null and not exists (
    select 1 from public.saved_searches s where s.id = p_saved_search and s.user_id = caller) then
    raise exception 'not your saved search' using errcode = '42501';
  end if;
  insert into public.briefs (user_id, saved_search_id, state_code, areas, intent, property_type, bedrooms_min, max_minor, move_from)
  values (caller, p_saved_search, upper(btrim(p_state_code)), clean, p_intent, p_property_type,
          p_bedrooms_min, p_max_minor, p_move_from)
  returning id into made;
  return made;
end;
$function$;

create or replace function public.answer_brief(p_brief uuid, p_listing uuid)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  caller uuid := (select auth.uid());
  renter uuid;
  thread uuid;
begin
  if caller is null or not private.is_verified_lister(caller) then
    raise exception 'verified listers only' using errcode = '42501';
  end if;
  if not private.lister_covers_brief(caller, p_brief) then
    raise exception 'that brief is not open to you' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.listings l join public.agents a on a.id = l.agent_id
     where l.id = p_listing and a.user_id = caller
       and l.status = 'PUBLISHED'::public.listing_status and l.is_demo = false) then
    raise exception 'answer with one of your own published listings' using errcode = '22023', hint = 'brief_listing';
  end if;
  -- The renter is told the home MATCHES their brief, so it must: one of the
  -- brief's neighbourhoods in its state, the same intent, and the kind,
  -- bedrooms and ceiling wherever the brief sets them (a let's ceiling is
  -- against a yearly rent; a let by another period does not match one).
  if not exists (
    select 1 from public.listings l join public.briefs b on b.id = p_brief
     where l.id = p_listing
       and l.state_code = b.state_code
       and private.public_neighbourhood(l.area, l.state_code) = any (b.areas)
       and l.listing_intent::text = b.intent
       and (b.property_type is null or l.property_type::text = b.property_type)
       and (b.bedrooms_min is null or coalesce(l.bedrooms, 0) >= b.bedrooms_min)
       and (b.max_minor is null or (
             case when b.intent = 'sale' then l.sale_price_minor <= b.max_minor
                  else l.rent_period::text = 'year' and l.rent_amount_minor <= b.max_minor end))) then
    raise exception 'that home does not match the brief' using errcode = '22023', hint = 'brief_no_match';
  end if;
  -- One answer at a time per lister and brief, so two at once cannot both
  -- pass the three-answer check.
  perform pg_advisory_xact_lock(hashtext('brief_answer:' || p_brief::text || ':' || caller::text));
  if (select count(*) from public.brief_answers ba where ba.brief_id = p_brief and ba.lister_id = caller) >= 3 then
    raise exception 'three answers per brief' using errcode = 'P0001', hint = 'brief_answer_limit';
  end if;
  if exists (select 1 from public.brief_answers ba where ba.brief_id = p_brief and ba.listing_id = p_listing) then
    raise exception 'already sent' using errcode = 'P0001', hint = 'brief_answer_sent';
  end if;

  select b.user_id into renter from public.briefs b where b.id = p_brief;
  /* A definer bypasses the conversation policies, so the block rule they
     carry is applied here: no thread across a block, in either direction. */
  if private.blocked_between(renter, caller) then
    raise exception 'that brief is not open to you' using errcode = '42501';
  end if;

  /* A listing thread is opened by its guest and never by a lister
     (`private.conversation_context_is_valid`), and that rule stands: a brief
     is not a way to start messaging a stranger. So the answer is shown on the
     renter's brief with a notification, and the renter opens the thread from
     it. Where the renter already has a thread with this lister about this
     listing, the card is also posted there. */
  select c.id into thread from public.conversations c
   where c.guest_id = renter and c.agent_id = caller and c.listing_id = p_listing;
  if thread is not null then
    insert into public.messages (conversation_id, sender_id, body)
    values (thread, caller, 'Shared a listing' || chr(10) || '/listing/' || p_listing::text);
    update public.conversations set last_message_at = now() where id = thread;
  end if;

  insert into public.notifications (user_id, kind, title, body, href)
  values (renter, 'listing', 'A lister answered your brief',
          'A verified lister sent a home that matches your brief. Open it to see it and message them.',
          '/saved/searches#briefs');

  insert into public.brief_answers (brief_id, listing_id, lister_id, conversation_id)
  values (p_brief, p_listing, caller, thread);
  return thread;
end;
$function$;

comment on function public.answer_brief(uuid, uuid) is
  'V-95. Answers a brief with one of the caller''s own published real listings that matches it (neighbourhood, state, intent, and kind, bedrooms and ceiling where set): shown on the renter''s brief with a notification (and posted into an existing thread about it). Three per lister per brief under a lock, one per listing. No text.';

revoke all on function public.post_brief(text, text[], text, text, integer, bigint, date, uuid) from public, anon;
revoke all on function public.answer_brief(uuid, uuid) from public, anon;
grant execute on function public.post_brief(text, text[], text, text, integer, bigint, date, uuid) to authenticated;
grant execute on function public.answer_brief(uuid, uuid) to authenticated;
