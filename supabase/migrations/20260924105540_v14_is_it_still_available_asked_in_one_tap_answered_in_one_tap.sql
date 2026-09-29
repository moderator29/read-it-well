-- V-14: "IS IT STILL AVAILABLE?" ASKED IN ONE TAP, ANSWERED IN ONE TAP.
--
-- It is the first WhatsApp message about every Nigerian listing and the most
-- common one left unanswered. Asked as free text it is uncounted and costs the
-- lister a sentence to answer; asked as a structured question it costs one tap
-- each way, and "No, it has been let" becomes the cheapest freshness fact the
-- platform will ever collect.
--
-- A QUESTION IS A ROW, BESIDE THE THREAD, NOT A NEW KIND OF MESSAGE. The words
-- still travel as ordinary messages written by the ordinary send path, so the
-- scanner, the block rule and the unread counts see them exactly as they see
-- anything else. This table is what makes the question answerable in one tap
-- and countable: who asked about which listing, when, and what the lister
-- said. The Record (V-34) will count answered rows; nothing here scores
-- anybody.
--
-- THREE ANSWERS, A CLOSED LIST: available now, available from a date, let.
-- "Let" is recorded and NOT acted on here. Closing a listing as let, and
-- telling everybody who saved it, is V-48's event; until it exists the
-- answer is kept so V-48 can read it rather than invented twice.
--
-- BORN LOCKED. RLS on; the two parties may read their own rows; nobody may
-- write except through the two functions below, which check the caller's
-- place in the conversation themselves (rule 21). Asking is limited to once
-- per renter per listing per day, and an open question is returned rather
-- than duplicated.

do $$ begin
  create type public.availability_answer as enum ('available', 'available_later', 'let');
exception when duplicate_object then null; end $$;

create table if not exists public.availability_checks (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  listing_id       uuid not null references public.listings(id) on delete cascade,
  asker_id         uuid not null references auth.users(id) on delete cascade,
  lister_id        uuid not null references auth.users(id) on delete cascade,
  asked_at         timestamptz not null default now(),
  answer           public.availability_answer,
  available_from   date,
  answered_at      timestamptz,
  constraint availability_checks_answer_has_a_time
    check ((answer is null) = (answered_at is null)),
  constraint availability_checks_later_has_a_date
    check ((answer = 'available_later') = (available_from is not null))
);

comment on table public.availability_checks is
  'V-14. A renter asked whether a listing is still available, in one tap, and the lister answered in one tap. Readable by the two parties only; written only through ask_availability and answer_availability. "let" is recorded for V-48 to act on; this table closes nothing.';

create unique index if not exists availability_checks_one_open_per_thread
  on public.availability_checks (conversation_id) where answer is null;
create index if not exists availability_checks_listing_idx on public.availability_checks (listing_id, asked_at desc);
create index if not exists availability_checks_lister_idx on public.availability_checks (lister_id) where answer is null;
create index if not exists availability_checks_asker_idx on public.availability_checks (asker_id);

alter table public.availability_checks enable row level security;
revoke all on public.availability_checks from public, anon, authenticated;
grant select on public.availability_checks to authenticated;
grant all on public.availability_checks to service_role;

drop policy if exists availability_checks_parties_read on public.availability_checks;
create policy availability_checks_parties_read on public.availability_checks
  for select to authenticated
  using (asker_id = (select auth.uid()) or lister_id = (select auth.uid()));

/* ------------------------------------------------------------- asking */

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

comment on function public.ask_availability(uuid) is
  'V-14. The renter in a listing thread asks whether it is still available. Returns the open question if there is one; refuses an example or unpublished listing, a thread that is not the caller''s, and a second ask about the same listing within a day.';

/* ----------------------------------------------------------- answering */

create or replace function public.answer_availability(
  p_check uuid,
  p_answer public.availability_answer,
  p_from date default null
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  caller uuid := (select auth.uid());
  row_lister uuid;
  row_answer public.availability_answer;
begin
  if caller is null then
    raise exception 'sign in to answer' using errcode = '42501';
  end if;

  select a.lister_id, a.answer into row_lister, row_answer
    from public.availability_checks a
   where a.id = p_check
   for update;
  if not found or row_lister is distinct from caller then
    raise exception 'not your question to answer' using errcode = '42501';
  end if;
  if row_answer is not null then
    raise exception 'already answered' using errcode = 'P0001', hint = 'availability_already_answered';
  end if;

  if p_answer = 'available_later' then
    if p_from is null or p_from <= current_date or p_from > current_date + 366 then
      raise exception 'give a date within the next year' using errcode = '22023';
    end if;
  elsif p_from is not null then
    raise exception 'a date goes only with a later answer' using errcode = '22023';
  end if;

  update public.availability_checks
     set answer = p_answer,
         available_from = case when p_answer = 'available_later' then p_from else null end,
         answered_at = now()
   where id = p_check;
end;
$function$;

comment on function public.answer_availability(uuid, public.availability_answer, date) is
  'V-14. The lister answers a still-available question in one tap. Only the lister of that thread, only once. "let" is recorded and does not close the listing: that is V-48.';

revoke all on function public.ask_availability(uuid) from public, anon;
revoke all on function public.answer_availability(uuid, public.availability_answer, date) from public, anon;
grant execute on function public.ask_availability(uuid) to authenticated;
grant execute on function public.answer_availability(uuid, public.availability_answer, date) to authenticated;
