-- V-50, THE PHONE NUMBER IS THE SCARCITY ANCHOR, NOT THE EMAIL.
--
-- A Gmail address costs nothing to multiply; a working Nigerian SIM is tied to
-- a registered identity by NIN-SIM linkage and costs money. The founder's own
-- finding is nine accounts behind seven mailboxes. So a one-time code confirms
-- a phone, ONE confirmed phone per account and ONE account per confirmed
-- phone, and the product asks for it at three consequential moments only (the
-- first inspection request, the first review, the first report that is not
-- about immediate danger). Browsing, saving and messaging stay open, and a
-- member is still never asked to verify who they are: a phone is not an ID.
--
-- WHAT LIVES WHERE.
--
--   public.confirmed_phones   one row per account that confirmed a phone. The
--                             number is UNIQUE across the table, so a second
--                             account cannot confirm the same SIM. The owner
--                             reads their own row; nobody writes it except
--                             `public.confirm_phone` below.
--   private.phone_otps        the one live code per account, as a SHA-256 of
--                             the account and the code, never the code. Ten
--                             minutes, five attempts. Unreachable over the API.
--
--   public.phone_otp_issue    service role only. The server generates the code,
--                             hands the hash here and the code to the SMS or
--                             WhatsApp transport. A member who could call this
--                             could read their own code back and skip the SIM,
--                             which is the whole point, so they cannot.
--   public.confirm_phone      the member, with the code they received. Compares
--                             hashes in the database, counts attempts, writes
--                             the confirmed row, and awards `verified_member`
--                             ("Email and phone confirmed", which until today
--                             had no award path anywhere) when the email is
--                             confirmed as well.
--
-- REPUTATION COUNTS PER PHONE. The one place a count of people moves a public
-- state is V-05's bait-listing pause. With `phone_confirmation` on, only
-- renters with a confirmed phone are counted as witnesses there, so a pause
-- takes two SIMs, not two mailboxes. Reviews and reports are gated at the
-- first one in the app, so with the flag on every reviewer and every
-- non-danger reporter has a phone behind them.
--
-- THE FLAG. `feature_flags.phone_confirmation`, false. The transport is the
-- founder's vendor (an SMS aggregator or a WhatsApp authentication template,
-- founder question 7) and until it exists no code can reach a phone, so the
-- three moments must not ask for one.

create table if not exists public.confirmed_phones (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  phone        text not null unique check (phone ~ '^\+234[7-9][0-9]{9}$'),
  confirmed_at timestamptz not null default now()
);

comment on table public.confirmed_phones is
  'V-50. One confirmed Nigerian mobile per account and one account per mobile. Written only by public.confirm_phone after a one-time code; read by its owner.';

revoke all on public.confirmed_phones from public, anon, authenticated;
alter table public.confirmed_phones enable row level security;

drop policy if exists confirmed_phones_select_own on public.confirmed_phones;
create policy confirmed_phones_select_own on public.confirmed_phones
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.confirmed_phones to authenticated;
grant all on public.confirmed_phones to service_role;

create table if not exists private.phone_otps (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  phone      text not null check (phone ~ '^\+234[7-9][0-9]{9}$'),
  code_hash  text not null,
  expires_at timestamptz not null,
  attempts   smallint not null default 0,
  created_at timestamptz not null default now()
);

comment on table private.phone_otps is
  'V-50. The one live code per account, hashed with the account id. Never the code. Not exposed over the API.';

revoke all on private.phone_otps from public, anon, authenticated;
grant all on private.phone_otps to service_role;

/* ------------------------------------------------------------- issuing */

create or replace function public.phone_otp_issue(p_user uuid, p_phone text, p_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user is null or p_phone !~ '^\+234[7-9][0-9]{9}$' or p_code !~ '^[0-9]{6}$' then
    return 'invalid';
  end if;
  if exists (select 1 from public.confirmed_phones c where c.phone = p_phone and c.user_id <> p_user) then
    return 'taken';
  end if;
  if exists (select 1 from public.confirmed_phones c where c.phone = p_phone and c.user_id = p_user) then
    return 'already';
  end if;
  insert into private.phone_otps (user_id, phone, code_hash, expires_at, attempts, created_at)
  values (
    p_user, p_phone,
    encode(extensions.digest(p_user::text || ':' || p_code, 'sha256'), 'hex'),
    now() + interval '10 minutes', 0, now()
  )
  on conflict (user_id) do update
    set phone = excluded.phone, code_hash = excluded.code_hash,
        expires_at = excluded.expires_at, attempts = 0, created_at = now();
  return 'issued';
end;
$$;

comment on function public.phone_otp_issue(uuid, text, text) is
  'V-50. Service role only. Stores the hash of a code the server generated and is about to send. Refuses a number another account has confirmed.';

revoke all on function public.phone_otp_issue(uuid, text, text) from public, anon, authenticated;
grant execute on function public.phone_otp_issue(uuid, text, text) to service_role;

/* ---------------------------------------------------------- confirming */

create or replace function public.confirm_phone(p_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  otp private.phone_otps%rowtype;
begin
  if uid is null then return 'signed_out'; end if;
  if p_code is null or p_code !~ '^[0-9]{6}$' then return 'wrong'; end if;

  select * into otp from private.phone_otps where user_id = uid for update;
  if not found then return 'no_code'; end if;
  if otp.expires_at < now() then
    delete from private.phone_otps where user_id = uid;
    return 'expired';
  end if;
  if otp.attempts >= 5 then
    delete from private.phone_otps where user_id = uid;
    return 'locked';
  end if;
  if otp.code_hash <> encode(extensions.digest(uid::text || ':' || p_code, 'sha256'), 'hex') then
    update private.phone_otps set attempts = attempts + 1 where user_id = uid;
    return 'wrong';
  end if;

  delete from private.phone_otps where user_id = uid;
  if exists (select 1 from public.confirmed_phones c where c.phone = otp.phone and c.user_id <> uid) then
    return 'taken';
  end if;

  begin
    insert into public.confirmed_phones (user_id, phone, confirmed_at)
    values (uid, otp.phone, now())
    on conflict (user_id) do update set phone = excluded.phone, confirmed_at = now();
  exception when unique_violation then
    return 'taken';
  end;

  if exists (select 1 from auth.users u where u.id = uid and u.email_confirmed_at is not null) then
    perform private.award_badge(uid, 'verified_member', 'Email and phone confirmed',
      jsonb_build_object('phone_confirmed_at', now()));
  end if;
  return 'confirmed';
end;
$$;

comment on function public.confirm_phone(text) is
  'V-50. The signed-in member confirms the code they received. Five attempts, ten minutes. Awards verified_member when the email is confirmed too.';

revoke all on function public.confirm_phone(text) from public, anon;
grant execute on function public.confirm_phone(text) to authenticated;

/* ------------------------------ V-05's witnesses count per confirmed phone */

create or replace function private.inspection_truth_consequences()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  witnesses integer;
  lister uuid;
  property text;
  pause_on boolean;
  phones_on boolean;
begin
  if new.off_platform_ask = 'yes' then
    insert into public.reports (reporter_id, target_type, target_id, category, reason)
    values (
      new.respondent_id, 'listing', new.listing_id::text, 'off_platform_payment',
      'Filed automatically from the questions after inspection ' || new.inspection_id::text ||
      ': the renter was asked for money outside Vallo.'
    )
    on conflict do nothing;
  end if;

  select coalesce((select f.enabled from public.feature_flags f where f.key = 'truth_autopause'), false)
    into pause_on;
  select coalesce((select f.enabled from public.feature_flags f where f.key = 'phone_confirmation'), false)
    into phones_on;

  if pause_on and (new.available = 'no' or new.property_matched = 'no') then
    /* V-50: with phone confirmation on, a witness is a confirmed phone. */
    select count(distinct coalesce(cp.phone, t.respondent_id::text)) into witnesses
      from public.inspection_truth t
      left join public.confirmed_phones cp on cp.user_id = t.respondent_id
     where t.listing_id = new.listing_id
       and t.answered_at > now() - interval '30 days'
       and (t.available = 'no' or t.property_matched = 'no')
       and (not phones_on or cp.phone is not null)
       and t.answered_at > coalesce(
             (select max(al.created_at) from public.audit_log al
               where al.entity_type = 'listing' and al.entity_id = new.listing_id::text
                 and al.action = 'listing.paused_by_truth_answers'),
             '-infinity'::timestamptz);

    if witnesses >= 2 then
      update public.listings
         set status = 'MORE_INFO_REQUIRED'::public.listing_status
       where id = new.listing_id
         and status = 'PUBLISHED'::public.listing_status
      returning (select a.user_id from public.agents a where a.id = listings.agent_id), title
        into lister, property;

      if lister is not null then
        insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
        values (
          null, 'listing.paused_by_truth_answers', 'listing', new.listing_id::text,
          jsonb_build_object(
            'rule', 'two different renters said not available or not the flat in the photos within 30 days',
            'witnesses', witnesses,
            'counted_per_phone', phones_on
          )
        );
        perform private.notify(
          lister,
          'listing',
          'Listing paused: please reconfirm it',
          witnesses::text || ' renters who inspected ' || coalesce(property, 'this listing') ||
            ' in the last 30 days said it was not available or not the flat in the photos. ' ||
            'It is off search until you reconfirm it.',
          '/agent/listings'
        );
      end if;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.inspection_truth_consequences() from public, anon, authenticated;

insert into public.feature_flags (key, enabled, note)
values ('phone_confirmation', false,
        'V-50. When true, a confirmed phone is asked for at the first inspection request, first review and first non-danger report, and V-05 counts witnesses per phone. Needs an SMS or WhatsApp code transport (founder question 7).')
on conflict (key) do nothing;

do $readback$
declare bad text := '';
begin
  if has_table_privilege('anon', 'public.confirmed_phones', 'select') then bad := bad || ' [anon reads phones]'; end if;
  if has_table_privilege('authenticated', 'public.confirmed_phones', 'insert')
     or has_table_privilege('authenticated', 'public.confirmed_phones', 'update') then
    bad := bad || ' [a member can write a confirmed phone]';
  end if;
  if has_table_privilege('authenticated', 'private.phone_otps', 'select') then bad := bad || ' [codes readable]'; end if;
  if has_function_privilege('authenticated', 'public.phone_otp_issue(uuid,text,text)', 'execute') then
    bad := bad || ' [a member can issue their own code]';
  end if;
  if not has_function_privilege('authenticated', 'public.confirm_phone(text)', 'execute') then
    bad := bad || ' [a member cannot confirm]';
  end if;
  if bad <> '' then raise exception 'READ-BACK FAILED:%', bad; end if;
end;
$readback$;
