-- SEC-05 / STORE-P2-01 / SEC-06: one content scanner for every surface a
-- person writes to, a matcher that survives spacing and digit tricks without
-- holding real Nigerian names and places, and a discriminatory-preference
-- detector for listings that holds for review instead of refusing.

------------------------------------------------------------------------------
-- 1. The term list: a per-term action, and the tuning.
--
-- 'hold' keeps the content off the public surface until a person reads it.
-- 'flag' lets it through and opens a risk alert. A term goes to 'flag' when it
-- is also a real name, place, idiom or landmark here: Sambo is a Northern
-- surname, "spic and span" is a cleaning phrase, "I will deal with you" is an
-- everyday idiom, and Western Union offices are landmarks in listing copy.
------------------------------------------------------------------------------
alter table public.blocked_terms
  add column if not exists action text not null default 'hold';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'blocked_terms_action_is_known') then
    alter table public.blocked_terms
      add constraint blocked_terms_action_is_known check (action in ('hold', 'flag'));
  end if;
end $$;

-- "loli" is a given name ("Mrs Loli Adeyemi"). The child-safety term is lolicon.
delete from public.blocked_terms where term = 'loli';

update public.blocked_terms set action = 'flag', severity = 'medium'
 where term in ('coon', 'paki', 'wog', 'spic', 'chink', 'sambo',
                'i will deal with you', 'call me on whatsapp',
                'western union', 'moneygram');

insert into public.blocked_terms (term, category, severity, action, reason) values
  ('lolicon',          'abuse.child-safety',    'high',   'hold', 'Sexualised depiction of children.'),
  ('shotacon',         'abuse.child-safety',    'high',   'hold', 'Sexualised depiction of children.'),
  ('kiddie porn',      'abuse.child-safety',    'high',   'hold', 'Child sexual abuse material.'),
  ('child sex',        'abuse.child-safety',    'high',   'hold', 'Child sexual abuse.'),
  ('preteen sex',      'abuse.child-safety',    'high',   'hold', 'Child sexual abuse.'),
  ('minors for sex',   'abuse.child-safety',    'high',   'hold', 'Solicitation of children for sex.'),
  ('i will rape you',  'abuse.violence-threat', 'high',   'hold', 'A direct threat of sexual violence.'),
  ('i will shoot you', 'abuse.violence-threat', 'high',   'hold', 'A direct threat of violence.'),
  ('i go kill you',    'abuse.violence-threat', 'high',   'hold', 'A direct threat of violence, in Pidgin.'),
  ('we go kill you',   'abuse.violence-threat', 'high',   'hold', 'A direct threat of violence, in Pidgin.'),
  ('i go deal with you','abuse.violence-threat','medium', 'flag', 'Pidgin idiom that is usually not a threat; a person reads it.'),
  ('ofe mmanu',        'abuse.ethnic-nigeria',  'medium', 'flag', 'Derogatory name for Yoruba people; also read as food talk, so flagged not held.')
on conflict (term) do nothing;

------------------------------------------------------------------------------
-- 2. Normalisation. Returns the forms of a text that the patterns run on:
-- lower case; accents stripped (NFKD); zero-width and soft-hyphen characters
-- removed; Cyrillic and Greek look-alike letters read as Latin; digits and
-- symbols inside words read as letters (1 as i, and again as l); punctuation
-- and underscores as spaces; whitespace runs collapsed; a run of three or more
-- single letters joined ("n i g g e r"); and, as further forms, runs of three
-- or more of one letter collapsed to one and to two ("niiiigger", "kafirrr").
-- Edge punctuation is read both ways: stripped before the digit mapping
-- ("directly!!") and after it ("n!gg@").
------------------------------------------------------------------------------
create or replace function private.content_forms(raw text)
returns text[]
language plpgsql
stable
set search_path = ''
as $$
declare
  base    text;
  variant text;
  forms   text[] := '{}';
  tok     text;
  toks    text[];
  mapped  text[];
  singles text[];
  outp    text[];
  i       int;
  edge    int;
  extra   text;
  froms   constant text   := '0134579@$!|';
  tos     constant text[] := array['oieastgasii', 'oleastgasil'];
begin
  if raw is null or btrim(raw) = '' then
    return forms;
  end if;

  base := lower(normalize(raw, NFKD));
  base := regexp_replace(base, '[̀-ͯ]', '', 'g');
  base := regexp_replace(base, '[​-‍⁠﻿­]', '', 'g');
  -- Cyrillic and Greek letters that look like Latin ones.
  base := translate(base,
    concat(chr(1072), chr(1077), chr(1086), chr(1088), chr(1089), chr(1091), chr(1093), chr(1110), chr(1112), chr(1109), chr(1281), chr(1074), chr(1082), chr(1084), chr(1085), chr(1090), chr(1111), chr(1231), chr(959), chr(945), chr(949), chr(953), chr(954), chr(957), chr(961), chr(964), chr(965), chr(967), chr(946), chr(951)),
    'aeopcyxijsdbkmhtiloaeikvptuxbn');
  toks := regexp_split_to_array(btrim(base), '\s+');

  for i in 1 .. array_length(tos, 1) loop
    for edge in 1 .. 2 loop
      mapped := '{}';
      foreach tok in array toks loop
        if edge = 1 then
          -- Punctuation around a word is punctuation ("directly!!").
          tok := regexp_replace(tok, '^[^a-z0-9]+|[^a-z0-9]+$', '', 'g');
        end if;
        -- Only a token with a letter in it is read as leetspeak, so
        -- "3 bedrooms" keeps its number.
        if tok ~ '[a-z]' then
          tok := translate(tok, froms, tos[i]);
        end if;
        tok := btrim(regexp_replace(tok, '[^a-z0-9]+', ' ', 'g'));
        if tok <> '' then
          mapped := mapped || regexp_split_to_array(tok, ' ');
        end if;
      end loop;

      outp := '{}';
      singles := '{}';
      foreach tok in array mapped || array['']::text[] loop
        if length(tok) = 1 then
          singles := singles || tok;
        else
          if coalesce(array_length(singles, 1), 0) >= 3 then
            outp := outp || translate(array_to_string(singles, ''), froms, tos[i]);
          elsif coalesce(array_length(singles, 1), 0) > 0 then
            outp := outp || singles;
          end if;
          singles := '{}';
          if tok <> '' then
            outp := outp || tok;
          end if;
        end if;
      end loop;

      variant := array_to_string(outp, ' ');
      if variant <> '' and not (variant = any (forms)) then
        forms := forms || variant;
      end if;
      foreach extra in array array[
        regexp_replace(variant, '([a-z])\1{2,}', '\1', 'g'),
        regexp_replace(variant, '([a-z])\1{2,}', '\1\1', 'g')
      ] loop
        if extra <> '' and not (extra = any (forms)) then
          forms := forms || extra;
        end if;
      end loop;
    end loop;
  end loop;

  return forms;
end;
$$;

------------------------------------------------------------------------------
-- 3. The pattern for one action tier, optionally one category family
-- ('abuse' or 'fraud'). A space inside a term matches an optional space, so
-- "childporn" and "callgirl" are caught as well.
------------------------------------------------------------------------------
create or replace function private.blocked_pattern(p_action text, p_scope text default null)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when count(*) = 0 then null
    else '\m(' || string_agg(replace(b.term, ' ', ' ?'), '|' order by length(b.term) desc) || ')\M'
  end
  from public.blocked_terms b
  where b.action = p_action
    and (p_scope is null or b.category like p_scope || '.%');
$$;

------------------------------------------------------------------------------
-- 4. The verdict on one text: 'hold', 'flag' or 'clean', with the category,
-- severity and the words that matched. `p_scope` limits it to one family:
-- a review is refused for abuse, never for warning people about a scam.
------------------------------------------------------------------------------
create or replace function private.content_verdict(
  raw text,
  p_scope text default null,
  out verdict text,
  out category text,
  out severity public.alert_severity,
  out matched text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  forms text[];
  f     text;
  tier  text;
  pat   text;
  m     text;
begin
  verdict := 'clean';
  forms := private.content_forms(raw);
  if coalesce(array_length(forms, 1), 0) = 0 then
    return;
  end if;

  foreach tier in array array['hold', 'flag'] loop
    pat := private.blocked_pattern(tier, p_scope);
    continue when pat is null;
    foreach f in array forms loop
      m := substring(f from pat);
      if m is not null then
        verdict := tier;
        matched := m;
        select b.category, b.severity
          into category, severity
          from public.blocked_terms b
         where b.action = tier
           and (p_scope is null or b.category like p_scope || '.%')
           and m ~ ('^' || replace(b.term, ' ', ' ?') || '$')
         order by length(b.term) desc
         limit 1;
        severity := coalesce(severity, case when tier = 'hold' then 'high' else 'medium' end::public.alert_severity);
        return;
      end if;
    end loop;
  end loop;
end;
$$;

------------------------------------------------------------------------------
-- 5. SEC-06: a tenant preference by ethnicity, religion, marital status or
-- gender. Returns the phrase, or null. Context decides whether "ladies only"
-- is a shared female flat or a refusal, so callers HOLD FOR REVIEW; nothing
-- here refuses a write. Ordinary listing words that share a group word are
-- excluded: boys' quarters, a ladies' bar or salon, a men-only barbershop,
-- a hostel's visiting rule,
-- and the places Igbo Efon, Igbo Ora, Igbo Elerin and Igbo-Ukwu.
------------------------------------------------------------------------------
create or replace function private.discriminatory_phrase(raw text)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  ethnic constant text :=
    '(?:igbos?(?! (?:efon|ora|elerin|ukwu))|yorubas?|hausas?|fulanis?|ijaws?|tivs?|efiks?|ibibios?|edos?'
    || '|urhobos?|itsekiris?|idomas?|igalas?|nupes?|kanuris?|northerners?|southerners?|easterners?|westerners?'
    || '|muslims?|moslems?|christians?|pentecostals?|catholics?|alhajis?|pagans?)';
  status constant text :=
    '(?:(?:married (?:couples?|people|men|women)|unmarried (?:couples?|people|men|women|ladies)|unmarried'
    || '|single (?:men|women|ladies|mothers?|guys|girls|parents?)|singles|bachelors?|spinsters?'
    || '|couples|families|women|ladies|men|males?|females?|guys|girls|boys)'
    || '(?! (?:s )?(?:quarters?|bq|bar|bars|salon|salons|hairdressers?|barbers?|wear|clothing|fashion|boutique'
    || '|toilets?|restrooms?|bathrooms?|hostels?|allowed in (?:the )?rooms?|visitors? after)))';
  grp constant text := '(?:' || ethnic || '|' || status || ')';
  pats constant text[] := array[
    '\m((?:no|not for|strictly no|we do not accept|we dont accept|not open to|not available to|not suitable for) ' || grp || ')\M',
    '\m(' || grp || ' (?:tenants? |people |occupants? )?(?:only(?! (?:barbers?|barbershops?|salons?|hairdressers?|gyms?|spas?|toilets?|restrooms?))|not allowed|not accepted|not welcome|preferred))\M',
    '\m(only ' || grp || ')\M',
    '\m((?:we )?prefer(?:red|s)? (?:only )?' || grp || ')\M',
    '\m(strictly for ' || grp || ')\M'
  ];
  f   text;
  p   text;
  m   text;
begin
  foreach f in array private.content_forms(raw) loop
    foreach p in array pats loop
      m := substring(f from p);
      if m is not null then
        return m;
      end if;
    end loop;
  end loop;
  return null;
end;
$$;

------------------------------------------------------------------------------
-- Who is writing. Every scanner is SECURITY DEFINER, so current_user inside it
-- is always the owner; the role the request arrived as stays in the `role`
-- setting (PostgREST sets it with SET LOCAL ROLE), which a definer function
-- does not change. Admins write through their own authenticated client.
------------------------------------------------------------------------------
create or replace function private.content_writer_is_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(current_setting('role', true), '') in ('authenticated', 'anon')
     and not coalesce(private.has_role((select auth.uid()), 'admin'::public.app_role), false)
     and not coalesce(private.has_role((select auth.uid()), 'super_admin'::public.app_role), false);
$$;

create or replace function private.open_content_alert(
  p_severity public.alert_severity,
  p_title text,
  p_description text,
  p_entity_type text,
  p_entity_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.risk_alerts a
     where a.status = 'open' and a.title = p_title
       and a.entity_type = p_entity_type and a.entity_id = p_entity_id
  ) then
    return;
  end if;
  insert into public.risk_alerts (severity, title, description, entity_type, entity_id)
  values (p_severity, p_title, p_description, p_entity_type, p_entity_id);
end;
$$;

revoke all on function private.content_forms(text) from public, anon, authenticated;
revoke all on function private.blocked_pattern(text, text) from public, anon, authenticated;
revoke all on function private.content_verdict(text, text) from public, anon, authenticated;
revoke all on function private.discriminatory_phrase(text) from public, anon, authenticated;
revoke all on function private.content_writer_is_member() from public, anon, authenticated;
revoke all on function private.open_content_alert(public.alert_severity, text, text, text, text) from public, anon, authenticated;

------------------------------------------------------------------------------
-- 6. Posts and bios: the matcher swapped in; a flag-tier match stays up and
-- opens an alert. Handles are refused outright (RM004), like a reserved one.
------------------------------------------------------------------------------
create or replace function private.scan_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  keyword_pattern constant text := '(payment|transfer|pay me|account number|acct|bank)';
  v      record;
  reason text;
  sev    public.alert_severity;
begin
  if tg_op = 'UPDATE' then
    if new.body is not distinct from old.body then return new; end if;
  end if;
  if new.author_kind <> 'USER' then return new; end if;
  if coalesce(btrim(new.body), '') = '' then return new; end if;

  v := private.content_verdict(new.body);

  if v.verdict = 'hold' then
    new.status      := 'HELD';
    new.hold_reason := 'This may break our content standards. Somebody is reading it before it goes up.';
    perform private.open_content_alert(v.severity, 'Post held for review',
      'A post matched the objectionable content list (' || v.category || ') and was held before it became public.',
      'post', new.id::text);
    return new;
  end if;

  if new.body ~ '\d{10}' then
    reason := 'an account number';
    sev    := 'high';
  elsif new.body ~* keyword_pattern then
    reason := 'payment language';
    sev    := 'medium';
  end if;

  if reason is not null then
    new.status      := 'HELD';
    new.hold_reason := 'This mentions ' || reason || '. Somebody is reading it before it goes up.';
    insert into public.risk_alerts (severity, title, description, entity_type, entity_id)
    values (sev, 'Post held for review',
      'A post contained ' || reason || ' and was held before it became public.',
      'post', new.id::text);
  elsif v.verdict = 'flag' then
    perform private.open_content_alert('medium', 'Post flagged for a look',
      'A post used a watched phrase ("' || v.matched || '", ' || v.category || '). It stayed up.',
      'post', new.id::text);
  end if;

  return new;
end;
$$;

create or replace function private.scan_social_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  keyword_pattern constant text := '(payment|transfer|pay me|account number|acct|bank)';
  haystack text;
  reason   text;
  v        record;
  hv       record;
begin
  if new.handle is not null and (tg_op = 'INSERT' or new.handle is distinct from old.handle) then
    hv := private.content_verdict(new.handle, 'abuse');
    if hv.verdict = 'hold' and not private.content_writer_is_member() then
      perform private.open_content_alert('high', 'Offensive handle',
        'A handle matched the objectionable content list (' || hv.category || ').',
        'social_profile', new.user_id::text);
    elsif hv.verdict = 'hold' then
      raise exception 'That handle uses words our content standards do not allow. Please choose another one.'
        using errcode = 'RM004';
    end if;
  end if;

  -- The bio is read when it changes. A bio a moderator has put back to LIVE
  -- is not re-held by an unrelated edit (a handle, a banner).
  if tg_op = 'UPDATE' and new.bio is not distinct from old.bio and new.link is not distinct from old.link then
    return new;
  end if;

  haystack := coalesce(new.bio, '') || ' ' || coalesce(new.link, '');
  v := private.content_verdict(haystack);

  if v.verdict = 'hold' then
    new.bio_status := 'HELD';
    perform private.open_content_alert('high', 'Social bio held for review',
      'A profile bio or link matched the objectionable content list (' || v.category || ') and was held before it became public.',
      'social_profile', new.user_id::text);
    return new;
  end if;

  if haystack ~ '\d{10}' then
    reason := 'account number';
  elsif haystack ~* keyword_pattern then
    reason := 'payment language';
  end if;

  if reason is not null then
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
    new.bio_status := 'LIVE';
    if v.verdict = 'flag' then
      perform private.open_content_alert('medium', 'Social bio flagged for a look',
        'A bio used a watched phrase ("' || v.matched || '"). It stayed up.',
        'social_profile', new.user_id::text);
    end if;
  end if;

  return new;
end;
$$;

------------------------------------------------------------------------------
-- 7. Stories, story comments and events: abuse holds, like a post.
------------------------------------------------------------------------------
create or replace function private.scan_story()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  keyword_pattern constant text := '(payment|transfer|pay me|account number|acct|bank)';
  words  text;
  reason text;
  sev    public.alert_severity;
  v      record;
begin
  if tg_op = 'UPDATE'
     and new.headline is not distinct from old.headline
     and new.standfirst is not distinct from old.standfirst then
    return new;
  end if;

  words := coalesce(new.headline, '') || ' ' || coalesce(new.standfirst, '');
  v := private.content_verdict(words);

  if v.verdict = 'hold' then
    new.status      := 'HELD';
    new.hold_reason := 'This may break our content standards. Somebody is reading it before it goes up.';
    perform private.open_content_alert(v.severity, 'Story held for review',
      'A story matched the objectionable content list (' || v.category || ') and was held before it became public.',
      'story', new.id::text);
    return new;
  end if;

  if words ~ '\d{10}' then
    reason := 'an account number';
    sev    := 'high';
  elsif words ~* keyword_pattern then
    reason := 'payment language';
    sev    := 'medium';
  end if;

  if reason is not null then
    new.status      := 'HELD';
    new.hold_reason := 'This mentions ' || reason || '. Somebody is reading it before it goes up.';
    insert into public.risk_alerts (severity, title, description, entity_type, entity_id)
    values (sev, 'Story held for review',
      'A story contained ' || reason || ' and was held before it became public.',
      'story', new.id::text);
  elsif v.verdict = 'flag' then
    perform private.open_content_alert('medium', 'Story flagged for a look',
      'A story used a watched phrase ("' || v.matched || '"). It stayed up.',
      'story', new.id::text);
  end if;

  return new;
end;
$$;

create or replace function private.scan_story_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  keyword_pattern constant text := '(payment|transfer|pay me|account number|acct|bank)';
  reason text;
  v      record;
begin
  if tg_op = 'UPDATE' and new.body is not distinct from old.body then return new; end if;

  v := private.content_verdict(new.body);
  if v.verdict = 'hold' then
    new.status      := 'HELD';
    new.hold_reason := 'This may break our content standards. Somebody is reading it before it goes up.';
    perform private.open_content_alert(v.severity, 'Comment held for review',
      'A story comment matched the objectionable content list (' || v.category || ') and was held before it became public.',
      'story_comment', new.id::text);
    return new;
  end if;

  if new.body ~ '\d{10}' then
    reason := 'an account number';
  elsif new.body ~* keyword_pattern then
    reason := 'payment language';
  end if;

  if reason is not null then
    new.status      := 'HELD';
    new.hold_reason := 'This mentions ' || reason || '. Somebody is reading it before it goes up.';
  elsif v.verdict = 'flag' then
    perform private.open_content_alert('medium', 'Comment flagged for a look',
      'A story comment used a watched phrase ("' || v.matched || '"). It stayed up.',
      'story_comment', new.id::text);
  end if;

  return new;
end;
$$;

create or replace function private.scan_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  keyword_pattern constant text := '(payment|transfer|pay me|account number|acct|bank)';
  words  text;
  reason text;
  sev    public.alert_severity;
  v      record;
begin
  if tg_op = 'UPDATE'
     and new.title is not distinct from old.title
     and new.blurb is not distinct from old.blurb then
    return new;
  end if;

  words := coalesce(new.title, '') || ' ' || coalesce(new.blurb, '');
  v := private.content_verdict(words);

  if v.verdict = 'hold' then
    new.status      := 'HELD';
    new.hold_reason := 'This may break our content standards. Somebody is reading it before it goes up.';
    perform private.open_content_alert(v.severity, 'Event held for review',
      'An event matched the objectionable content list (' || v.category || ') and was held before it became public.',
      'event', new.id::text);
    return new;
  end if;

  if words ~ '\d{10}' then
    reason := 'an account number'; sev := 'high';
  elsif words ~* keyword_pattern then
    reason := 'payment language'; sev := 'medium';
  end if;

  if reason is not null then
    new.status      := 'HELD';
    new.hold_reason := 'This mentions ' || reason || '. Somebody is reading it before it goes up.';
    insert into public.risk_alerts (severity, title, description, entity_type, entity_id)
    values (sev, 'Event held for review',
      'An event contained ' || reason || ' and was held before it became public.',
      'event', new.id::text);
  elsif v.verdict = 'flag' then
    perform private.open_content_alert('medium', 'Event flagged for a look',
      'An event used a watched phrase ("' || v.matched || '"). It stayed up.',
      'event', new.id::text);
  end if;

  return new;
end;
$$;

------------------------------------------------------------------------------
-- 8. Reviews and host replies have no held state, so a hold-tier match is
-- refused with a sentence the form can show (RM004); nothing is published.
------------------------------------------------------------------------------
create or replace function private.scan_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  keyword_pattern constant text := '(payment|transfer|pay me|account number|acct|bank)';
  v  record;
  fv record;
begin
  if tg_op = 'UPDATE' then
    if new.body is not distinct from old.body then
      return new;
    end if;
  end if;

  if new.body is null then
    return new;
  end if;

  -- Only abuse is refused. A review is where people warn each other about a
  -- scam ("the agent asked for an inspection fee before viewing"), so scam
  -- wording is published and the desk is told.
  v := private.content_verdict(new.body, 'abuse');
  if v.verdict = 'hold' then
    raise exception 'Your review uses words our content standards do not allow. Please reword it and send it again.'
      using errcode = 'RM004';
  elsif v.verdict = 'flag' then
    perform private.open_content_alert('medium', 'Review flagged for a look',
      'A review used a watched phrase ("' || v.matched || '"). It was published.',
      'review', new.id::text);
  end if;
  fv := private.content_verdict(new.body, 'fraud');
  if fv.verdict <> 'clean' then
    perform private.open_content_alert('medium', 'A review mentions scam wording',
      'A review used a phrase from the scam list ("' || fv.matched || '", ' || fv.category || '). It was published; read it in context.',
      'review', new.id::text);
  end if;

  if new.body ~ '\d{10}' then
    insert into public.risk_alerts (severity, title, description, entity_type, entity_id)
    values (
      'high',
      'Account number in a review',
      'A review body carries a 10 digit run: ' || substring(new.body from '\d{10}'),
      'review',
      new.id::text
    );
  end if;

  if new.body ~* keyword_pattern then
    insert into public.risk_alerts (severity, title, description, entity_type, entity_id)
    values (
      'medium',
      'Payment language in a review',
      'A review body carries payment language: ' || substring(lower(new.body) from keyword_pattern),
      'review',
      new.id::text
    );
  end if;

  return new;
end;
$$;

create or replace function private.scan_review_response()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  keyword_pattern constant text := '(payment|transfer|pay me|account number|acct|bank)';
  v  record;
  fv record;
begin
  if tg_op = 'UPDATE' then
    if new.body is not distinct from old.body then
      return new;
    end if;
  end if;

  -- Only abuse is refused. A review is where people warn each other about a
  -- scam ("the agent asked for an inspection fee before viewing"), so scam
  -- wording is published and the desk is told.
  v := private.content_verdict(new.body, 'abuse');
  if v.verdict = 'hold' then
    raise exception 'Your reply uses words our content standards do not allow. Please reword it and send it again.'
      using errcode = 'RM004';
  elsif v.verdict = 'flag' then
    perform private.open_content_alert('medium', 'Host reply flagged for a look',
      'A host reply used a watched phrase ("' || v.matched || '"). It was published.',
      'review_response', new.review_id::text);
  end if;
  fv := private.content_verdict(new.body, 'fraud');
  if fv.verdict <> 'clean' then
    perform private.open_content_alert('medium', 'A host reply mentions scam wording',
      'A host reply used a phrase from the scam list ("' || fv.matched || '", ' || fv.category || '). It was published; read it in context.',
      'review_response', new.review_id::text);
  end if;

  if new.body ~ '\d{10}' then
    insert into public.risk_alerts (severity, title, description, entity_type, entity_id)
    values (
      'high',
      'Account number in a host reply',
      'A host reply to a review carries a 10 digit run: ' || substring(new.body from '\d{10}'),
      'review_response',
      new.review_id::text
    );
  end if;

  if new.body ~* keyword_pattern then
    insert into public.risk_alerts (severity, title, description, entity_type, entity_id)
    values (
      'medium',
      'Payment language in a host reply',
      'A host reply to a review carries payment language: ' || substring(lower(new.body) from keyword_pattern),
      'review_response',
      new.review_id::text
    );
  end if;

  return new;
end;
$$;

------------------------------------------------------------------------------
-- 9. Direct messages: a private thread with report and block, so a match is
-- flagged for the desk (a risk alert on the message), never silently dropped.
------------------------------------------------------------------------------
create or replace function private.scan_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  keyword_pattern constant text := '(payment|transfer|pay me|account number|acct|bank)';
  digits          text;
  v               record;
begin
  digits := substring(new.body from '\d{10}');
  if digits is not null then
    insert into public.message_flags (message_id, reason, matched)
    values (new.id, 'account_number', repeat('•', 6) || right(digits, 4));
  end if;
  if new.body ~* keyword_pattern then
    insert into public.message_flags (message_id, reason, matched)
    values (new.id, 'payment_keyword', substring(lower(new.body) from keyword_pattern));
  end if;

  v := private.content_verdict(new.body);
  if v.verdict <> 'clean' then
    perform private.open_content_alert(v.severity,
      case when v.verdict = 'hold' then 'Abuse in a message' else 'Watched phrase in a message' end,
      'A direct message matched the objectionable content list (' || v.category || '). Read the conversation.',
      'message', new.id::text);
  end if;
  return new;
end;
$$;

------------------------------------------------------------------------------
-- 10. Names. A member cannot save a name or nickname on the hold tier
-- (RM004). A name written by anything else (sign-up metadata through the auth
-- trigger, the service role) is never refused, so sign-up cannot break; the
-- public name becomes "Member" and an alert opens instead. Flag-tier words
-- ("Coon", "Sambo") are surnames here and are left alone.
------------------------------------------------------------------------------
create or replace function private.scan_profile_names()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v record;
begin
  if tg_op = 'UPDATE'
     and new.display_name is not distinct from old.display_name
     and new.first_name is not distinct from old.first_name
     and new.surname is not distinct from old.surname
     and new.nickname is not distinct from old.nickname then
    return new;
  end if;

  v := private.content_verdict(
    concat_ws(' ', new.display_name, new.first_name, new.surname, new.nickname), 'abuse');

  if v.verdict = 'hold' then
    if private.content_writer_is_member() then
      raise exception 'That name uses words our content standards do not allow. Please use another one.'
        using errcode = 'RM004';
    end if;
    -- The public name (display_name wins everywhere a name is shown) becomes
    -- a neutral word until somebody reads it; the alert carries the reason.
    new.display_name := 'Member';
    perform private.open_content_alert('high', 'Offensive display name',
      'A profile name matched the objectionable content list (' || v.category || '). The public name was set to "Member".',
      'profile', new.id::text);
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_zz_scan_names on public.profiles;
create trigger profiles_zz_scan_names
  before insert or update of display_name, first_name, surname, nickname on public.profiles
  for each row execute function private.scan_profile_names();

------------------------------------------------------------------------------
-- 11. Listings, businesses, stays and room types (SEC-05, SEC-06).
--
-- Trigger arguments name the text columns. When a MEMBER writes wording on
-- the abuse list, or a tenant preference by ethnicity, religion, marital
-- status or gender, the row is HELD FOR REVIEW, never refused:
--   * the reason goes into review_notes, which the lister's workspace shows;
--   * a row that is not live keeps its status (a DRAFT is not pushed into the
--     queue); the desk gets one alert once it is submitted;
--   * a live row (PUBLISHED or APPROVED) goes back to SUBMITTED. The owner
--     write guard already stops a member publishing or editing a live
--     listing, so this is defence in depth for the tables it does not cover.
-- Scam wording ("inspection fee before viewing") is not held here: every
-- listing is read by a person before it is published, and "no caution fee
-- before inspection" is honest copy. It opens an alert instead.
-- Admins and server-side writers are the reviewers and are never held; when
-- one of them publishes a held row, the scanner's own note is cleared.
------------------------------------------------------------------------------
create or replace function private.scan_catalogue_text()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  note_prefix constant text := 'Held for review: ';
  cur      jsonb := to_jsonb(new);
  prev     jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;
  col      text;
  words    text := '';
  changed  boolean := tg_op = 'INSERT';
  v        record;
  fv       record;
  phrase   text;
  reason   text;
  patch    jsonb := '{}'::jsonb;
  live     boolean;
  entity   text := case tg_table_name
                     when 'listings' then 'listing'
                     when 'businesses' then 'business'
                     when 'accommodations' then 'accommodation'
                     else 'room_type' end;
begin
  foreach col in array tg_argv loop
    words := words || ' ' || coalesce(cur ->> col, '');
    if tg_op = 'UPDATE' and (cur ->> col) is distinct from (prev ->> col) then
      changed := true;
    end if;
  end loop;

  if not changed and (prev ->> 'status') is not distinct from (cur ->> 'status') then
    return new;
  end if;

  live := (cur ->> 'status') in ('PUBLISHED', 'APPROVED');

  if not private.content_writer_is_member() then
    -- A reviewer published it: the hold is over, so its note goes.
    if live and (prev ->> 'status') is distinct from (cur ->> 'status')
       and (cur ->> 'review_notes') like note_prefix || '%'
       and (cur ->> 'review_notes') is not distinct from (prev ->> 'review_notes') then
      new := jsonb_populate_record(new, jsonb_build_object('review_notes', null));
    end if;
    return new;
  end if;

  v := private.content_verdict(words, 'abuse');
  if v.verdict = 'hold' then
    reason := note_prefix || 'some of the wording breaks our content standards. '
      || 'Please reword it. Somebody reads it before it goes up.';
  else
    phrase := private.discriminatory_phrase(words);
    if phrase is not null then
      reason := note_prefix || 'this appears to state a tenant preference ("' || phrase || '"). '
        || 'Vallo does not allow refusing people for their ethnicity, religion, marital status or gender. '
        || 'Please reword it. Somebody reads it before it goes up. See vallospaces.com/standards.';
    end if;
  end if;

  if reason is not null then
    if cur ? 'review_notes' then
      patch := patch || jsonb_build_object('review_notes', reason);
    end if;
    if live then
      patch := patch || jsonb_build_object('status', 'SUBMITTED');
      if cur ? 'submitted_at' then
        patch := patch || jsonb_build_object('submitted_at', now());
      end if;
    end if;
    if live or (cur ->> 'status') is distinct from 'DRAFT' then
      perform private.open_content_alert(
        case when v.verdict = 'hold' then v.severity else 'medium'::public.alert_severity end,
        case when v.verdict = 'hold' then 'Offensive wording held for review'
             else 'Tenant preference held for review' end,
        'A ' || replace(entity, '_', ' ') || ' was held for review: '
          || coalesce(v.category, 'tenant preference "' || phrase || '"') || '.',
        entity, new.id::text);
    end if;
    new := jsonb_populate_record(new, patch);
  else
    if changed and cur ? 'review_notes' and (cur ->> 'review_notes') like note_prefix || '%' then
      new := jsonb_populate_record(new, jsonb_build_object('review_notes', null));
    end if;
    if v.verdict = 'flag' and changed then
      perform private.open_content_alert('medium', 'Watched phrase in a ' || replace(entity, '_', ' '),
        'A ' || replace(entity, '_', ' ') || ' used a watched phrase ("' || v.matched || '"). It was not held.',
        entity, new.id::text);
    end if;
  end if;

  if changed then
    fv := private.content_verdict(words, 'fraud');
    if fv.verdict <> 'clean' then
      perform private.open_content_alert('medium', 'Scam wording in a ' || replace(entity, '_', ' '),
        'A ' || replace(entity, '_', ' ') || ' used a phrase from the scam list ("' || fv.matched || '"). Read it before it is published.',
        entity, new.id::text);
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.scan_catalogue_text() from public, anon, authenticated;
revoke all on function private.scan_profile_names() from public, anon, authenticated;

drop trigger if exists listings_zz_content_scan on public.listings;
create trigger listings_zz_content_scan
  before insert or update of title, description, status on public.listings
  for each row execute function private.scan_catalogue_text('title', 'description');

drop trigger if exists businesses_zz_content_scan on public.businesses;
create trigger businesses_zz_content_scan
  before insert or update of name, description, status on public.businesses
  for each row execute function private.scan_catalogue_text('name', 'description');

drop trigger if exists accommodations_zz_content_scan on public.accommodations;
create trigger accommodations_zz_content_scan
  before insert or update of name, description, house_rules, status on public.accommodations
  for each row execute function private.scan_catalogue_text('name', 'description', 'house_rules');

drop trigger if exists room_types_zz_content_scan on public.room_types;
create trigger room_types_zz_content_scan
  before insert or update of name, description, status on public.room_types
  for each row execute function private.scan_catalogue_text('name', 'description');