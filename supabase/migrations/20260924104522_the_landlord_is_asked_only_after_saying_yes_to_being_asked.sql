/*
 * V-31 AND V-32. THE LANDLORD IN THE ROOM, AND ASKED ONLY AFTER SAYING YES.
 *
 * Vallo already stores the principal's number (`listing_mandates.principal_phone`)
 * and rings it once, at review, because "the call back is the check". Then the
 * platform never speaks to them again. This gives the landlord one line into
 * Vallo on that number, for two questions and nothing else:
 *
 *   VACANCY (V-31). Every fortnight, and on the day a renter's inspection is
 *   confirmed: "is your 2 bedroom flat in Ikeja GRA still available?" Reply 1
 *   yes, 2 let, 3 "I have not instructed this agent". The landlord is the one
 *   person in the chain who always knows whether the flat is let and gains
 *   nothing from a stale advert.
 *
 *   RENT (V-32). The day a tenant pays: the six parts frozen on `rent_payments`,
 *   to the kobo, and "That is right" or "That is not what I agreed". The agent
 *   who told the landlord N2.5m and charged the tenant N2.8m is exposed to the
 *   one person who can end the mandate, on the day it happens.
 *
 * ---------------------------------------------------------------------------
 * CONSENT FIRST, AND THE DATABASE IS WHERE IT IS ENFORCED.
 *
 * Messaging somebody who is not a user of the platform, without their consent,
 * is not lawful under the NDPA. So the reviewer reads one sentence on the
 * mandate call and records the answer: `principal_consented_at`, WHO read it
 * (`principal_consent_read_by`) and the exact sentence read. No consent, no
 * message, ever, and the listing simply shows nothing.
 *
 * The refusal is not a check in a sender that a second sender could forget.
 * `principal_asks_consent_gate` refuses to create a question, and refuses to
 * mark one sent, for a mandate that is not approved, has no number, has no
 * consent, has had consent withdrawn, or has expired. `principal_messages`
 * carries the same gate on the transport's own log. A server bug cannot send
 * what the database will not issue a token for.
 *
 * CONSENT CAPTURE IS ON TODAY. It only records; it sends nothing. Everything
 * that SENDS is behind `feature_flags.landlord_line`, which fails closed: no
 * row, or a row that says false, and no question is created, issued, or
 * answered, and the "Not reconfirmed" sweep clears rather than marks.
 *
 * ---------------------------------------------------------------------------
 * THE TOKEN IS STORED ONLY AS A HASH, IS SINGLE USE, AND EXPIRES.
 *
 * `landlord_line_issue` mints 24 random bytes inside the database, stores
 * sha256 of the url-safe text, and hands the raw token back ONCE to the service
 * role that sends the message. It is never stored, and `principal_messages.body`
 * refuses any text that carries a link token. An answer is a single update of a
 * row whose `answered_at` is null, so a second answer finds nothing to answer.
 * Vacancy links live 28 days, rent links 30.
 *
 * A REPLY CODE PER MESSAGE, so a forwarded text cannot answer for another flat.
 * An SMS reply is matched on the principal's own number AND the four character
 * code printed in that message; a bare "1" is accepted only when that number
 * has exactly one open question.
 *
 * ---------------------------------------------------------------------------
 * SILENCE IS NOT A NEGATIVE. Nothing is shown while a question waits. Only when
 * a vacancy question has gone 21 days unanswered does
 * `private.sweep_not_reconfirmed` set `listings.not_reconfirmed_since`, and
 * only then does the listing sort last, say "Not reconfirmed", and refuse new
 * inspection requests. "Owner confirmed available N days ago" is
 * `availability_confirmed_at`, written only by the principal's own answer.
 *
 * V-32's table is the `purpose = 'rent'` half of `principal_asks`, one row per
 * `rent_payments` row by a unique index, rather than a second table called
 * `rent_acknowledgements`. One principal, one line, one token scheme, one
 * reply page: two tables would be two consent gates to keep in step.
 */

/* ------------------------------------------------------------- the switch */

insert into public.feature_flags (key, enabled, note)
values ('landlord_line', false,
        'V-31/V-32. Fails closed. When true, Vallo asks consenting principals whether the flat is still free and shows them the rent a tenant paid. Consent capture is not behind this flag.')
on conflict (key) do nothing;

create or replace function private.landlord_line_open()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select coalesce((select f.enabled from public.feature_flags f where f.key = 'landlord_line'), false);
$function$;

revoke all on function private.landlord_line_open() from public, anon, authenticated;

/* ---------------------------------------------------------------- consent */

alter table public.listing_mandates
  add column if not exists principal_consented_at         timestamptz,
  add column if not exists principal_consent_read_by      uuid references auth.users(id) on delete set null,
  add column if not exists principal_consent_sentence     text,
  add column if not exists principal_consent_withdrawn_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.listing_mandates'::regclass
                  and conname = 'listing_mandates_consent_names_its_sentence') then
    alter table public.listing_mandates
      add constraint listing_mandates_consent_names_its_sentence
        check (principal_consented_at is null
               or (principal_consent_sentence is not null
                   and length(btrim(principal_consent_sentence)) between 40 and 800));
  end if;
end $$;

comment on column public.listing_mandates.principal_consented_at is
  'When the principal said yes to the consent sentence on the mandate call. No consent, no message: principal_asks refuses to exist without it.';
comment on column public.listing_mandates.principal_consent_read_by is
  'The member of staff who read the sentence and recorded the answer.';
comment on column public.listing_mandates.principal_consent_sentence is
  'The exact sentence that was read, so what the principal agreed to is on the row and not in a code history.';
comment on column public.listing_mandates.principal_consent_withdrawn_at is
  'When the principal asked Vallo to stop. Later than principal_consented_at means stopped.';

/* The consent columns are written only through record_principal_consent. */
create or replace function private.listing_mandates_consent_guard()
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
    new.principal_consented_at := null;
    new.principal_consent_read_by := null;
    new.principal_consent_sentence := null;
    new.principal_consent_withdrawn_at := null;
    return new;
  end if;
  if new.principal_consented_at is distinct from old.principal_consented_at
     or new.principal_consent_read_by is distinct from old.principal_consent_read_by
     or new.principal_consent_sentence is distinct from old.principal_consent_sentence
     or new.principal_consent_withdrawn_at is distinct from old.principal_consent_withdrawn_at then
    raise exception 'consent is recorded through the consent control, never by editing a mandate'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$function$;

revoke all on function private.listing_mandates_consent_guard() from public, anon, authenticated;

drop trigger if exists listing_mandates_consent_guard on public.listing_mandates;
create trigger listing_mandates_consent_guard
  before insert or update on public.listing_mandates
  for each row execute function private.listing_mandates_consent_guard();

/* May this mandate's principal be messaged at all, right now? */
create or replace function private.principal_may_be_messaged(p_mandate uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
      from public.listing_mandates m
      join public.listings l on l.id = m.listing_id
     where m.id = p_mandate
       and m.review_status = 'approved'::public.document_review_status
       and m.principal_phone is not null
       and m.principal_consented_at is not null
       and (m.principal_consent_withdrawn_at is null
            or m.principal_consent_withdrawn_at < m.principal_consented_at)
       and (m.expires_on is null or m.expires_on >= (now() at time zone 'Africa/Lagos')::date)
       and l.is_demo = false
  );
$function$;

revoke all on function private.principal_may_be_messaged(uuid) from public, anon, authenticated;

/*
 * THE REVIEWER RECORDS THE ANSWER. Staff only. 'given' needs the sentence that
 * was read; 'withdrawn' stops everything at once, including a question already
 * sent and not yet answered.
 */
create or replace function public.record_principal_consent(
  p_mandate uuid,
  p_answer text,
  p_sentence text default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  m public.listing_mandates%rowtype;
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
  end if;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values ((select auth.uid()), 'mandate.consent.' || p_answer, 'listing_mandate', p_mandate::text,
          jsonb_build_object('listing_id', m.listing_id));

  return jsonb_build_object(
    'consented_at', m.principal_consented_at,
    'withdrawn_at', m.principal_consent_withdrawn_at);
end;
$function$;

revoke all on function public.record_principal_consent(uuid, text, text) from public, anon;
grant execute on function public.record_principal_consent(uuid, text, text) to authenticated;

/* The consent state of a set of mandates, for the console. Staff only. */
create or replace function public.mandate_consents(p_mandates uuid[])
returns table (
  mandate_id uuid,
  consented_at timestamptz,
  read_by_name text,
  withdrawn_at timestamptz,
  has_number boolean
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
         m.principal_phone is not null
    from public.listing_mandates m
    left join public.profiles p on p.id = m.principal_consent_read_by
   where m.id = any(p_mandates[1:200]);
end;
$function$;

revoke all on function public.mandate_consents(uuid[]) from public, anon;
grant execute on function public.mandate_consents(uuid[]) to authenticated;

/* -------------------------------------------------------- the questions */

create table if not exists public.principal_asks (
  id              uuid primary key default gen_random_uuid(),
  mandate_id      uuid not null references public.listing_mandates(id) on delete cascade,
  listing_id      uuid not null references public.listings(id) on delete cascade,
  purpose         text not null check (purpose in ('vacancy', 'rent')),
  reason          text not null check (reason in ('fortnightly', 'inspection_confirmed', 'rent_paid')),
  inspection_id   uuid references public.inspection_requests(id) on delete set null,
  rent_payment_id uuid references public.rent_payments(id) on delete cascade,
  token_hash      bytea unique,
  reply_code      text check (reply_code is null or reply_code ~ '^[A-Z0-9]{4}$'),
  created_at      timestamptz not null default now(),
  sent_at         timestamptz,
  expires_at      timestamptz,
  answered_at     timestamptz,
  answer          text,
  answered_via    text check (answered_via is null or answered_via in ('link', 'sms', 'whatsapp')),
  note            text check (note is null or char_length(note) <= 400),
  constraint principal_asks_answer_fits_purpose check (
    answer is null
    or (purpose = 'vacancy' and answer in ('available', 'let', 'not_instructed'))
    or (purpose = 'rent' and answer in ('confirmed', 'disputed'))),
  constraint principal_asks_answer_is_dated check ((answer is null) = (answered_at is null)),
  constraint principal_asks_rent_names_the_payment check ((purpose = 'rent') = (rent_payment_id is not null)),
  constraint principal_asks_reason_fits_purpose check (
    (purpose = 'rent' and reason = 'rent_paid') or (purpose = 'vacancy' and reason <> 'rent_paid')),
  constraint principal_asks_sent_has_a_token check ((sent_at is null) = (token_hash is null))
);

comment on table public.principal_asks is
  'V-31 and V-32. One question to the principal named on a mandate: is the flat still free (vacancy), or is this the rent you agreed (rent). Refused at insert and at send without an approved, consented, unexpired mandate and the landlord_line flag. The token is stored only as sha256.';

create unique index if not exists principal_asks_one_per_rent_payment
  on public.principal_asks (rent_payment_id) where purpose = 'rent';
create unique index if not exists principal_asks_one_per_inspection
  on public.principal_asks (inspection_id) where reason = 'inspection_confirmed';
create index if not exists principal_asks_listing_idx on public.principal_asks (listing_id, created_at desc);
create index if not exists principal_asks_mandate_idx on public.principal_asks (mandate_id);
create index if not exists principal_asks_unsent_idx on public.principal_asks (created_at) where sent_at is null;

create table if not exists public.principal_messages (
  id            uuid primary key default gen_random_uuid(),
  ask_id        uuid not null references public.principal_asks(id) on delete cascade,
  mandate_id    uuid not null references public.listing_mandates(id) on delete cascade,
  channel       text not null check (channel in ('stub', 'sms', 'whatsapp')),
  body          text not null check (char_length(body) <= 640),
  transport_ref text check (transport_ref is null or char_length(transport_ref) <= 200),
  created_at    timestamptz not null default now(),
  constraint principal_messages_body_carries_no_token
    check (body !~ '/landlord/[A-Za-z0-9_-]{16,}')
);

comment on table public.principal_messages is
  'V-31 and V-32. What was sent to a principal, on which channel, as the transport reported it. The body is stored with the link token removed and never carries the number. The stub transport writes here and sends nothing.';

create index if not exists principal_messages_ask_idx on public.principal_messages (ask_id);
create index if not exists principal_messages_mandate_idx on public.principal_messages (mandate_id);

/* BORN LOCKED. */
revoke all on public.principal_asks from public, anon, authenticated;
revoke all on public.principal_messages from public, anon, authenticated;
grant all on public.principal_asks to service_role;
grant all on public.principal_messages to service_role;

alter table public.principal_asks enable row level security;
alter table public.principal_messages enable row level security;

drop policy if exists principal_asks_select_staff on public.principal_asks;
create policy principal_asks_select_staff on public.principal_asks
  for select using (private.is_staff());
drop policy if exists principal_messages_select_staff on public.principal_messages;
create policy principal_messages_select_staff on public.principal_messages
  for select using (private.is_staff());
grant select on public.principal_asks to authenticated;
grant select on public.principal_messages to authenticated;

/* THE CONSENT GATE, at creation and at the moment of sending. */
create or replace function private.principal_asks_consent_gate()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if tg_op = 'INSERT' or (new.sent_at is not null and old.sent_at is null) then
    if not private.landlord_line_open() then
      raise exception 'the landlord line is switched off, so no principal is asked anything'
        using errcode = 'insufficient_privilege';
    end if;
    if not private.principal_may_be_messaged(new.mandate_id) then
      raise exception 'this principal has not consented to be messaged (or the mandate is not approved, has no number, or has ended), so no message may be sent'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$function$;

revoke all on function private.principal_asks_consent_gate() from public, anon, authenticated;

drop trigger if exists principal_asks_consent_gate on public.principal_asks;
create trigger principal_asks_consent_gate
  before insert or update of sent_at on public.principal_asks
  for each row execute function private.principal_asks_consent_gate();

create or replace function private.principal_messages_consent_gate()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not private.landlord_line_open() then
    raise exception 'the landlord line is switched off, so nothing is sent to a principal'
      using errcode = 'insufficient_privilege';
  end if;
  if not private.principal_may_be_messaged(new.mandate_id) then
    raise exception 'this principal has not consented to be messaged, so no message may be recorded as sent'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$function$;

revoke all on function private.principal_messages_consent_gate() from public, anon, authenticated;

drop trigger if exists principal_messages_consent_gate on public.principal_messages;
create trigger principal_messages_consent_gate
  before insert on public.principal_messages
  for each row execute function private.principal_messages_consent_gate();

/* --------------------------------------------------- queue, issue, record */

/*
 * WHAT IS DUE, queued as unsent questions. Service role only, called by the
 * landlord-line job. Three sources:
 *   inspection_confirmed   a renter's inspection confirmed in the last two
 *                          days, at most one question per listing per day
 *   fortnightly            a live rental with a messageable principal and no
 *                          vacancy question in fourteen days
 *   rent_paid              a rent charge paid in the last thirty days
 */
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

  /* The inspection question first, so a listing due both questions today is
     asked once, for the more specific reason. */
  insert into public.principal_asks (mandate_id, listing_id, purpose, reason, inspection_id)
  select distinct on (l.id) m.id, l.id, 'vacancy', 'inspection_confirmed', r.id
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
     and not exists (select 1 from public.principal_asks a where a.inspection_id = r.id)
     and not exists (select 1 from public.principal_asks a
                      where a.listing_id = l.id and a.purpose = 'vacancy'
                        and a.created_at > now() - interval '1 day')
   order by l.id, r.updated_at desc
  on conflict do nothing;
  get diagnostics n_inspection = row_count;

  insert into public.principal_asks (mandate_id, listing_id, purpose, reason)
  select distinct on (l.id) m.id, l.id, 'vacancy', 'fortnightly'
    from public.listings l
    join public.listing_mandates m on m.listing_id = l.id
   where l.status = 'PUBLISHED'::public.listing_status
     and l.listing_intent = 'rent'::public.listing_intent
     and l.is_demo = false
     and l.closed_at is null
     and m.kind in ('letting', 'management')
     and private.principal_may_be_messaged(m.id)
     and not exists (select 1 from public.principal_asks a
                      where a.listing_id = l.id and a.purpose = 'vacancy'
                        and a.created_at > now() - interval '14 days')
   order by l.id, m.created_at desc;
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

/* The first name a tenant may be told, past any title. Never the surname. */
create or replace function private.principal_first_name(p_name text)
returns text
language sql
immutable
set search_path to ''
as $function$
  select w
    from unnest(regexp_split_to_array(btrim(coalesce(p_name, '')), '\s+')) with ordinality as t(w, i)
   where lower(regexp_replace(w, '[.,]', '', 'g')) not in
         ('mr', 'mrs', 'ms', 'miss', 'dr', 'chief', 'alhaji', 'alhaja', 'engr', 'prof',
          'barr', 'pastor', 'otunba', 'hon', 'sir', 'lady', 'rev', 'arc', 'high', 'oba', 'hrh')
     and w <> ''
   order by i
   limit 1;
$function$;

revoke all on function private.principal_first_name(text) from public, anon, authenticated;

/*
 * ISSUE: mint a token and a reply code for each due question, mark it sent,
 * and hand back what the transport needs, ONCE. Service role only. The raw
 * token and the number leave the database here and nowhere else.
 */
create or replace function public.landlord_line_issue(p_limit integer default 50)
returns table (
  ask_id uuid,
  token text,
  reply_code text,
  principal_phone text,
  purpose text,
  reason text,
  place text,
  lister_name text,
  total_minor bigint,
  rent_period public.rent_period,
  move_in date,
  review_status text,
  consented_at timestamptz,
  withdrawn_at timestamptz,
  expires_on date,
  is_demo boolean
)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  a record;
  tok text;
  code text;
  alphabet constant text := 'ACDEFHJKMNPRTUVWXY3479';
begin
  if not private.landlord_line_open() then
    return;
  end if;

  delete from public.principal_asks q
   where q.sent_at is null and not private.principal_may_be_messaged(q.mandate_id);

  for a in
    select q.*
      from public.principal_asks q
     where q.sent_at is null
     order by q.created_at
     limit greatest(1, least(coalesce(p_limit, 50), 200))
     for update skip locked
  loop
    tok := translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_');
    loop
      select string_agg(substr(alphabet, 1 + (get_byte(b, i) % length(alphabet)), 1), '' order by i)
        into code
        from (select extensions.gen_random_bytes(4) as b) x, generate_series(0, 3) as i;
      exit when not exists (
        select 1 from public.principal_asks o
          join public.listing_mandates om on om.id = o.mandate_id
          join public.listing_mandates am on am.id = a.mandate_id
         where o.reply_code = code and o.answered_at is null
           and om.principal_phone = am.principal_phone);
    end loop;

    update public.principal_asks
       set token_hash = extensions.digest(tok, 'sha256'),
           reply_code = code,
           sent_at = now(),
           expires_at = now() + case when a.purpose = 'rent' then interval '30 days' else interval '28 days' end
     where id = a.id;

    return query
    select a.id, tok, code, m.principal_phone, a.purpose, a.reason,
           private.listing_place_words(a.listing_id),
           coalesce(nullif(btrim(b.name), ''), nullif(btrim(ag.display_name), '')),
           rp.total_minor, rp.rent_period, rp.move_in,
           m.review_status::text, m.principal_consented_at, m.principal_consent_withdrawn_at,
           m.expires_on, l.is_demo
      from public.listing_mandates m
      join public.listings l on l.id = a.listing_id
      left join public.agents ag on ag.id = l.agent_id
      left join public.businesses b on b.id = l.firm_id
      left join public.rent_payments rp on rp.id = a.rent_payment_id
     where m.id = a.mandate_id;
  end loop;
end;
$function$;

revoke all on function public.landlord_line_issue(integer) from public, anon, authenticated;
grant execute on function public.landlord_line_issue(integer) to service_role;

/*
 * RECORD what the transport did. Delivered: a row in `principal_messages`,
 * body without the token. Not delivered: the question goes back to unsent,
 * its token and code are dropped, and the next run mints fresh ones.
 */
create or replace function public.landlord_line_record(
  p_ask uuid,
  p_channel text,
  p_body text,
  p_ref text,
  p_delivered boolean
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  a public.principal_asks%rowtype;
begin
  select * into a from public.principal_asks where id = p_ask for update;
  if not found then
    return;
  end if;
  if p_delivered then
    insert into public.principal_messages (ask_id, mandate_id, channel, body, transport_ref)
    values (a.id, a.mandate_id, p_channel, p_body, p_ref);
  elsif a.answered_at is null then
    update public.principal_asks
       set sent_at = null, token_hash = null, reply_code = null, expires_at = null
     where id = a.id;
  end if;
end;
$function$;

revoke all on function public.landlord_line_record(uuid, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.landlord_line_record(uuid, text, text, text, boolean) to service_role;

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
  lister uuid;
  words text;
begin
  select * into a from public.principal_asks where id = p_ask for update;
  if a.answered_at is not null then
    return jsonb_build_object('state', 'used');
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
  select ag.user_id into lister
    from public.listings l join public.agents ag on ag.id = l.agent_id
   where l.id = a.listing_id;

  if p_answer = 'available' then
    update public.listings
       set availability_confirmed_at = now(), not_reconfirmed_since = null
     where id = a.listing_id and closed_at is null;
  elsif p_answer = 'let' then
    perform private.close_listings(a.listing_id, 'let_owner_confirmed', null, null);
  elsif p_answer = 'not_instructed' then
    perform private.close_listings(a.listing_id, 'owner_denied_mandate', null, null);
    insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
    values ('high'::public.alert_severity, 'open'::public.alert_status,
            'A landlord says they never instructed this agent',
            'The principal named on the mandate for the ' || words || ' answered 3: they have not instructed this lister. The listing was closed at once. Call the principal back before anything else.',
            'listing', a.listing_id::text);
    perform private.notify(lister, 'listing'::public.notification_kind,
      'Your listing was closed',
      'The owner named on the mandate for the ' || words || ' told us they have not instructed you. Our team will be in touch.',
      '/agent/listings');
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

/* The token's question, or null. Never raises. */
create or replace function private.principal_ask_by_token(p_token text)
returns public.principal_asks
language sql
stable
security definer
set search_path to ''
as $function$
  select q.*
    from public.principal_asks q
   where p_token is not null
     and length(p_token) between 20 and 64
     and p_token ~ '^[A-Za-z0-9_-]+$'
     and q.token_hash = extensions.digest(p_token, 'sha256')
   limit 1;
$function$;

revoke all on function private.principal_ask_by_token(text) from public, anon, authenticated;

/*
 * THE REPLY PAGE'S READ. Open to a signed-out visitor, because the landlord
 * has no account and needs none. Returns the area and never the address, no
 * number of anybody, and the lister's public display name only.
 */
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

  if a.purpose = 'rent' then
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
    'answer', a.answer,
    'rent', case when a.purpose = 'rent' then jsonb_build_object(
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

/* THE REPLY PAGE'S ANSWER. Single use, expiring, open to a signed-out visitor. */
create or replace function public.landlord_line_answer(
  p_token text,
  p_answer text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  a public.principal_asks%rowtype;
begin
  a := private.principal_ask_by_token(p_token);
  if a.id is null then
    return jsonb_build_object('state', 'unknown');
  end if;
  if not private.landlord_line_open() then
    return jsonb_build_object('state', 'closed');
  end if;
  if a.answered_at is not null then
    return jsonb_build_object('state', 'used');
  end if;
  if a.expires_at <= now() then
    return jsonb_build_object('state', 'expired');
  end if;
  return private.principal_apply_answer(a.id, p_answer, 'link', p_note);
end;
$function$;

revoke all on function public.landlord_line_answer(text, text, text) from public;
grant execute on function public.landlord_line_answer(text, text, text) to anon, authenticated;

/*
 * AN SMS OR WHATSAPP REPLY, as the aggregator's webhook reports it. Service
 * role only. Matched on the principal's own number and the message's code; a
 * reply with no code is accepted only when that number has one open question.
 * The digit means what the message said it means for that question's purpose.
 */
create or replace function public.landlord_line_inbound(
  p_phone text,
  p_code text,
  p_digit integer,
  p_channel text default 'sms'
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  hits integer;
  a public.principal_asks%rowtype;
  answer text;
begin
  if not private.landlord_line_open() then
    return jsonb_build_object('state', 'closed');
  end if;
  if p_channel not in ('sms', 'whatsapp') then
    return jsonb_build_object('state', 'invalid');
  end if;

  select count(*) into hits
    from public.principal_asks q
    join public.listing_mandates m on m.id = q.mandate_id
   where m.principal_phone = p_phone
     and q.sent_at is not null and q.answered_at is null and q.expires_at > now()
     and (p_code is null or q.reply_code = upper(p_code));

  if hits = 0 then
    return jsonb_build_object('state', 'unknown');
  end if;
  if hits > 1 then
    return jsonb_build_object('state', 'ambiguous');
  end if;

  select q.* into a
    from public.principal_asks q
    join public.listing_mandates m on m.id = q.mandate_id
   where m.principal_phone = p_phone
     and q.sent_at is not null and q.answered_at is null and q.expires_at > now()
     and (p_code is null or q.reply_code = upper(p_code));

  answer := case
    when a.purpose = 'vacancy' and p_digit = 1 then 'available'
    when a.purpose = 'vacancy' and p_digit = 2 then 'let'
    when a.purpose = 'vacancy' and p_digit = 3 then 'not_instructed'
    when a.purpose = 'rent' and p_digit = 1 then 'confirmed'
    when a.purpose = 'rent' and p_digit = 2 then 'disputed'
  end;
  if answer is null then
    return jsonb_build_object('state', 'invalid', 'purpose', a.purpose);
  end if;

  return private.principal_apply_answer(a.id, answer, p_channel, null);
end;
$function$;

revoke all on function public.landlord_line_inbound(text, text, integer, text) from public, anon, authenticated;
grant execute on function public.landlord_line_inbound(text, text, integer, text) to service_role;

/* ------------------------------------------------------------ stopping */

/*
 * "STOP" IS HONOURED AT ONCE, AND FOR THE NUMBER RATHER THAN THE LISTING.
 *
 * A landlord with four agents on one flat has four mandates naming one number.
 * Stopping one of them and carrying on messaging about the other three would
 * be a consent withdrawal that did not withdraw anything, so a stop, whether
 * typed as a reply or tapped on the reply page, withdraws consent on every
 * mandate that names the same number, expires every open question to it, and
 * deletes every unsent one. Consent can be given again only by a reviewer on
 * a call, which is where it was given in the first place.
 */
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

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (null, 'mandate.consent.stopped', 'principal', null,
          jsonb_build_object('mandates', n, 'via', p_via));
  return n;
end;
$function$;

revoke all on function private.principal_stop_number(text, text) from public, anon, authenticated;

/* The reply page's stop. Works on an answered or expired link too: the right to stop does not expire. */
create or replace function public.landlord_line_stop(p_token text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  a public.principal_asks%rowtype;
  phone text;
begin
  a := private.principal_ask_by_token(p_token);
  if a.id is null then
    return jsonb_build_object('state', 'unknown');
  end if;
  select m.principal_phone into phone from public.listing_mandates m where m.id = a.mandate_id;
  perform private.principal_stop_number(phone, 'link');
  return jsonb_build_object('state', 'stopped');
end;
$function$;

revoke all on function public.landlord_line_stop(text) from public;
grant execute on function public.landlord_line_stop(text) to anon, authenticated;

/* An inbound STOP from the aggregator. Service role only. */
create or replace function public.landlord_line_stop_number(p_phone text, p_channel text default 'sms')
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
begin
  return jsonb_build_object('state', 'stopped',
                            'mandates', private.principal_stop_number(p_phone, p_channel));
end;
$function$;

revoke all on function public.landlord_line_stop_number(text, text) from public, anon, authenticated;
grant execute on function public.landlord_line_stop_number(text, text) to service_role;

/* ------------------------------------------------ the tenant's dated fact */

/*
 * V-32 on the tenant's side: one of three dated facts, or nothing. Nothing
 * when no question was ever sent (no mandate, no consent, the line off), which
 * the page renders as nothing: a null is not a negative. The principal's
 * FIRST NAME only, past any title, and never a number.
 */
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

  select private.principal_first_name(m.principal_name) into who
    from public.listing_mandates m where m.id = a.mandate_id;

  return jsonb_build_object(
    'state', case a.answer when 'confirmed' then 'confirmed' when 'disputed' then 'disputed' else 'waiting' end,
    'answered_at', a.answered_at,
    'asked_at', a.sent_at,
    'first_name', who);
end;
$function$;

revoke all on function public.rent_landlord_fact(uuid) from public, anon;
grant execute on function public.rent_landlord_fact(uuid) to authenticated;

/* ----------------------------------------- twenty-one days of silence */

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
    /* The line is off: nobody is being asked, so nobody may be marked for not
       answering. Clear rather than leave a stale mark standing. */
    update public.listings set not_reconfirmed_since = null where not_reconfirmed_since is not null;
    return 0;
  end if;

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
          and (l.availability_confirmed_at is null or a.sent_at > l.availability_confirmed_at)
          /* Only a question that really reached the landlord counts. The stub
             transport records what it would have sent and sends nothing, so a
             question it "sent" can never make a listing "Not reconfirmed". */
          and exists (select 1 from public.principal_messages pm
                       where pm.ask_id = a.id and pm.channel <> 'stub'));
  get diagnostics n = row_count;
  return n;
end;
$function$;

revoke all on function private.sweep_not_reconfirmed() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobname)
      from cron.job where jobname = 'vallo_landlord_not_reconfirmed';
    perform cron.schedule(
      'vallo_landlord_not_reconfirmed',
      '35 4 * * *',
      $job$select private.sweep_not_reconfirmed();$job$
    );
  end if;
end $$;
