-- The scanner knew fraud and knew nothing about abuse.
--
-- `private.scan_post()` and `private.scan_social_profile()` have held a post or
-- a bio since August when it carried a ten digit account number or payment
-- language. That is a FRAUD filter and it is a good one. It catches nobody
-- posting a threat, a slur, sexual content, or a campaign of harassment at one
-- person. A platform where two strangers arrange to meet alone at a property
-- had no filter at all for the class of harm that meeting can carry.
--
-- Apple's guideline 1.2 asks, in its published words, for "A method for
-- filtering objectionable material from being posted to the app". We had one
-- for money and none for people. This migration adds the second branch beside
-- the first in both scanners, so one insert passes through both and a post can
-- be held for either reason with the honest sentence for that reason.
--
-- THE TERM LIST IS NOT INVENTED HERE AND THE TABLE SHIPS EMPTY.
--
-- What Vallo forbids is the founder's decision and nobody else's, and a slur
-- list written by a build agent would be both wrong and unreviewed. So
-- `public.blocked_terms` is created, locked, indexed and wired, and seeded with
-- nothing. `private.objectionable_pattern()` returns null over an empty table
-- and the new branch is then a no-op, which means THIS MIGRATION CHANGES NO
-- BEHAVIOUR UNTIL THE LIST IS SEEDED. That is deliberate: a filter that fires
-- on terms nobody approved is worse than no filter, and the seed is a one line
-- insert the moment the list is approved. See `-- SEED REQUIRED` below.
--
-- BORN LOCKED. Both functions are SECURITY DEFINER and both have EXECUTE
-- revoked from `anon` and `authenticated` in this same migration. The table is
-- RLS-enabled with no permissive policy at all, so no client role can read the
-- list of forbidden words, which would otherwise be a map for getting round it.
--
-- Also here, because it is the same product and the same review: the two
-- columns that record a person accepting the community rules. See the second
-- half of this file.

-- ---------------------------------------------------------------------------
-- The term list.
-- ---------------------------------------------------------------------------

create table if not exists public.blocked_terms (
  term       text primary key,
  severity   public.alert_severity not null default 'high',
  created_at timestamptz not null default now()
);

comment on table public.blocked_terms is
  'Terms that hold a post or a bio for human review. Readable only by the scanners, which run as definer. SEED REQUIRED: the list itself is the founder''s decision and this table ships empty on purpose.';

alter table public.blocked_terms enable row level security;

-- No policy is written. RLS with no permissive policy denies every client role,
-- which is the intended state: only a definer function reads this.
revoke all on table public.blocked_terms from anon, authenticated;

-- SEED REQUIRED. The approved list goes here, one row per term, as a regular
-- expression fragment without anchors, for example:
--   insert into public.blocked_terms (term, severity) values ('<term>', 'high');
-- Until a row exists, `private.objectionable_pattern()` returns null and the
-- abuse branch below does nothing at all.

-- ---------------------------------------------------------------------------
-- The pattern, built once per statement from the table.
-- ---------------------------------------------------------------------------

create or replace function private.objectionable_pattern()
returns text
language sql
stable
security definer
set search_path = public
as $$
  -- Word-bounded alternation, so a term never matches inside an innocent word.
  -- Null over an empty table, which is what makes the empty seed a no-op.
  select case
    when count(*) = 0 then null
    else '\m(' || string_agg(term, '|') || ')\M'
  end
  from public.blocked_terms;
$$;

revoke all on function private.objectionable_pattern() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- The post scanner, with the abuse branch beside the fraud one.
-- ---------------------------------------------------------------------------

create or replace function private.scan_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  keyword_pattern constant text := '(payment|transfer|pay me|account number|acct|bank)';
  abuse_pattern   text;
  reason text;
  sev    public.alert_severity;
  held_for_abuse boolean := false;
begin
  if tg_op = 'UPDATE' then
    if new.body is not distinct from old.body then return new; end if;
  end if;
  if new.author_kind <> 'USER' then return new; end if;
  if coalesce(btrim(new.body), '') = '' then return new; end if;

  if new.body ~ '\d{10}' then
    reason := 'an account number';
    sev    := 'high';
  elsif new.body ~* keyword_pattern then
    reason := 'payment language';
    sev    := 'medium';
  else
    -- The abuse branch. It runs only when the fraud branch found nothing, so a
    -- post is held once and for the first reason that applies.
    abuse_pattern := private.objectionable_pattern();
    if abuse_pattern is not null and new.body ~* abuse_pattern then
      held_for_abuse := true;
      sev := 'high';
    end if;
  end if;

  if held_for_abuse then
    -- The sentence never repeats the term back, here or in the alert. Printing
    -- it would put the thing we refused to publish into the moderation queue's
    -- title and into the author's own screen.
    new.status      := 'HELD';
    new.hold_reason := 'This may break our content standards. Somebody is reading it before it goes up.';
    insert into public.risk_alerts (severity, title, description, entity_type, entity_id)
    values (sev, 'Post held for review',
      'A post matched the objectionable content list and was held before it became public.',
      'post', new.id::text);
  elsif reason is not null then
    new.status      := 'HELD';
    new.hold_reason := 'This mentions ' || reason || '. Somebody is reading it before it goes up.';
    insert into public.risk_alerts (severity, title, description, entity_type, entity_id)
    values (sev, 'Post held for review',
      'A post contained ' || reason || ' and was held before it became public.',
      'post', new.id::text);
  end if;
  return new;
end;
$$;

revoke all on function private.scan_post() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- The bio scanner, same addition.
-- ---------------------------------------------------------------------------

create or replace function private.scan_social_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  keyword_pattern constant text := '(payment|transfer|pay me|account number|acct|bank)';
  abuse_pattern   text;
  haystack        text;
  reason          text;
  held_for_abuse  boolean := false;
begin
  haystack := coalesce(new.bio, '') || ' ' || coalesce(new.link, '');

  if haystack ~ '\d{10}' then
    reason := 'account number';
  elsif haystack ~* keyword_pattern then
    reason := 'payment language';
  else
    abuse_pattern := private.objectionable_pattern();
    if abuse_pattern is not null and haystack ~* abuse_pattern then
      held_for_abuse := true;
    end if;
  end if;

  if held_for_abuse then
    new.bio_status := 'HELD';
    insert into public.risk_alerts (severity, title, description, entity_type, entity_id)
    values (
      'high',
      'Social bio held for review',
      'A profile bio or link matched the objectionable content list and was held before it became public.',
      'social_profile',
      new.user_id::text
    );
  elsif reason is not null then
    new.bio_status := 'HELD';
    insert into public.risk_alerts (severity, title, description, entity_type, entity_id)
    values (
      case when reason = 'account number' then 'high' else 'medium' end,
      'Social bio held for review',
      'A profile bio or link contained ' || reason || ' and was held before it became public.',
      'social_profile',
      new.user_id::text
    );
  elsif tg_op = 'UPDATE' and (new.bio is distinct from old.bio or new.link is distinct from old.link) then
    -- An edit that is clean releases the hold. Unchanged from the original.
    new.bio_status := 'LIVE';
  end if;

  return new;
end;
$$;

revoke all on function private.scan_social_profile() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Accepting the community rules, recorded rather than assumed.
-- ---------------------------------------------------------------------------
--
-- Sign up showed a passive notice: "By continuing you agree to our Terms and
-- Privacy Policy." Nobody agreed to anything; they were told they had. There
-- is now a required tick at sign up, and this is where the fact of it lands,
-- with the version of the document that was on screen at the time, because an
-- acceptance with no version is an acceptance of nothing in particular.

alter table public.profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version     text;

comment on column public.profiles.terms_accepted_at is
  'When this person accepted the Terms, the Privacy policy and the Community rules at sign up. Null for an account created before the tick existed.';
comment on column public.profiles.terms_version is
  'Which version of those documents was on screen when they accepted. Null for the same reason.';

-- `handle_new_user` reads the sign-up metadata into the profile row, so the
-- acceptance travels the same path every other sign-up field already travels
-- and needs no second write that could fail on its own.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  meta         jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  first_name   text := nullif(trim(meta ->> 'first_name'), '');
  surname      text := nullif(trim(meta ->> 'surname'), '');
  nickname     text := nullif(trim(meta ->> 'nickname'), '');
  state_in     text := nullif(trim(meta ->> 'state_code'), '');
  lga_in       text := nullif(lower(trim(meta ->> 'lga_code')), '');
  occupation_in text := nullif(lower(trim(meta ->> 'occupation_code')), '');
  terms_in     text := nullif(trim(meta ->> 'terms_version'), '');
  state_ok     text;
  lga_ok       text;
  occupation_ok text;
  fallback     text;
  seeded       public.app_role;
  full_in      text;
  avatar_in    text;
begin
  select s.code into state_ok
  from public.states s
  where s.code = state_in or lower(s.name) = lower(state_in)
  limit 1;

  if lga_in is not null then
    select l.code, l.state_code into lga_ok, state_ok
    from public.local_governments l
    where l.code = lga_in
      and (state_ok is null or l.state_code = state_ok)
    limit 1;

    if lga_ok is null then
      select s.code into state_ok
      from public.states s
      where s.code = state_in or lower(s.name) = lower(state_in)
      limit 1;
    end if;
  end if;

  if occupation_in is not null then
    select o.code into occupation_ok
    from public.occupations o
    where o.code = occupation_in
    limit 1;
  end if;

  -- Google sends a whole name rather than two halves. Split it, because a first
  -- name and a surname is what every other surface in this product reads.
  if first_name is null and surname is null then
    full_in := nullif(trim(coalesce(meta ->> 'full_name', meta ->> 'name')), '');
    if full_in is not null then
      first_name := nullif(split_part(full_in, ' ', 1), '');
      surname    := nullif(btrim(substr(full_in, length(split_part(full_in, ' ', 1)) + 1)), '');
    end if;
  end if;

  -- Only a URL that will actually render is stored.
  avatar_in := nullif(trim(coalesce(meta ->> 'avatar_url', meta ->> 'picture')), '');
  if avatar_in is not null and avatar_in !~ '^https://lh[0-9]\.googleusercontent\.com/' then
    avatar_in := null;
  end if;

  fallback := coalesce(
    nullif(trim(meta ->> 'display_name'), ''),
    nullif(trim(meta ->> 'full_name'), ''),
    nullif(trim(meta ->> 'name'), ''),
    nullif(trim(concat_ws(' ', first_name, surname)), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );

  insert into public.profiles
    (id, display_name, first_name, surname, nickname, state_code, lga_code, occupation_code, phone, avatar_url,
     terms_accepted_at, terms_version)
  values
    (new.id, fallback, first_name, surname, nickname, state_ok, lga_ok, occupation_ok,
     nullif(trim(meta ->> 'phone'), ''), avatar_in,
     -- The timestamp is the server's, never the client's, and it exists only
     -- when a version came with it. A tick with no version records nothing,
     -- which is honest: we would not know what they had agreed to.
     case when terms_in is not null then now() else null end,
     terms_in);

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict do nothing;

  select b.role into seeded
  from public.admin_bootstrap b
  where lower(b.email) = lower(trim(coalesce(new.email, '')))
  limit 1;

  if seeded is not null then
    insert into public.user_roles (user_id, role)
    values (new.id, seeded)
    on conflict do nothing;

    update public.admin_bootstrap
    set claimed_at = now()
    where lower(email) = lower(trim(coalesce(new.email, '')));
  end if;

  begin
    perform private.claim_default_handle(new.id);
  exception when others then
    null;
  end;

  return new;
end;
$function$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
