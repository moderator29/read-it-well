/*
 * V-96. WHATSAPP IS A DOORBELL, NEVER A ROOM.
 *
 * The channel policy is written in `apps/web/src/lib/notify/whatsapp.ts`.
 * This is its queue, mirroring `push_queue`: a notification that rings one of
 * the doorbell events becomes one row here, carrying the event and ONE path
 * into Vallo, and nothing else. No title, no body, no price, no number: the
 * row cannot hold the content of anything, so no template can leak it.
 *
 * FAIL CLOSED, THREE TIMES OVER. A row is written only when
 *   - `feature_flags.whatsapp_doorbell` exists AND is enabled (a missing row
 *     is shut here, unlike the app's kill switches, because this one starts
 *     sending to people's phones), and
 *   - the person switched it on (`profiles.settings.whatsappDoorbell`), a
 *     switch that is not drawn until a transport exists (V-02), and
 *   - their phone number is confirmed.
 * With no Cloud API credentials the drain (`whatsapp-drain.ts`) leaves the
 * queue alone. No cron runs it yet: scheduling it is a `vercel.json` change,
 * which the build pipeline owner makes when the number and templates exist.
 */

create table if not exists public.whatsapp_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_id uuid unique,
  event text not null check (event in ('inspection_update', 'inspection_tomorrow', 'money_update',
                                       'stop_or_recall', 'principal_heartbeat')),
  /* The one template variable. A path on our origin, short, no digit run
     long enough to be an account or phone number, no money sign. */
  path text not null check (
    path ~ '^/[A-Za-z0-9/_.?=&%-]{0,119}$'
    and path !~ '^//'
    and path !~ '[0-9]{6,}'
  ),
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed', 'dead')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text check (last_error is null or char_length(last_error) <= 60),
  created_at timestamptz not null default now(),
  /* Held through the person's quiet hours until this instant; its age
     counts from here, so a long quiet window does not kill a bell. */
  not_before timestamptz,
  /* When a drain claimed it for sending; a claim older than ten minutes is
     swept back to failed, so a drain that died mid-send cannot strand it. */
  claimed_at timestamptz,
  sent_at timestamptz
);

create index if not exists whatsapp_queue_due_idx on public.whatsapp_queue (status, created_at)
  where status in ('queued', 'failed');

alter table public.whatsapp_queue enable row level security;
revoke all on table public.whatsapp_queue from public, anon, authenticated;

/*
 * Inbound message ids already handled. Meta redelivers anything it did not
 * see a 200 for; a message id is inserted once (on conflict do nothing) and
 * only the insert that made the row acts on it. A hash, never the id itself,
 * and swept after a week by the drain.
 */
create table if not exists public.whatsapp_inbound_seen (
  wamid_hash text primary key check (wamid_hash ~ '^[0-9a-f]{32}$'),
  seen_at timestamptz not null default now()
);
alter table public.whatsapp_inbound_seen enable row level security;
revoke all on table public.whatsapp_inbound_seen from public, anon, authenticated;

comment on table public.whatsapp_inbound_seen is
  'V-96. One row per inbound WhatsApp message already handled, keyed by the first 32 hex of the SHA-256 of Meta''s message id (never the id). Inserted on conflict do nothing by /api/whatsapp/inbound; swept after seven days by the drain. Service role only.';

comment on table public.whatsapp_queue is
  'V-96. One doorbell per row: an event and one path into Vallo, never content. Written by the notifications trigger when the whatsapp_doorbell flag is on and the person opted in; service role only.';

/* The same mapping as `doorbellEventFor` in whatsapp.ts. */
create or replace function private.whatsapp_event_for(p_kind text, p_href text, p_title text)
returns text
language sql
immutable
set search_path to ''
as $$
  select case
    when p_href is null or p_href !~ '^/[^/\\]' then null
    when p_kind = 'wallet' then 'money_update'
    when p_kind = 'listing' and p_href like '/inspections%' then
      case when coalesce(p_title, '') ~* '\mtomorrow\M' then 'inspection_tomorrow' else 'inspection_update' end
    else null
  end;
$$;
revoke all on function private.whatsapp_event_for(text, text, text) from public, anon, authenticated;

create or replace function private.whatsapp_enqueue_from_notification()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_event text;
  v_path text;
begin
  if not exists (select 1 from public.feature_flags f where f.key = 'whatsapp_doorbell' and f.enabled) then
    return new;
  end if;
  v_event := private.whatsapp_event_for(new.kind::text, new.href, new.title);
  if v_event is null then
    return new;
  end if;
  if not exists (
    select 1 from public.profiles p join auth.users u on u.id = p.id
     where p.id = new.user_id
       and (p.settings ->> 'whatsappDoorbell') = 'true'
       and u.phone_confirmed_at is not null
  ) then
    return new;
  end if;
  v_path := split_part(split_part(new.href, '#', 1), '?', 1);
  if v_path !~ '^/[A-Za-z0-9/_.-]{0,119}$' or v_path ~ '[0-9]{6,}' then
    /* A path the bell cannot carry safely rings nothing. */
    return new;
  end if;
  insert into public.whatsapp_queue (user_id, notification_id, event, path)
  values (new.user_id, new.id, v_event, v_path)
  on conflict (notification_id) do nothing;
  return new;
exception when others then
  raise warning '[whatsapp] enqueue failed: %', sqlstate;
  return new;
end;
$$;
revoke all on function private.whatsapp_enqueue_from_notification() from public, anon, authenticated;

drop trigger if exists notifications_whatsapp_enqueue on public.notifications;
create trigger notifications_whatsapp_enqueue
  after insert on public.notifications
  for each row
  execute function private.whatsapp_enqueue_from_notification();

do $$
begin
  /* has_table_privilege answers for the named role (a grant to PUBLIC
     included, a column grant not); information_schema's grant views answer
     only for the observer and pass by seeing nothing. */
  if has_table_privilege('anon', 'public.whatsapp_queue', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
     or has_table_privilege('authenticated', 'public.whatsapp_queue', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER') then
    raise exception 'whatsapp_queue is not born locked';
  end if;
  if exists (select 1 from public.feature_flags where key = 'whatsapp_doorbell' and enabled) then
    raise exception 'whatsapp_doorbell must start shut';
  end if;
end
$$;
