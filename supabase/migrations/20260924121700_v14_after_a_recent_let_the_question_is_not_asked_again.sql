-- V-14, REVIEW FIX: AFTER A RECENT "LET", THE QUESTION IS NOT ASKED AGAIN.
--
-- A lister who answered "No, it has been let" was asked the same question by
-- the next renter an hour later, and the next. For seven days after a "let"
-- answer on a listing (unless a later answer on the same listing said it is
-- available again), `ask_availability` refuses with the hint
-- `availability_recently_let`, and `listing_recently_let` tells the listing
-- page when, so the button is replaced by that sentence. It reveals only the
-- date of the lister's answer, never who asked.
--
-- FRESHNESS DATE: the review asks that a "Yes" refresh a freshness date on the
-- listing if one exists on this branch. None does (`listings` has no
-- confirmed-available column here); noted in the report rather than invented.
-- "Let" still does not close the listing: that is V-48.

create or replace function private.listing_recently_let(p_listing uuid)
returns timestamptz
language sql
stable
security definer
set search_path to ''
as $function$
  select l.answered_at
    from public.availability_checks l
   where l.listing_id = p_listing
     and l.answer = 'let'
     and l.answered_at > now() - interval '7 days'
     and not exists (
       select 1 from public.availability_checks y
        where y.listing_id = p_listing
          and y.answer in ('available', 'available_later')
          and y.answered_at > l.answered_at)
   order by l.answered_at desc
   limit 1;
$function$;

revoke all on function private.listing_recently_let(uuid) from public, anon, authenticated;

create or replace function public.listing_recently_let(p_listing uuid)
returns timestamptz
language sql
stable
security definer
set search_path to ''
as $function$
  select case when (select auth.uid()) is null then null else private.listing_recently_let(p_listing) end;
$function$;

comment on function public.listing_recently_let(uuid) is
  'V-14. When the lister last answered "let" about this listing, within seven days and not since contradicted; null otherwise. Signed in only. The date only, never who asked.';

revoke all on function public.listing_recently_let(uuid) from public, anon;
grant execute on function public.listing_recently_let(uuid) to authenticated;

create or replace function public.ask_availability(p_conversation uuid)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  caller uuid := (select auth.uid());
  convo record;
  open_id uuid;
begin
  if caller is null then
    raise exception 'sign in to ask' using errcode = '42501';
  end if;

  select c.guest_id, c.agent_id, c.listing_id into convo
    from public.conversations c
   where c.id = p_conversation;
  if not found or convo.guest_id is distinct from caller or convo.listing_id is null then
    raise exception 'not your conversation' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.listings l
     where l.id = convo.listing_id
       and l.status = 'PUBLISHED'::public.listing_status
       and l.is_demo = false
  ) then
    raise exception 'that listing cannot be asked about' using errcode = '22023';
  end if;

  -- The lister said "let" in the last week, and nobody has since been told
  -- it is available: a new question would only ask them to say it again.
  if private.listing_recently_let(convo.listing_id) is not null then
    raise exception 'the lister has said it is let' using errcode = 'P0001', hint = 'availability_recently_let';
  end if;

  select a.id into open_id
    from public.availability_checks a
   where a.conversation_id = p_conversation and a.answer is null;
  if open_id is not null then
    return open_id;
  end if;

  if exists (
    select 1 from public.availability_checks a
     where a.asker_id = caller and a.listing_id = convo.listing_id
       and a.asked_at > now() - interval '24 hours'
  ) then
    raise exception 'asked already today' using errcode = 'P0001', hint = 'availability_rate_limited';
  end if;

  insert into public.availability_checks (conversation_id, listing_id, asker_id, lister_id)
  values (p_conversation, convo.listing_id, caller, convo.agent_id)
  returning id into open_id;
  return open_id;
end;
$function$;

revoke all on function public.ask_availability(uuid) from public, anon;
grant execute on function public.ask_availability(uuid) to authenticated;
