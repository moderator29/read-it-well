/*
 * BATCH 2 OF THE LANDLORD IN THE ROOM, AND TWO SAFETY DOORS BESIDE IT.
 *
 *   V-37  the search card collapses the copies of one property, so the
 *         catalogue facts now carry the property a listing is on.
 *   V-31  the owner who lists their own flat is asked too, in the app, because
 *         for an owner listing the principal IS the lister.
 *   V-61  "Is this a Vallo agent?": a number or a code seen on WhatsApp is
 *         checked against agents who opted their business number in.
 *   V-62  going to an inspection alone: a page a trusted contact can open that
 *         names the area and the agent, never the address.
 *
 * ---------------------------------------------------------------------------
 * V-31, THE OWNER'S HEARTBEAT, AND WHY ITS "YES" IS NOT ALWAYS A PUBLIC LINE.
 *
 * An owner listing has no mandate and no third party to ask: the lister says
 * they are the owner. So the fortnightly question goes to them in the app (a
 * notification, which the push drain carries), and their answer stops the 21
 * day clock exactly as a principal's does. It only becomes "Owner confirmed
 * available" on the listing when a member of staff has dated
 * `ownership_verified_at`, because until then the "owner" in that sentence is
 * a claim, and a lister confirming their own advert is the incentive problem
 * V-31 exists to remove. Behind the same `landlord_line` flag as the rest of
 * the line.
 *
 * ---------------------------------------------------------------------------
 * V-61, AND THE TWO THINGS IT REFUSES TO BECOME.
 *
 * It is not a phone book. An agent opts a business number in; only an HMAC of
 * it is stored (under its own Vault secret, `vallo_agent_lookup_secret`, so it
 * cannot be joined to the principal keys), with the last three digits so the
 * agent can recognise which number they registered. The lookup itself is
 * service-role only, so every call goes through the server action that rate
 * limits it per address and globally: a lookup open to PostgREST could be
 * called ninety million times.
 *
 * It is not a blacklist. THE_HUNDRED rejects a public list of stopped agents,
 * so an agent who is not approved, or is an example, is answered exactly like a
 * number nobody registered: "No Vallo agent uses this number." The file's
 * "stopped for fraud" sentence is not built.
 *
 * The code is `VA-` and five characters rather than the file's `VL-A7K2`, so it
 * can never be mistaken for a listing reference (`VL-` and six), which search
 * already reads.
 *
 * ---------------------------------------------------------------------------
 * V-62, THE PAGE A CONTACT OPENS.
 *
 * The renter creates it on a confirmed inspection and sends it through their
 * own share sheet; Vallo sends nothing to the contact. It shows the renter's
 * first name, the AREA, the agent's display name, "identity checked by Vallo"
 * only when an identity document of theirs was approved (with the date), the
 * time, and whether the renter has tapped "I'm done". Never the address, the
 * landmark, the listing or a price. The token is sha256 only and the page dies
 * four hours after the slot. Half an hour after the expected time with no
 * "I'm done", the renter is pushed and the page says "Not checked in yet". The
 * agent's photograph is not shown: releasing a verification selfie needs V-35
 * and V-49's rules and is not pretended here.
 */

/* ------------------------------------------------ V-37: the property on facts */

drop function if exists public.listing_landlord_facts(uuid[]);
create function public.listing_landlord_facts(p_listings uuid[])
returns table (
  listing_id uuid,
  owner_confirmed_at timestamptz,
  not_reconfirmed boolean,
  offer_count integer,
  property_id uuid
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
                       and o.is_demo = false) end,
         l.property_id
    from public.listings l
   where l.id = any(p_listings[1:200])
     and l.status = 'PUBLISHED'::public.listing_status
     and l.is_demo = false
     and (select auth.uid()) is not null;
$function$;

revoke all on function public.listing_landlord_facts(uuid[]) from public, anon;
grant execute on function public.listing_landlord_facts(uuid[]) to authenticated;

/* ------------------------------------------- V-31: the owner's own heartbeat */

create table if not exists public.owner_heartbeats (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings(id) on delete cascade,
  owner_user  uuid not null references auth.users(id) on delete cascade,
  asked_at    timestamptz not null default now(),
  answered_at timestamptz,
  answer      text check (answer is null or answer = 'available'),
  constraint owner_heartbeats_answer_is_dated check ((answer is null) = (answered_at is null))
);

comment on table public.owner_heartbeats is
  'V-31 for owner listings: the fortnightly in-app question to a lister who says they own the flat. The answer stops the 21 day clock; it becomes a public "Owner confirmed" line only once ownership_verified_at is dated.';

create index if not exists owner_heartbeats_listing_idx on public.owner_heartbeats (listing_id, asked_at desc);
create index if not exists owner_heartbeats_owner_idx on public.owner_heartbeats (owner_user) where answered_at is null;

revoke all on public.owner_heartbeats from public, anon, authenticated;
grant all on public.owner_heartbeats to service_role;
alter table public.owner_heartbeats enable row level security;
drop policy if exists owner_heartbeats_select_own on public.owner_heartbeats;
create policy owner_heartbeats_select_own on public.owner_heartbeats
  for select using (owner_user = (select auth.uid()) or private.is_staff());
grant select on public.owner_heartbeats to authenticated;

create or replace function private.owner_heartbeat_sweep()
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  r record;
  n integer := 0;
begin
  if not private.landlord_line_open() then
    return 0;
  end if;
  for r in
    select l.id, a.user_id
      from public.listings l
      join public.agents a on a.id = l.agent_id
     where l.status = 'PUBLISHED'::public.listing_status
       and l.listing_intent = 'rent'::public.listing_intent
       and l.listing_role = 'owner'::public.listing_role
       and l.is_demo = false
       and l.closed_at is null
       and not exists (select 1 from public.owner_heartbeats h
                        where h.listing_id = l.id and h.asked_at > now() - interval '14 days')
  loop
    insert into public.owner_heartbeats (listing_id, owner_user) values (r.id, r.user_id);
    perform private.notify(
      r.user_id, 'listing'::public.notification_kind,
      'Is your ' || private.listing_place_words(r.id) || ' still available?',
      'Tap to confirm it is still free. If it has been let, close the listing so renters stop asking.',
      '/agent/listings'
    );
    n := n + 1;
  end loop;
  return n;
end;
$function$;

revoke all on function private.owner_heartbeat_sweep() from public, anon, authenticated;

/* The owner answers "still available". A let is the close sheet, not this. */
create or replace function public.owner_heartbeat_answer(p_listing uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  l public.listings%rowtype;
  hit integer;
begin
  if (select auth.uid()) is null or not private.owns_listing(p_listing) then
    raise exception 'only the owner of this listing can answer' using errcode = 'insufficient_privilege';
  end if;
  select * into l from public.listings where id = p_listing;
  if l.listing_role is distinct from 'owner'::public.listing_role or l.closed_at is not null then
    return jsonb_build_object('state', 'none');
  end if;

  update public.owner_heartbeats
     set answered_at = now(), answer = 'available'
   where listing_id = p_listing and answered_at is null;
  get diagnostics hit = row_count;
  if hit = 0 then
    return jsonb_build_object('state', 'none');
  end if;

  update public.listings
     set not_reconfirmed_since = null,
         availability_confirmed_at = case when l.ownership_verified_at is not null then now()
                                          else availability_confirmed_at end
   where id = p_listing;

  return jsonb_build_object('state', 'answered', 'public', l.ownership_verified_at is not null);
end;
$function$;

revoke all on function public.owner_heartbeat_answer(uuid) from public, anon;
grant execute on function public.owner_heartbeat_answer(uuid) to authenticated;

/* Which of the caller's listings have an open owner question. */
create or replace function public.owner_heartbeats_open()
returns table (listing_id uuid, asked_at timestamptz)
language sql
stable
security definer
set search_path to ''
as $function$
  select h.listing_id, max(h.asked_at)
    from public.owner_heartbeats h
   where h.owner_user = (select auth.uid())
     and h.answered_at is null
     and h.asked_at > now() - interval '28 days'
   group by h.listing_id;
$function$;

revoke all on function public.owner_heartbeats_open() from public, anon;
grant execute on function public.owner_heartbeats_open() to authenticated;

/* The sweep, now counting the owner's silence as well as the principal's.
   The principal half is 20260924110300's, unchanged: only a question that
   reached a principal who can still be asked, inside its own expiry. */
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

  /* A mark on a mandated listing stands only while its principal can still be
     asked. An owner listing has no mandate; its mark clears by its answer. */
  update public.listings l
     set not_reconfirmed_since = null
   where l.not_reconfirmed_since is not null
     and l.listing_role is distinct from 'owner'::public.listing_role
     and not exists (
       select 1 from public.listing_mandates m
        where m.listing_id = l.id and private.principal_may_be_messaged(m.id));

  update public.listings l
     set not_reconfirmed_since = now()
   where l.status = 'PUBLISHED'::public.listing_status
     and l.not_reconfirmed_since is null
     and l.closed_at is null
     and (
       exists (
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
                         where pm.ask_id = a.id and pm.channel <> 'stub'))
       or (l.listing_role = 'owner'::public.listing_role and exists (
         select 1 from public.owner_heartbeats h
          where h.listing_id = l.id
            and h.answered_at is null
            and h.asked_at <= now() - interval '21 days'
            and not exists (select 1 from public.owner_heartbeats later
                             where later.listing_id = l.id and later.answered_at > h.asked_at)))
     );
  get diagnostics n = row_count;
  return n;
end;
$function$;

revoke all on function private.sweep_not_reconfirmed() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobname) from cron.job where jobname = 'vallo_owner_heartbeat';
    perform cron.schedule('vallo_owner_heartbeat', '15 8 * * *', $job$select private.owner_heartbeat_sweep();$job$);
  end if;
end $$;

/* --------------------------------------------- V-61: is this a Vallo agent? */

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'vallo_agent_lookup_secret') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'vallo_agent_lookup_secret',
      'HMAC key for agents.lookup_phone_hmac (V-61). Minted inside the database by migration 20260924110400 and written in no file. Separate from vallo_principal_key_secret so an agent''s business number can never be joined to a principal key.'
    );
  end if;
end $$;

create or replace function private.agent_lookup_key(p_phone text)
returns text
language sql
stable
security definer
set search_path to ''
as $function$
  select case when p_phone is null or btrim(p_phone) = '' then null
              else encode(extensions.hmac(btrim(p_phone), s.decrypted_secret, 'sha256'), 'hex') end
    from vault.decrypted_secrets s
   where s.name = 'vallo_agent_lookup_secret'
   limit 1;
$function$;

revoke all on function private.agent_lookup_key(text) from public, anon, authenticated;

alter table public.agents
  add column if not exists public_code        text,
  add column if not exists lookup_phone_hmac  text,
  add column if not exists lookup_phone_hint  text check (lookup_phone_hint is null or lookup_phone_hint ~ '^[0-9]{3}$'),
  add column if not exists lookup_opted_in_at timestamptz;

create unique index if not exists agents_public_code_key on public.agents (public_code) where public_code is not null;
create unique index if not exists agents_lookup_phone_hmac_key on public.agents (lookup_phone_hmac) where lookup_phone_hmac is not null;

comment on column public.agents.public_code is
  'V-61. The short code an agent prints on their own adverts (VA- and five characters) so a renter can check them at /check. Assigned by the database, never chosen.';
comment on column public.agents.lookup_phone_hmac is
  'V-61. HMAC of the business number the agent opted in, under vallo_agent_lookup_secret. The number itself is never stored here; only a match is ever answered.';

create or replace function private.new_agent_code()
returns text
language plpgsql
volatile
security definer
set search_path to ''
as $function$
declare
  alphabet constant text := 'ACDEFHJKMNPRTUVWXY3479';
  code text;
begin
  loop
    select 'VA-' || string_agg(substr(alphabet, 1 + (get_byte(b, i) % length(alphabet)), 1), '' order by i)
      into code
      from (select extensions.gen_random_bytes(5) as b) x, generate_series(0, 4) as i;
    exit when not exists (select 1 from public.agents where public_code = code);
  end loop;
  return code;
end;
$function$;

revoke all on function private.new_agent_code() from public, anon, authenticated;

/* The code is issued by the database, and the lookup columns are written only
   by agent_lookup_opt_in, from anybody's client including staff. */
create or replace function private.agents_lookup_guard()
returns trigger
language plpgsql
security invoker
set search_path to ''
as $function$
begin
  if tg_op = 'INSERT' then
    new.public_code := coalesce(new.public_code, private.new_agent_code());
  end if;
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.lookup_phone_hmac := null;
      new.lookup_phone_hint := null;
      new.lookup_opted_in_at := null;
    elsif new.public_code is distinct from old.public_code
       or new.lookup_phone_hmac is distinct from old.lookup_phone_hmac
       or new.lookup_phone_hint is distinct from old.lookup_phone_hint
       or new.lookup_opted_in_at is distinct from old.lookup_opted_in_at then
      raise exception 'the agent code and the checkable number are set by the platform'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$function$;

revoke all on function private.agents_lookup_guard() from public, anon, authenticated;
grant execute on function private.new_agent_code() to authenticated;

drop trigger if exists agents_lookup_guard on public.agents;
create trigger agents_lookup_guard
  before insert or update on public.agents
  for each row execute function private.agents_lookup_guard();

update public.agents set public_code = private.new_agent_code() where public_code is null;

/* The agent opts a business number in, or out with null. */
create or replace function public.agent_lookup_opt_in(p_phone text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  me public.agents%rowtype;
  key text;
begin
  select * into me from public.agents where user_id = (select auth.uid()) and is_demo = false limit 1;
  if me.id is null then
    raise exception 'only an agent can register a number' using errcode = 'insufficient_privilege';
  end if;

  if p_phone is null then
    update public.agents
       set lookup_phone_hmac = null, lookup_phone_hint = null, lookup_opted_in_at = null
     where id = me.id;
    return jsonb_build_object('state', 'removed');
  end if;

  if p_phone !~ '^\+234[7-9][0-9]{9}$' then
    raise exception 'give a Nigerian mobile number' using errcode = 'check_violation';
  end if;
  key := private.agent_lookup_key(p_phone);
  if key is null then
    raise exception 'the number cannot be registered just now' using errcode = 'object_not_in_prerequisite_state';
  end if;
  if exists (select 1 from public.agents where lookup_phone_hmac = key and id <> me.id) then
    raise exception 'another account has already registered this number' using errcode = 'unique_violation';
  end if;

  update public.agents
     set lookup_phone_hmac = key, lookup_phone_hint = right(p_phone, 3), lookup_opted_in_at = now()
   where id = me.id;
  return jsonb_build_object('state', 'registered', 'hint', right(p_phone, 3));
end;
$function$;

revoke all on function public.agent_lookup_opt_in(text) from public, anon;
grant execute on function public.agent_lookup_opt_in(text) to authenticated;

/* What the agent sees of their own entry. */
create or replace function public.my_agent_lookup()
returns jsonb
language sql
stable
security definer
set search_path to ''
as $function$
  select jsonb_build_object('code', a.public_code, 'hint', a.lookup_phone_hint, 'opted_in_at', a.lookup_opted_in_at)
    from public.agents a
   where a.user_id = (select auth.uid()) and a.is_demo = false
   limit 1;
$function$;

revoke all on function public.my_agent_lookup() from public, anon;
grant execute on function public.my_agent_lookup() to authenticated;

/* When a person's identity document was approved, or null. */
create or replace function private.identity_checked_at(p_user uuid)
returns timestamptz
language sql
stable
security definer
set search_path to ''
as $function$
  select max(d.reviewed_at)
    from public.agent_documents d
   where d.uploader_id = p_user
     and d.kind = 'identity'
     and d.review_status = 'approved'::public.document_review_status;
$function$;

revoke all on function private.identity_checked_at(uuid) from public, anon, authenticated;

/*
 * THE LOOKUP. Service role only: the server action rate limits it first. A
 * phone query is the canonical +234 form, a code is VA- and five characters.
 * Found means an approved, real agent who opted this number in (or whose code
 * this is). Anything else is the same "no" and says nothing more.
 */
create or replace function public.agent_lookup(p_query text)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  a public.agents%rowtype;
  q text := upper(btrim(coalesce(p_query, '')));
  handle text;
begin
  if q ~ '^VA-[ACDEFHJKMNPRTUVWXY3479]{5}$' then
    select * into a from public.agents where public_code = q;
  elsif q ~ '^\+234[7-9][0-9]{9}$' then
    select * into a from public.agents where lookup_phone_hmac = private.agent_lookup_key(q);
  else
    return jsonb_build_object('found', false, 'kind', 'unreadable');
  end if;

  if a.id is null or a.is_demo or a.status <> 'APPROVED'::public.agent_application_status then
    return jsonb_build_object('found', false, 'kind', case when q like 'VA-%' then 'code' else 'phone' end);
  end if;

  select sp.handle into handle from public.social_profiles sp where sp.user_id = a.user_id;

  return jsonb_build_object(
    'found', true,
    'kind', case when q like 'VA-%' then 'code' else 'phone' end,
    'display_name', nullif(btrim(a.display_name), ''),
    'role', a.role,
    'code', a.public_code,
    'identity_checked_at', private.identity_checked_at(a.user_id),
    'handle', handle);
end;
$function$;

revoke all on function public.agent_lookup(text) from public, anon, authenticated;
grant execute on function public.agent_lookup(text) to service_role;

/* ------------------------------------------- V-62: a trusted contact's page */

create table if not exists public.inspection_safety_shares (
  id               uuid primary key default gen_random_uuid(),
  inspection_id    uuid not null references public.inspection_requests(id) on delete cascade,
  created_by       uuid not null references auth.users(id) on delete cascade,
  token_hash       bytea not null unique,
  created_at       timestamptz not null default now(),
  expected_back_at timestamptz not null,
  expires_at       timestamptz not null,
  checked_in_at    timestamptz,
  reminded_at      timestamptz,
  revoked_at       timestamptz,
  constraint inspection_safety_shares_order check (expires_at > expected_back_at)
);

comment on table public.inspection_safety_shares is
  'V-62. A page the renter sends a trusted contact through their own share sheet: first name, AREA, agent, time, checked in or not. Never the address. Token stored as sha256 only; dead four hours after the slot.';

create index if not exists inspection_safety_shares_inspection_idx on public.inspection_safety_shares (inspection_id);
create index if not exists inspection_safety_shares_due_idx
  on public.inspection_safety_shares (expected_back_at) where checked_in_at is null and reminded_at is null and revoked_at is null;

revoke all on public.inspection_safety_shares from public, anon, authenticated;
grant all on public.inspection_safety_shares to service_role;
alter table public.inspection_safety_shares enable row level security;
drop policy if exists inspection_safety_shares_select_own on public.inspection_safety_shares;
create policy inspection_safety_shares_select_own on public.inspection_safety_shares
  for select using (created_by = (select auth.uid()));
grant select (id, inspection_id, created_at, expected_back_at, expires_at, checked_in_at, revoked_at)
  on public.inspection_safety_shares to authenticated;

/* The renter makes the link. One live link per inspection: a new one revokes the last. */
create or replace function public.safety_share_create(p_inspection uuid, p_minutes integer default 60)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  r public.inspection_requests%rowtype;
  tok text;
  back timestamptz;
begin
  select * into r from public.inspection_requests where id = p_inspection;
  if r.id is null or r.requester_id is distinct from (select auth.uid()) then
    raise exception 'only the person going to this inspection can share it' using errcode = 'insufficient_privilege';
  end if;
  if r.state <> 'CONFIRMED'::public.inspection_state or r.slot_at is null then
    raise exception 'an inspection can be shared once it is confirmed with a time' using errcode = 'check_violation';
  end if;
  if r.slot_at + interval '4 hours' <= now() then
    raise exception 'this inspection is over' using errcode = 'check_violation';
  end if;

  back := r.slot_at + make_interval(mins => greatest(30, least(coalesce(p_minutes, 60), 240)));
  update public.inspection_safety_shares set revoked_at = now()
   where inspection_id = p_inspection and revoked_at is null;

  tok := translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_');
  insert into public.inspection_safety_shares (inspection_id, created_by, token_hash, expected_back_at, expires_at)
  values (p_inspection, (select auth.uid()), extensions.digest(tok, 'sha256'), back,
          greatest(r.slot_at + interval '4 hours', back + interval '1 hour'));
  return jsonb_build_object('token', tok, 'expected_back_at', back);
end;
$function$;

revoke all on function public.safety_share_create(uuid, integer) from public, anon;
grant execute on function public.safety_share_create(uuid, integer) to authenticated;

/* "I'm done." */
create or replace function public.safety_share_done(p_inspection uuid)
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  n integer;
begin
  update public.inspection_safety_shares
     set checked_in_at = now()
   where inspection_id = p_inspection
     and created_by = (select auth.uid())
     and checked_in_at is null
     and revoked_at is null;
  get diagnostics n = row_count;
  return n;
end;
$function$;

revoke all on function public.safety_share_done(uuid) from public, anon;
grant execute on function public.safety_share_done(uuid) to authenticated;

/* The contact's page. Signed out by design; the token is the key. */
create or replace function public.safety_share_read(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  s public.inspection_safety_shares%rowtype;
  r public.inspection_requests%rowtype;
  l public.listings%rowtype;
  agent_user uuid;
  agent_name text;
  first text;
begin
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{20,64}$' then
    return jsonb_build_object('state', 'unknown');
  end if;
  select * into s from public.inspection_safety_shares where token_hash = extensions.digest(p_token, 'sha256');
  if s.id is null or s.revoked_at is not null then
    return jsonb_build_object('state', 'unknown');
  end if;
  if s.expires_at <= now() then
    return jsonb_build_object('state', 'expired');
  end if;

  select * into r from public.inspection_requests where id = s.inspection_id;
  select * into l from public.listings where id = r.listing_id;
  select a.user_id, coalesce(nullif(btrim(b.name), ''), nullif(btrim(a.display_name), ''))
    into agent_user, agent_name
    from public.agents a left join public.businesses b on b.id = l.firm_id
   where a.id = l.agent_id;
  select coalesce(nullif(btrim(p.first_name), ''), split_part(nullif(btrim(p.display_name), ''), ' ', 1))
    into first from public.profiles p where p.id = s.created_by;

  return jsonb_build_object(
    'state', 'live',
    'first_name', first,
    'area', coalesce(nullif(btrim(l.area), ''), nullif(btrim(l.city), '')),
    'city', l.city,
    'agent_name', agent_name,
    'identity_checked_at', private.identity_checked_at(agent_user),
    'slot_at', r.slot_at,
    'expected_back_at', s.expected_back_at,
    'checked_in_at', s.checked_in_at,
    'overdue', s.checked_in_at is null and s.expected_back_at + interval '30 minutes' <= now());
end;
$function$;

revoke all on function public.safety_share_read(text) from public;
grant execute on function public.safety_share_read(text) to anon, authenticated;

/* Half an hour late with no "I'm done": push the renter, once. */
create or replace function private.safety_share_sweep()
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  s record;
  n integer := 0;
begin
  for s in
    select id, created_by from public.inspection_safety_shares
     where checked_in_at is null and reminded_at is null and revoked_at is null
       and expected_back_at + interval '30 minutes' <= now()
       and expires_at > now()
  loop
    update public.inspection_safety_shares set reminded_at = now() where id = s.id;
    perform private.notify(
      s.created_by, 'booking'::public.notification_kind,
      'Are you back from your inspection?',
      'Tap I''m done so the person you told knows you are safe. Their page says you have not checked in yet.',
      '/inspections');
    n := n + 1;
  end loop;
  return n;
end;
$function$;

revoke all on function private.safety_share_sweep() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobname) from cron.job where jobname = 'vallo_safety_share_sweep';
    perform cron.schedule('vallo_safety_share_sweep', '*/10 * * * *', $job$select private.safety_share_sweep();$job$);
  end if;
end $$;
