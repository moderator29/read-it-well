/*
 * V-69. "SHOW ME": ASK FOR ONE SPECIFIC CLIP BEFORE YOU CROSS LAGOS.
 * FIRST SLICE, OFF BEHIND A FLAG.
 *
 * Every renter wants to know one or two specific things before spending a
 * Saturday and the transport fare, and the renter abroad cannot come at all.
 * In a listing conversation the renter asks for ONE thing from a short list
 * (the kitchen tap running, the bathroom, the prepaid meter's reading, the
 * view from the main bedroom window, the access road, the generator bay, or
 * something else in a line), and the lister answers with a short clip that
 * lands in the thread with the time it was sent.
 *
 * WHAT THIS DOES NOT CLAIM. There is no in-app camera on this branch, so a
 * clip is an UPLOAD from the lister's phone, and nothing here says "captured
 * in Vallo". What the thread shows is true: when it was asked, and when the
 * clip arrived. The 30 second cap is the lister's device's measurement of
 * the file and is stored as such; no rendition is transcoded yet. A clip is
 * never a public listing asset.
 *
 *   show_me_requests   one ask: the conversation, the item, the note for
 *                      "something else", open / answered / expired (48 hours),
 *                      and the clip's storage path once answered. Born locked;
 *                      read through the two parties' own policy.
 *   show-me-clips      a private storage bucket, video only, 25 MB. The
 *                      answering party writes only into the folder named by
 *                      an OPEN request addressed to them; the two parties read.
 *
 * OFF UNTIL THE FOUNDER OPENS IT:
 *   update public.feature_flags set enabled = true where key = 'show_me';
 */

begin;

insert into public.feature_flags (key, enabled, note)
values ('show_me', false, 'V-69: a renter asks the lister for one clip in the thread. Off until the founder opens it.')
on conflict (key) do nothing;

create or replace function private.show_me_open()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select f.enabled from public.feature_flags f where f.key = 'show_me'), false);
$$;
revoke all on function private.show_me_open() from public, anon, authenticated;
/* The storage policies below run as the uploader, so they must be able to
   ask the flag (review: without this every upload was refused). */
grant execute on function private.show_me_open() to authenticated;

create table if not exists public.show_me_requests (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  requester_id    uuid not null references auth.users (id) on delete cascade,
  item            text not null check (item in ('tap', 'bathroom', 'meter', 'window', 'road', 'generator', 'other')),
  note            text check (note is null or length(btrim(note)) between 3 and 120),
  status          text not null default 'open' check (status in ('open', 'answered')),
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default (now() + interval '48 hours'),
  answered_at     timestamptz,
  clip_path       text,
  clip_seconds    integer check (clip_seconds is null or clip_seconds between 1 and 30),
  constraint show_me_other_has_note check (item <> 'other' or note is not null),
  constraint show_me_answer_complete check (
    (status = 'open' and clip_path is null and answered_at is null)
    or (status = 'answered' and clip_path is not null and answered_at is not null)
  )
);

create index if not exists show_me_requests_conversation_idx on public.show_me_requests (conversation_id, created_at desc);

alter table public.show_me_requests enable row level security;
revoke all on public.show_me_requests from public, anon, authenticated;
grant select on public.show_me_requests to authenticated;

/* The two parties read their conversation's requests; nobody writes directly. */
create policy show_me_requests_parties_read on public.show_me_requests
  for select to authenticated
  using (
    private.show_me_open()
    and exists (
      select 1 from public.conversations c
       where c.id = conversation_id
         and (c.guest_id = (select auth.uid()) or c.agent_id = (select auth.uid()))
    )
  );

comment on table public.show_me_requests is
  'V-69: a renter''s request for one clip in a listing conversation, answered by an upload into the thread. Written only through request_show_me and answer_show_me.';

/*
 * The renter asks. Only the guest side of a listing conversation, never
 * across a block, at most three open asks per conversation. A message in the
 * thread carries the ask, so it notifies like any other.
 */
create or replace function public.request_show_me(p_conversation uuid, p_item text, p_note text default null)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  convo record;
  open_count integer;
  note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not private.show_me_open() then
    return 'off';
  end if;
  if caller is null then
    return 'signed-out';
  end if;
  select c.id, c.guest_id, c.agent_id, c.listing_id into convo
    from public.conversations c where c.id = p_conversation;
  if convo.id is null or convo.guest_id is distinct from caller or convo.listing_id is null then
    return 'not-yours';
  end if;
  /* An example listing has nothing real to film (review). */
  if exists (select 1 from public.listings l where l.id = convo.listing_id and l.is_demo) then
    return 'example';
  end if;
  if private.blocked_with(convo.agent_id) then
    return 'blocked';
  end if;
  if p_item not in ('tap', 'bathroom', 'meter', 'window', 'road', 'generator', 'other')
     or (p_item = 'other' and (note is null or length(note) < 3 or length(note) > 120)) then
    return 'bad-item';
  end if;
  select count(*) into open_count
    from public.show_me_requests r
   where r.conversation_id = p_conversation and r.status = 'open' and r.expires_at > now();
  if open_count >= 3 then
    return 'too-many';
  end if;
  insert into public.show_me_requests (conversation_id, requester_id, item, note)
  values (p_conversation, caller, p_item, case when p_item = 'other' then note else null end);
  insert into public.messages (conversation_id, sender_id, body)
  values (p_conversation, caller, 'Show me: ' || case p_item
    when 'tap' then 'the kitchen tap running'
    when 'bathroom' then 'the bathroom'
    when 'meter' then 'the prepaid meter''s current reading'
    when 'window' then 'the view from the main bedroom window'
    when 'road' then 'the access road'
    when 'generator' then 'the generator bay'
    else note end || '. A short clip, please.');
  return 'ok';
end;
$$;

/*
 * The lister answers with the clip already uploaded into the request's
 * folder. Only the agent side, only an open request that has not expired,
 * only a path inside that request's folder.
 */
create or replace function public.answer_show_me(p_request uuid, p_path text, p_seconds integer)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  req record;
begin
  if not private.show_me_open() then
    return 'off';
  end if;
  if caller is null then
    return 'signed-out';
  end if;
  select r.id, r.status, r.expires_at, r.conversation_id, c.agent_id, c.guest_id into req
    from public.show_me_requests r
    join public.conversations c on c.id = r.conversation_id
   where r.id = p_request;
  if req.id is null or req.agent_id is distinct from caller then
    return 'not-yours';
  end if;
  if private.blocked_with(req.guest_id) then
    return 'blocked';
  end if;
  if req.status <> 'open' then
    return 'already';
  end if;
  if req.expires_at <= now() then
    return 'expired';
  end if;
  if p_path is null or split_part(p_path, '/', 1) <> p_request::text then
    return 'bad-path';
  end if;
  /* The clip must exist, uploaded by the caller (review). */
  if not exists (
    select 1 from storage.objects o
     where o.bucket_id = 'show-me-clips' and o.name = p_path and o.owner_id = caller::text
  ) then
    return 'bad-path';
  end if;
  if p_seconds is null or p_seconds < 1 or p_seconds > 30 then
    return 'too-long';
  end if;
  update public.show_me_requests
     set status = 'answered', clip_path = p_path, clip_seconds = p_seconds, answered_at = now()
   where id = p_request;
  insert into public.messages (conversation_id, sender_id, body)
  values (req.conversation_id, caller, 'Here is the clip you asked for.');
  return 'ok';
end;
$$;

revoke execute on function public.request_show_me(uuid, text, text) from public, anon;
revoke execute on function public.answer_show_me(uuid, text, integer) from public, anon;
grant execute on function public.request_show_me(uuid, text, text) to authenticated;
grant execute on function public.answer_show_me(uuid, text, integer) to authenticated;

/* The private bucket, video only. */
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('show-me-clips', 'show-me-clips', false, 26214400, array['video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do nothing;

create policy show_me_clips_answerer_writes on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'show-me-clips'
    and private.show_me_open()
    and exists (
      select 1
        from public.show_me_requests r
        join public.conversations c on c.id = r.conversation_id
       where r.id::text = (storage.foldername(name))[1]
         and r.status = 'open'
         and r.expires_at > now()
         and c.agent_id = (select auth.uid())
    )
  );

/* The answerer may take back an upload while the ask is still open (a wrong
   file, a retry); once answered the clip stays. */
create policy show_me_clips_answerer_deletes on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'show-me-clips'
    and owner_id = (select auth.uid())::text
    and exists (
      select 1 from public.show_me_requests r
       where r.id::text = (storage.foldername(name))[1]
         and r.status = 'open'
    )
  );

create policy show_me_clips_parties_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'show-me-clips'
    and private.show_me_open()
    and exists (
      select 1
        from public.show_me_requests r
        join public.conversations c on c.id = r.conversation_id
       where r.id::text = (storage.foldername(name))[1]
         and (c.guest_id = (select auth.uid()) or c.agent_id = (select auth.uid()))
    )
  );

commit;
