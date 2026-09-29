-- V-95: THE BRIEF. A RENTER SAYS WHAT THEY NEED, AND VERIFIED LISTERS
-- ANSWER ONLY WITH A LISTING.
--
-- Renters already post "looking for a 2 bed in Yaba" on Twitter and in estate
-- groups, and are flooded with fake listings and inspection-fee demands. A
-- brief here can only be answered with one of the lister's own PUBLISHED,
-- real listings, which lands in a thread as a listing card. There is no text
-- box on the answer, so there is nothing to put a phone number in.
--
-- WHAT A BRIEF IS: facts only, no free text. To let or to buy, a kind of
-- home, a bedroom minimum, a budget ceiling in kobo, a month to move from,
-- and one to three neighbourhoods FROM THE CLOSED LIST (rule 10, and so a
-- lister can be matched to it). It lives 21 days, or until the renter closes
-- it, and a renter keeps at most three open.
--
-- WHO SEES IT: a VERIFIED lister (approved, verification tier 1 or above, real) with at
-- least one published real listing in one of its neighbourhoods, through
-- `briefs_for_me`, which never returns who posted it. The renter reads their
-- own briefs under RLS and the answers through `my_brief_answers`, ranked by
-- the listing's publication (newest first), never by who answered first.
--
-- ANSWERING: `answer_brief` checks the lister may see the brief, the listing
-- is theirs, published and real, at most three answers per lister per brief
-- and one per listing. The answer appears on the renter's brief as a listing
-- card with a notification, and the renter opens the thread from it: a
-- listing thread is opened by its guest, never by a lister, and a brief does
-- not change that. Where a thread already exists between them about that
-- listing, the card is posted into it too.

create table if not exists public.briefs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  saved_search_id uuid references public.saved_searches(id) on delete set null,
  state_code     text not null references public.states(code),
  areas          text[] not null check (coalesce(array_length(areas, 1), 0) between 1 and 3),
  intent         text not null check (intent in ('rent', 'sale')),
  property_type  text check (property_type is null or property_type in ('apartment', 'home', 'shop', 'office', 'land')),
  bedrooms_min   smallint check (bedrooms_min is null or bedrooms_min between 0 and 10),
  max_minor      bigint check (max_minor is null or max_minor > 0),
  move_from      date,
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null default now() + interval '21 days',
  closed_at      timestamptz
);

comment on table public.briefs is
  'V-95. What a renter needs, as facts only (no free text): intent, kind, bedrooms, a ceiling in kobo, a month, one to three closed-list neighbourhoods. 21 days or until closed. The owner reads it; verified listers covering an area read it through briefs_for_me without the owner.';

create index if not exists briefs_open_idx on public.briefs (state_code, expires_at) where closed_at is null;

create table if not exists public.brief_answers (
  brief_id        uuid not null references public.briefs(id) on delete cascade,
  listing_id      uuid not null references public.listings(id) on delete cascade,
  lister_id       uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  created_at      timestamptz not null default now(),
  primary key (brief_id, listing_id)
);

comment on table public.brief_answers is
  'V-95. One lister''s answer to a brief: one of their own published, real listings. Written only by answer_brief. Three per lister per brief.';

alter table public.briefs enable row level security;
alter table public.brief_answers enable row level security;
revoke all on public.briefs from public, anon, authenticated;
revoke all on public.brief_answers from public, anon, authenticated;
grant select on public.briefs to authenticated;
grant select on public.brief_answers to authenticated;
grant all on public.briefs to service_role;
grant all on public.brief_answers to service_role;

drop policy if exists briefs_owner_reads on public.briefs;
create policy briefs_owner_reads on public.briefs
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists brief_answers_lister_reads on public.brief_answers;
create policy brief_answers_lister_reads on public.brief_answers
  for select to authenticated using (lister_id = (select auth.uid()));

create or replace function private.is_verified_lister(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1 from public.agents a
     where a.user_id = p_user
       and a.status = 'APPROVED'::public.agent_application_status
       -- The tier, not the boolean: tier 1 is a person at Vallo having checked
       -- a government document (the boolean is derived from it).
       and coalesce(a.verification_tier, 0) >= 1
       and a.is_demo = false);
$function$;

create or replace function private.lister_covers_brief(p_user uuid, p_brief uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
      from public.briefs b
      join public.listings l on l.state_code = b.state_code
      join public.agents a on a.id = l.agent_id and a.user_id = p_user
     where b.id = p_brief
       and b.closed_at is null
       and b.expires_at > now()
       and b.user_id <> p_user
       and l.status = 'PUBLISHED'::public.listing_status
       and l.is_demo = false
       and private.public_neighbourhood(l.area, l.state_code) = any (b.areas));
$function$;

revoke all on function private.is_verified_lister(uuid) from public, anon, authenticated;
revoke all on function private.lister_covers_brief(uuid, uuid) from public, anon, authenticated;

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

create or replace function public.close_brief(p_brief uuid)
returns void
language sql
security definer
set search_path to ''
as $function$
  update public.briefs set closed_at = now()
   where id = p_brief and user_id = (select auth.uid()) and closed_at is null;
$function$;

create or replace function public.briefs_for_me()
returns table (
  id            uuid,
  state_code    text,
  areas         text[],
  intent        text,
  property_type text,
  bedrooms_min  smallint,
  max_minor     bigint,
  move_from     date,
  created_at    timestamptz,
  expires_at    timestamptz,
  answered      integer
)
language sql
stable
security definer
set search_path to ''
as $function$
  select b.id, b.state_code, b.areas, b.intent, b.property_type, b.bedrooms_min, b.max_minor, b.move_from,
         b.created_at, b.expires_at,
         (select count(*)::integer from public.brief_answers ba where ba.brief_id = b.id and ba.lister_id = (select auth.uid()))
    from public.briefs b
   where private.is_verified_lister((select auth.uid()))
     and private.lister_covers_brief((select auth.uid()), b.id)
   order by b.created_at desc
   limit 100;
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

create or replace function public.my_brief_answers(p_brief uuid)
returns table (listing_id uuid, conversation_id uuid)
language sql
stable
security definer
set search_path to ''
as $function$
  select ba.listing_id, ba.conversation_id
    from public.brief_answers ba
    join public.briefs b on b.id = ba.brief_id and b.user_id = (select auth.uid())
    join public.listings l on l.id = ba.listing_id
   where ba.brief_id = p_brief
     and l.status = 'PUBLISHED'::public.listing_status
   order by l.published_at desc nulls last, l.id;
$function$;

comment on function public.post_brief(text, text[], text, text, integer, bigint, date, uuid) is
  'V-95. Posts a brief: one to three closed-list neighbourhoods in the state, a move month within a year, three open briefs per renter.';
comment on function public.briefs_for_me() is
  'V-95. Open briefs a verified lister covers (a published real listing in one of its neighbourhoods), never with who posted them, with how many this lister has answered.';
comment on function public.answer_brief(uuid, uuid) is
  'V-95. Answers a brief with one of the caller''s own published real listings: shown on the renter''s brief with a notification (and posted into an existing thread about it). Three per lister per brief, one per listing. No text.';
comment on function public.my_brief_answers(uuid) is
  'V-95. The answers to the caller''s own brief, published listings only, ranked by publication and never by who answered first.';

revoke all on function public.post_brief(text, text[], text, text, integer, bigint, date, uuid) from public, anon;
revoke all on function public.close_brief(uuid) from public, anon;
revoke all on function public.briefs_for_me() from public, anon;
revoke all on function public.answer_brief(uuid, uuid) from public, anon;
revoke all on function public.my_brief_answers(uuid) from public, anon;
grant execute on function public.post_brief(text, text[], text, text, integer, bigint, date, uuid) to authenticated;
grant execute on function public.close_brief(uuid) to authenticated;
grant execute on function public.briefs_for_me() to authenticated;
grant execute on function public.answer_brief(uuid, uuid) to authenticated;
grant execute on function public.my_brief_answers(uuid) to authenticated;
