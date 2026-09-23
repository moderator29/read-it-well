/*
 * ONE MAILBOX, MANY ACCOUNTS, AND WE COULD NOT SEE IT AT ALL.
 *
 * Gmail delivers seyi+anything@gmail.com and s.e.y.i@gmail.com to the same
 * mailbox as seyi@gmail.com. To this platform those are three unrelated
 * people. One person can mint accounts at zero cost, and the dots are the
 * worse half because they are invisible in a way a plus tag is not.
 *
 * THIS DOES NOT REFUSE A SINGLE SIGN-UP AND IT MUST NEVER BE MADE TO.
 * Refusing plus tags and dots stops perhaps a third of this, breaks legitimate
 * use, and loses outright to anybody with a second mailbox. Email cannot be
 * made scarce. The real defence belongs on consequential actions and is
 * assessed in `docs/ONE_PERSON_MANY_ACCOUNTS.md`, not here.
 *
 * ALL THIS DOES IS LET US ANSWER ONE QUESTION: how many accounts share one
 * underlying mailbox. It is an investigative signal for the admin person view
 * and for moderation, and it is nothing else.
 *
 * WHY IT IS URGENT RATHER THAN MERELY USEFUL. The founder has ruled that an
 * email address can never be changed once an account holds it. So accounts
 * cannot be merged or corrected later, and a link that is not recorded at
 * creation does not exist. Today the platform has nine accounts, zero
 * bookings, zero reviews and zero real listings. There is nobody to fight yet,
 * and the whole backfill is nine rows.
 *
 * WHAT THE CANONICAL FORM IS, AND WHERE IT DELIBERATELY STOPS SHORT.
 *
 *   gmail.com, googlemail.com   lowercase, drop everything from the first
 *                               '+', remove every '.', fold googlemail to
 *                               gmail.               rule 'gmail'
 *   a known plus-tag provider   lowercase, drop everything from the first
 *                               '+'.                 rule 'plus_strip'
 *   anything else               lowercase only.      rule 'lowercase_only'
 *   no '@', or empty            lowercase only.      rule 'unparseable'
 *
 * Three things it does NOT do, each on purpose:
 *
 *  - It does not strip '-' tags for Yahoo. Yahoo's tag separator is '-', and
 *    '-' is also an ordinary character in ordinary local parts, so stripping
 *    it would fuse real strangers. A false link on a moderation screen is a
 *    person wrongly accused.
 *  - It does not strip plus tags on unknown domains. Most providers support
 *    them and a custom domain may not; an unknown domain gets the conservative
 *    answer. The rule is stored beside the value so a human can see which
 *    answer they are reading.
 *  - It does not touch catch-all custom domains, which defeat this entirely.
 *    Anybody who owns a domain has unlimited addresses and no canonical form
 *    can see it. That is the honest ceiling of this whole file, and it is why
 *    the second piece of work is the real one.
 */

create table if not exists public.account_identities (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  email_canonical text not null,
  canonical_rule  text not null check (canonical_rule in ('gmail', 'plus_strip', 'lowercase_only', 'unparseable')),
  recorded_at     timestamptz not null default now()
);

/* RULE 21 AND THE DEFAULT ACL. `pg_default_acl` grants arwdDxtm on every NEW
   relation in public to anon and authenticated, so a create table ships this
   world-readable unless it is revoked here. A canonical address IS an email
   address: it is personal data and it is a map of who is who. */
revoke all on table public.account_identities from public, anon, authenticated;

alter table public.account_identities enable row level security;

drop policy if exists account_identities_admin_select on public.account_identities;
create policy account_identities_admin_select
  on public.account_identities for select
  using (
    private.has_role((select auth.uid()), 'admin'::public.app_role)
    or private.has_role((select auth.uid()), 'super_admin'::public.app_role)
  );

/* The index is the entire point: the question is "who else shares this
   mailbox", asked of one row at a time from a moderation screen. */
create index if not exists account_identities_canonical_idx
  on public.account_identities (email_canonical);

comment on table public.account_identities is
  'One row per account, holding the canonical form of its email address so we '
  'can see when several accounts share one underlying mailbox. Never refuses a '
  'sign-up, never shown to the account holder, admin read only. The raw '
  'address is not duplicated here: it lives in auth.users and one copy of a '
  'personal datum is enough.';

/*
 * Returns {canonical, rule}. One function rather than two so the parse cannot
 * drift between the value and the label describing how it was reached.
 */
create or replace function private.canonical_email_parts(addr text)
returns text[]
language plpgsql
immutable
set search_path to ''
as $function$
declare
  clean  text;
  at_pos integer;
  local  text;
  domain text;
begin
  clean := lower(btrim(coalesce(addr, ''), E' \t\r\n'));
  at_pos := strpos(clean, '@');

  /* No '@' means this is not an address we can take apart. Say so rather than
     guessing, because a wrong guess here becomes a wrong link on a screen. */
  if clean = '' or at_pos = 0 then
    return array[clean, 'unparseable'];
  end if;

  local  := left(clean, at_pos - 1);
  domain := substr(clean, at_pos + 1);

  /* A second '@' is not a valid address. Treated as unparseable rather than
     silently split on the first one. */
  if strpos(domain, '@') > 0 then
    return array[clean, 'unparseable'];
  end if;

  if domain in ('gmail.com', 'googlemail.com') then
    if strpos(local, '+') > 0 then
      local := left(local, strpos(local, '+') - 1);
    end if;
    local := replace(local, '.', '');
    return array[local || '@gmail.com', 'gmail'];
  end if;

  if domain in (
    'outlook.com', 'hotmail.com', 'hotmail.co.uk', 'live.com', 'live.co.uk',
    'msn.com', 'yahoo.com', 'yahoo.co.uk', 'ymail.com', 'rocketmail.com',
    'icloud.com', 'me.com', 'mac.com',
    'protonmail.com', 'protonmail.ch', 'proton.me', 'pm.me',
    'fastmail.com', 'zoho.com', 'gmx.com', 'gmx.de', 'aol.com'
  ) then
    if strpos(local, '+') > 0 then
      local := left(local, strpos(local, '+') - 1);
    end if;
    return array[local || '@' || domain, 'plus_strip'];
  end if;

  return array[clean, 'lowercase_only'];
end;
$function$;

revoke all on function private.canonical_email_parts(text) from public, anon, authenticated;

/*
 * The recorder. AFTER INSERT so a failure here can never refuse a sign-up, and
 * AFTER UPDATE OF email as well, so that if an address ever does change the
 * link follows it rather than pointing at a mailbox nobody uses. Under the
 * immutability rule the update branch should never fire, and it costs nothing
 * to be right if it does.
 *
 * An account with no email at all (a phone sign-up) is skipped rather than
 * recorded as empty, because an empty canonical would fuse every such account
 * into one imaginary person.
 */
create or replace function private.record_account_identity()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  parts text[];
begin
  if new.email is null or btrim(new.email, E' \t\r\n') = '' then
    return null;
  end if;

  parts := private.canonical_email_parts(new.email);

  insert into public.account_identities (user_id, email_canonical, canonical_rule)
  values (new.id, parts[1], parts[2])
  on conflict (user_id) do update
    set email_canonical = excluded.email_canonical,
        canonical_rule  = excluded.canonical_rule,
        recorded_at     = now();

  return null;
end;
$function$;

revoke all on function private.record_account_identity() from public, anon, authenticated;

drop trigger if exists users_record_account_identity on auth.users;
create trigger users_record_account_identity
  after insert or update of email on auth.users
  for each row execute function private.record_account_identity();

/* THE BACKFILL, IN THE SAME MIGRATION, because a link not recorded at creation
   does not exist and these nine were created before this file. */
insert into public.account_identities (user_id, email_canonical, canonical_rule)
select u.id,
       (private.canonical_email_parts(u.email))[1],
       (private.canonical_email_parts(u.email))[2]
  from auth.users u
 where u.email is not null and btrim(u.email, E' \t\r\n') <> ''
on conflict (user_id) do nothing;

/*
 * READ BACK. Four assertions and two of them are controls, because a
 * canonicaliser that fuses everything passes every test that only looks for
 * matches.
 */
do $$
declare
  n_users integer;
  n_rows  integer;
  a       text;
  b       text;
begin
  if has_table_privilege('anon', 'public.account_identities', 'SELECT') then
    raise exception 'account_identities is readable by anon';
  end if;
  if has_table_privilege('authenticated', 'public.account_identities', 'SELECT') then
    raise exception 'account_identities is readable by authenticated';
  end if;

  select count(*) into n_users from auth.users
   where email is not null and btrim(email, E' \t\r\n') <> '';
  select count(*) into n_rows from public.account_identities;
  if n_rows <> n_users then
    raise exception 'backfill is short: % accounts with an address, % rows', n_users, n_rows;
  end if;

  /* THE POSITIVE. The two QA accounts created today are this exact mechanism,
     used honestly, so they are the live demonstration rather than a fixture. */
  a := (private.canonical_email_parts('phantomfcalls+qamember@gmail.com'))[1];
  b := (private.canonical_email_parts('phantomfcalls+qaadmi@gmail.com'))[1];
  if a <> b then
    raise exception 'the two QA addresses did not canonicalise together: % vs %', a, b;
  end if;

  /* And the dots, which are the half nobody sees. */
  if (private.canonical_email_parts('P.h.a.n.t.o.m.f.c.a.l.l.s@googlemail.com'))[1] <> a then
    raise exception 'dots and googlemail did not fold onto the same mailbox';
  end if;

  /* THE CONTROLS. A canonicaliser that answers the same thing for everybody
     passes every assertion above. */
  if (private.canonical_email_parts('ngozi@gmail.com'))[1]
     = (private.canonical_email_parts('adaobi@gmail.com'))[1] then
    raise exception 'two different mailboxes were fused';
  end if;

  /* A custom domain keeps its plus tag, because we do not know that domain
     honours one. Conservative on purpose: a false link accuses somebody. */
  if (private.canonical_email_parts('sales+leads@vallospaces.com'))[1]
     <> 'sales+leads@vallospaces.com' then
    raise exception 'an unknown domain had its plus tag stripped';
  end if;
  if (private.canonical_email_parts('sales+leads@vallospaces.com'))[2] <> 'lowercase_only' then
    raise exception 'the rule label disagrees with the value';
  end if;
end $$;

/*
 * PROVED BY WRITING, NOT BY READING. The read-back above can see the grants
 * and the trigger's presence, and neither of those can see that the body runs.
 * `scripts/probes/account_identity_recorder.sql` holds the probe; it went
 * through apply_migration and ended in a deliberate raise so nothing committed:
 *
 *   PROBE ALL PASS account_identities: wrote=testperson@gmail.com rule=gmail
 *   shared=2 no_email_rows=0 (all rolled back)
 *
 * Two of those are controls. `shared=2` is the feature. `no_email_rows=0` is
 * the control that a phone sign-up is skipped rather than recorded with an
 * empty canonical, which would fuse every phone account into one imaginary
 * person. And the first insert was written the way the product writes one,
 * into auth.users, rather than into this table directly.
 *
 * WHAT IT FOUND ON THE NINE ACCOUNTS THAT ALREADY EXISTED, read back outside
 * this migration: nine accounts, seven mailboxes. Three accounts share one.
 */
