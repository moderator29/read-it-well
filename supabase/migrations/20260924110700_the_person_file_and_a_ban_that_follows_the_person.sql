/*
 * V-90. THE PERSON FILE, AND A BAN THAT FOLLOWS THE PERSON RATHER THAN THE
 * MAILBOX.
 *
 * 1. THE FILE. `public.admin_person_file(user)` is one read an operator opens
 *    from any name: who they are (name, handle, roles, agent standing, the
 *    verification checks with dates, any open stop), one timeline of every row
 *    about them from every desk, each with the desk it belongs to, and the
 *    other accounts they share something with: a device, a canonical mailbox,
 *    a phone number or a payout account. The shared values are compared as
 *    HMACs inside the database and never returned; the operator reads "shares
 *    a payout account with an agent stopped on 3 October", never the number.
 *    Staff only, and every opening writes an audit row (A2-036).
 *
 * 2. THE LIST. A stop that a SENIOR reviewer (super_admin) upholds as fraud,
 *    with a note, writes the person's NIN, phone numbers and payout accounts to
 *    `private.identity_denylist` as HMACs under their own Vault secret, so the
 *    list is useless if dumped. Lifting the stop removes its rows. Nothing else
 *    writes the list.
 *
 * 3. THE CHECK. A new application submitted, a payout account added and a
 *    phone number set are each checked against the list. A hit is never a
 *    silent refusal: it raises a high alert that says what it matches ("matches
 *    an identity stopped on 3 October 2026 for off-platform payment"), and an
 *    application that matches can only be approved by a senior reviewer.
 */

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'vallo_identity_key_secret') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'vallo_identity_key_secret',
      'HMAC key for private.identity_denylist and the person file''s linked accounts (V-90). Minted inside the database by migration 20260924110700 and written in no file.'
    );
  end if;
end $$;

/* The canonical form of each kind of identifier, then its HMAC. Null for an
   empty or unreadable value, so an absent number never matches another. */
create or replace function private.identity_key(p_kind text, p_value text)
returns text
language sql
stable
security definer
set search_path to ''
as $function$
  with canon as (
    select case p_kind
             when 'phone' then nullif(right(regexp_replace(coalesce(p_value, ''), '\D', '', 'g'), 10), '')
             when 'nin' then nullif(regexp_replace(coalesce(p_value, ''), '\D', '', 'g'), '')
             when 'payout' then nullif(regexp_replace(coalesce(p_value, ''), '\D', '', 'g'), '')
             when 'mailbox' then nullif(lower(btrim(coalesce(p_value, ''))), '')
           end as v
  )
  select case when c.v is null or (p_kind in ('phone', 'payout') and length(c.v) < 10) then null
              else encode(extensions.hmac(p_kind || ':' || c.v, s.decrypted_secret, 'sha256'), 'hex') end
    from canon c, vault.decrypted_secrets s
   where s.name = 'vallo_identity_key_secret'
   limit 1;
$function$;

revoke all on function private.identity_key(text, text) from public, anon, authenticated;

/* Every identity key a person carries, from every place it is written. */
create or replace function private.person_keys(p_user uuid)
returns table (key_kind text, key_hmac text)
language sql
stable
security definer
set search_path to ''
as $function$
  select distinct k.kind, k.h
    from (
      select 'phone' as kind, private.identity_key('phone', p.phone) as h from public.profiles p where p.id = p_user
      union all
      select 'phone', private.identity_key('phone', a.phone) from public.agent_applications a where a.user_id = p_user
      union all
      select 'phone', private.identity_key('phone', a.business_phone) from public.agent_applications a where a.user_id = p_user
      union all
      select 'nin', private.identity_key('nin', a.id_number) from public.agent_applications a
       where a.user_id = p_user and lower(coalesce(a.id_type, '')) like '%nin%'
      union all
      select 'payout', private.identity_key('payout', a.account_number)
        from public.agent_applications a where a.user_id = p_user and a.account_number is not null
      union all
      select 'payout', private.identity_key('payout', pa.account_number)
        from public.payout_accounts pa join public.agents ag on ag.id = pa.agent_id where ag.user_id = p_user
      union all
      select 'payout', private.identity_key('payout', b.account_number)
        from public.bank_accounts b where b.user_id = p_user and b.deleted_at is null
    ) k
   where k.h is not null;
$function$;

revoke all on function private.person_keys(uuid) from public, anon, authenticated;

create table if not exists private.identity_denylist (
  id             uuid primary key default gen_random_uuid(),
  key_kind       text not null check (key_kind in ('nin', 'phone', 'payout')),
  key_hmac       text not null,
  suspension_id  uuid not null references public.agent_suspensions(id) on delete cascade,
  created_at     timestamptz not null default now(),
  unique (key_kind, key_hmac, suspension_id)
);

comment on table private.identity_denylist is
  'V-90: HMACs of the NIN, phone numbers and payout accounts of a person whose stop a senior reviewer upheld as fraud. Written only by public.uphold_stop_as_fraud; rows leave with the stop (lift or delete). Kept while the stop stands; see docs/RETENTION_SCHEDULE.md.';

create index if not exists identity_denylist_key_idx on private.identity_denylist (key_kind, key_hmac);
revoke all on private.identity_denylist from public, anon, authenticated;

alter table public.agent_suspensions
  add column if not exists fraud_upheld_at timestamptz,
  add column if not exists fraud_upheld_by uuid references auth.users(id) on delete set null,
  add column if not exists fraud_note text check (fraud_note is null or char_length(fraud_note) <= 600);

create or replace function private.is_senior()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select private.has_role((select auth.uid()), 'super_admin'::public.app_role);
$function$;

revoke all on function private.is_senior() from public, anon, authenticated;

create or replace function public.uphold_stop_as_fraud(p_suspension uuid, p_note text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  s public.agent_suspensions%rowtype;
  who uuid;
  n integer;
begin
  if not private.is_senior() then
    raise exception 'only a senior reviewer upholds a stop as fraud' using errcode = 'insufficient_privilege';
  end if;
  if p_note is null or char_length(btrim(p_note)) < 10 then
    raise exception 'say what the fraud was, in a sentence' using errcode = 'check_violation';
  end if;
  select * into s from public.agent_suspensions where id = p_suspension for update;
  if s.id is null or s.lifted_at is not null then
    raise exception 'only a stop that is still in force can be upheld' using errcode = 'check_violation';
  end if;
  select a.user_id into who from public.agents a where a.id = s.agent_id;

  update public.agent_suspensions
     set fraud_upheld_at = coalesce(fraud_upheld_at, now()),
         fraud_upheld_by = coalesce(fraud_upheld_by, (select auth.uid())),
         fraud_note = left(btrim(p_note), 600)
   where id = s.id;

  insert into private.identity_denylist (key_kind, key_hmac, suspension_id)
  select k.key_kind, k.key_hmac, s.id
    from private.person_keys(who) k
   where k.key_kind in ('nin', 'phone', 'payout')
  on conflict do nothing;
  get diagnostics n = row_count;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values ((select auth.uid()), 'stop.upheld_as_fraud', 'agent_suspension', s.id::text,
          jsonb_build_object('agent_id', s.agent_id, 'keys_listed', n));
  return jsonb_build_object('state', 'upheld', 'keys', n);
end;
$function$;

revoke all on function public.uphold_stop_as_fraud(uuid, text) from public, anon;
grant execute on function public.uphold_stop_as_fraud(uuid, text) to authenticated;

/* Lifting a stop takes its keys off the list. */
create or replace function private.denylist_follows_the_stop()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.lifted_at is not null and old.lifted_at is null then
    delete from private.identity_denylist where suspension_id = new.id;
  end if;
  return new;
end;
$function$;

revoke all on function private.denylist_follows_the_stop() from public, anon, authenticated;

drop trigger if exists agent_suspensions_denylist_follows on public.agent_suspensions;
create trigger agent_suspensions_denylist_follows
  after update of lifted_at on public.agent_suspensions
  for each row execute function private.denylist_follows_the_stop();

/* The earliest upheld stop this key matches, in words, or null. */
create or replace function private.denylist_match(p_kind text, p_hmac text)
returns text
language sql
stable
security definer
set search_path to ''
as $function$
  select 'matches an identity stopped on '
         || to_char(s.suspended_at at time zone 'Africa/Lagos', 'FMDD FMMonth YYYY')
         || ' for ' || coalesce(nullif(btrim(s.fraud_note), ''), nullif(btrim(s.reason), ''), 'fraud')
    from private.identity_denylist d
    join public.agent_suspensions s on s.id = d.suspension_id
   where d.key_kind = p_kind and d.key_hmac = p_hmac and p_hmac is not null
   order by s.suspended_at
   limit 1;
$function$;

revoke all on function private.denylist_match(text, text) from public, anon, authenticated;

/* Every match for a set of candidate keys, as one sentence, or null. */
create or replace function private.denylist_sentence(p_keys text[][])
returns text
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  i integer;
  hit text;
begin
  if p_keys is null then
    return null;
  end if;
  for i in 1 .. coalesce(array_length(p_keys, 1), 0) loop
    hit := private.denylist_match(p_keys[i][1], p_keys[i][2]);
    if hit is not null then
      return 'The ' || case p_keys[i][1] when 'nin' then 'NIN' when 'phone' then 'phone number' else 'payout account' end
             || ' ' || hit || '.';
    end if;
  end loop;
  return null;
end;
$function$;

revoke all on function private.denylist_sentence(text[][]) from public, anon, authenticated;

create or replace function private.raise_denylist_alert(p_title text, p_sentence text, p_entity_type text, p_entity_id text)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if exists (select 1 from public.risk_alerts
              where entity_type = p_entity_type and entity_id = p_entity_id and title = p_title
                and status = 'open'::public.alert_status) then
    return;
  end if;
  insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
  values ('high'::public.alert_severity, 'open'::public.alert_status, p_title,
          p_sentence || ' A senior reviewer decides this; nothing was refused automatically.',
          p_entity_type, p_entity_id);
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (null, 'denylist.hit', p_entity_type, p_entity_id, jsonb_build_object('title', p_title));
end;
$function$;

revoke all on function private.raise_denylist_alert(text, text, text, text) from public, anon, authenticated;

/* An application: checked when submitted, and approvable only by a senior
   reviewer while it matches. */
create or replace function private.application_denylist_check()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  hit text;
begin
  if not exists (select 1 from private.identity_denylist) then
    return new;
  end if;
  hit := private.denylist_sentence(array[
    array['nin', case when lower(coalesce(new.id_type, '')) like '%nin%' then private.identity_key('nin', new.id_number) end],
    array['phone', private.identity_key('phone', new.phone)],
    array['phone', private.identity_key('phone', new.business_phone)],
    array['payout', case when new.account_number is not null
                         then private.identity_key('payout', new.account_number) end]]);
  if hit is null then
    return new;
  end if;
  if new.status = 'APPROVED'::public.agent_application_status
     and old.status is distinct from new.status
     and not private.is_senior() then
    raise exception 'This application % A senior reviewer must decide it.', hit
      using errcode = 'insufficient_privilege';
  end if;
  if new.status in ('SUBMITTED'::public.agent_application_status, 'UNDER_REVIEW'::public.agent_application_status)
     and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    perform private.raise_denylist_alert('An application matches an identity stopped for fraud', 'This application ' || hit,
                                         'agent_application', new.id::text);
  end if;
  return new;
end;
$function$;

revoke all on function private.application_denylist_check() from public, anon, authenticated;

drop trigger if exists agent_applications_denylist_check on public.agent_applications;
create trigger agent_applications_denylist_check
  before insert or update of status on public.agent_applications
  for each row execute function private.application_denylist_check();

/* A payout account added. */
create or replace function private.payout_denylist_check()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  hit text;
begin
  if not exists (select 1 from private.identity_denylist) then
    return new;
  end if;
  hit := private.denylist_match('payout',
           private.identity_key('payout', new.account_number));
  if hit is not null then
    perform private.raise_denylist_alert('A payout account matches an identity stopped for fraud',
      'This payout account ' || hit || '.', tg_table_name, new.id::text);
  end if;
  return new;
end;
$function$;

revoke all on function private.payout_denylist_check() from public, anon, authenticated;

drop trigger if exists payout_accounts_denylist_check on public.payout_accounts;
create trigger payout_accounts_denylist_check
  after insert or update of account_number on public.payout_accounts
  for each row execute function private.payout_denylist_check();
drop trigger if exists bank_accounts_denylist_check on public.bank_accounts;
create trigger bank_accounts_denylist_check
  after insert or update of account_number on public.bank_accounts
  for each row execute function private.payout_denylist_check();

/* A phone number set on a profile. */
create or replace function private.phone_denylist_check()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  hit text;
begin
  if new.phone is null or not exists (select 1 from private.identity_denylist) then
    return new;
  end if;
  hit := private.denylist_match('phone', private.identity_key('phone', new.phone));
  if hit is not null then
    perform private.raise_denylist_alert('A phone number matches an identity stopped for fraud',
      'This phone number ' || hit || '.', 'profile', new.id::text);
  end if;
  return new;
end;
$function$;

revoke all on function private.phone_denylist_check() from public, anon, authenticated;

drop trigger if exists profiles_phone_denylist_check on public.profiles;
create trigger profiles_phone_denylist_check
  after insert or update of phone on public.profiles
  for each row execute function private.phone_denylist_check();

/* Every account carrying this key, found by comparing HMACs row by row. */
create or replace function private.users_with_key(p_kind text, p_hmac text)
returns table (user_id uuid)
language sql
stable
security definer
set search_path to ''
as $function$
  select distinct x.u from (
    select p.id as u from public.profiles p
     where p_kind = 'phone' and private.identity_key('phone', p.phone) = p_hmac
    union all
    select a.user_id from public.agent_applications a
     where (p_kind = 'phone' and (private.identity_key('phone', a.phone) = p_hmac
                                  or private.identity_key('phone', a.business_phone) = p_hmac))
        or (p_kind = 'nin' and lower(coalesce(a.id_type, '')) like '%nin%' and private.identity_key('nin', a.id_number) = p_hmac)
        or (p_kind = 'payout' and a.account_number is not null
            and private.identity_key('payout', a.account_number) = p_hmac)
    union all
    select ag.user_id from public.payout_accounts pa join public.agents ag on ag.id = pa.agent_id
     where p_kind = 'payout' and private.identity_key('payout', pa.account_number) = p_hmac
    union all
    select b.user_id from public.bank_accounts b
     where p_kind = 'payout' and b.deleted_at is null
       and private.identity_key('payout', b.account_number) = p_hmac
  ) x
  where x.u is not null and p_hmac is not null
  limit 50;
$function$;

revoke all on function private.users_with_key(text, text) from public, anon, authenticated;

/* THE FILE. Staff only; every read writes an audit row. */
create or replace function public.admin_person_file(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  person jsonb;
  timeline jsonb;
  linked jsonb;
  matches jsonb;
  my_agent uuid;
begin
  if not private.is_staff() then
    raise exception 'only staff open a person file' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from auth.users u where u.id = p_user) then
    return jsonb_build_object('state', 'unknown');
  end if;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values ((select auth.uid()), 'person.view', 'user', p_user::text, '{}'::jsonb);

  select a.id into my_agent from public.agents a where a.user_id = p_user order by a.created_at limit 1;

  select jsonb_build_object(
    'user_id', p_user,
    'name', coalesce(nullif(btrim(p.display_name), ''), nullif(btrim(concat_ws(' ', p.first_name, p.surname)), '')),
    'handle', sp.handle,
    'joined_at', coalesce(p.created_at, u.created_at),
    'roles', coalesce((select jsonb_agg(r.role::text order by r.role) from public.user_roles r where r.user_id = p_user), '[]'::jsonb),
    'agent', case when ag.id is null then null else jsonb_build_object(
        'id', ag.id, 'name', ag.display_name, 'status', ag.status, 'tier', ag.verification_tier, 'since', ag.created_at) end,
    'checks', coalesce((select jsonb_agg(jsonb_build_object('kind', c.kind, 'status', c.status, 'decided_at', c.decided_at) order by c.decided_at desc nulls last)
                          from public.agent_verification_checks c where c.agent_id = ag.id), '[]'::jsonb),
    'stop', (select jsonb_build_object('id', s.id, 'since', s.suspended_at, 'reason', s.reason,
                                       'fraud_upheld_at', s.fraud_upheld_at, 'fraud_note', s.fraud_note)
               from public.agent_suspensions s where s.agent_id = ag.id and s.lifted_at is null
              order by s.suspended_at desc limit 1))
    into person
    from auth.users u
    left join public.profiles p on p.id = u.id
    left join public.social_profiles sp on sp.user_id = u.id
    left join public.agents ag on ag.id = my_agent
   where u.id = p_user;

  select coalesce(jsonb_agg(e order by (e ->> 'at') desc), '[]'::jsonb)
    into timeline
    from (
      select jsonb_build_object('at', x.at, 'desk', x.desk, 'title', x.title, 'href', x.href) as e
        from (
          select a.created_at as at, 'applications' as desk,
                 'Application ' || coalesce(a.reference, '') || ' ' || lower(a.status::text) as title,
                 '/admin/agents' as href
            from public.agent_applications a where a.user_id = p_user
          union all
          select l.created_at, 'listings', 'Listing ' || coalesce(l.reference, '') || ' ' || lower(l.status::text),
                 '/admin/listings/' || l.id
            from public.listings l where l.agent_id = my_agent
          union all
          select r.created_at, 'reports', 'Reported something: ' || coalesce(r.category, r.reason, 'report'), '/admin/reports'
            from public.reports r where r.reporter_id = p_user
          union all
          select r.created_at, 'reports', 'Was reported: ' || coalesce(r.category, r.reason, 'report'), '/admin/reports'
            from public.reports r
           where (r.target_type in ('user', 'profile') and r.target_id = p_user::text)
              or (r.target_type = 'agent' and r.target_id = my_agent::text)
              or (r.target_type = 'listing' and r.target_id in (select l.id::text from public.listings l where l.agent_id = my_agent))
          union all
          select f.created_at, 'moderation', 'A message was flagged: ' || f.reason::text, '/admin/moderation'
            from public.message_flags f join public.messages m on m.id = f.message_id where m.sender_id = p_user
          union all
          select t.created_at, 'support', 'Support ticket ' || coalesce(t.reference, '') || ': ' || coalesce(t.topic, ''), '/admin/support'
            from public.support_tickets t where t.user_id = p_user
          union all
          select b.created_at, 'payments', 'Booking ' || lower(b.status::text) || coalesce(' · ref ' || (select tx.provider_ref from public.transactions tx where tx.booking_id = b.id order by tx.created_at desc limit 1), ''),
                 '/admin/payments'
            from public.bookings b where b.guest_id = p_user
          union all
          select rp.created_at, 'payments', 'Rent charge as tenant', '/admin/payments'
            from public.rent_payments rp where rp.tenant_id = p_user
          union all
          select we.created_at, 'money', 'Wallet ' || we.kind::text || ' ' || we.direction::text || coalesce(' · ref ' || we.reference, ''), '/admin/money'
            from public.wallet_entries we join public.wallets w on w.id = we.wallet_id where w.user_id = p_user
          union all
          select s.suspended_at, 'stops', 'Stopped: ' || s.reason, '/admin/stops'
            from public.agent_suspensions s where s.agent_id = my_agent
          union all
          select s.lifted_at, 'stops', 'Stop lifted', '/admin/stops'
            from public.agent_suspensions s where s.agent_id = my_agent and s.lifted_at is not null
          union all
          select al.created_at, 'audit', al.action, '/admin/audit'
            from public.audit_log al
           where al.entity_id in (p_user::text, coalesce(my_agent::text, '-'))
             and al.action <> 'person.view'
        ) x
       where x.at is not null
       order by x.at desc
       limit 200
    ) t;

  /* Other accounts sharing a key, compared as HMACs, with their standing. */
  with mine as (
    select key_kind, key_hmac from private.person_keys(p_user)
    union
    select 'mailbox', private.identity_key('mailbox', ai.email_canonical)
      from public.account_identities ai where ai.user_id = p_user
  ),
  shared as (
    select distinct other.user_id, other.via
      from (
        select kd2.user_id, 'device'::text as via
          from public.known_devices kd
          join public.known_devices kd2 on kd2.fingerprint = kd.fingerprint and kd2.user_id <> p_user
         where kd.user_id = p_user
        union all
        select w.user_id, m.key_kind
          from mine m
          cross join lateral private.users_with_key(m.key_kind, m.key_hmac) w
         where m.key_kind in ('phone', 'payout', 'nin') and w.user_id <> p_user
        union all
        select ai2.user_id, 'mailbox'
          from mine m
          join public.account_identities ai2
            on m.key_kind = 'mailbox' and private.identity_key('mailbox', ai2.email_canonical) = m.key_hmac
         where ai2.user_id <> p_user
      ) other
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'user_id', s.user_id,
           'name', coalesce(nullif(btrim(p.display_name), ''), nullif(btrim(ag.display_name), ''), 'An account'),
           'via', s.via,
           'agent_status', ag.status,
           'stopped_on', st.suspended_at,
           'fraud_upheld', st.fraud_upheld_at is not null)
         order by st.suspended_at nulls last), '[]'::jsonb)
    into linked
    from shared s
    left join public.profiles p on p.id = s.user_id
    left join public.agents ag on ag.user_id = s.user_id
    left join lateral (
      select x.suspended_at, x.fraud_upheld_at from public.agent_suspensions x
       where x.agent_id = ag.id order by x.suspended_at desc limit 1) st on true;

  select coalesce(jsonb_agg(jsonb_build_object('kind', k.key_kind, 'sentence', private.denylist_match(k.key_kind, k.key_hmac))), '[]'::jsonb)
    into matches
    from private.person_keys(p_user) k
   where private.denylist_match(k.key_kind, k.key_hmac) is not null
     and not exists (select 1 from private.identity_denylist d join public.agent_suspensions s on s.id = d.suspension_id
                      where d.key_hmac = k.key_hmac and s.agent_id = my_agent);

  return jsonb_build_object('state', 'ready', 'person', person, 'timeline', timeline,
                            'linked', linked, 'matches', matches, 'senior', private.is_senior());
end;
$function$;

revoke all on function public.admin_person_file(uuid) from public, anon;
grant execute on function public.admin_person_file(uuid) to authenticated;
