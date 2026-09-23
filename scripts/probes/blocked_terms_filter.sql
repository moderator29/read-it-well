-- DOES THE ABUSE FILTER ACTUALLY FILTER, AND DOES IT REFUSE TO EAT THE INNOCENT.
--
-- Run through `mcp__Supabase__apply_migration` on project `uccixoonmbhrnyczyigt`.
-- Both blocks end in a deliberate `raise exception`, so they roll back and write
-- nothing. `mcp__Supabase__execute_sql` cannot do the first block's job: it runs
-- as a role with `rolbypassrls` and cannot demonstrate a refusal.
--
-- Run them in this order. The first must be green before a single term is
-- inserted, because one stray metacharacter in one term breaks the pattern for
-- every post on the platform.
--
-- Recorded result, 23 September 2026, against the live estate:
--   BLOCK ONE: constraint_present_and_validated=true refused_pipe=t
--     refused_paren=t refused_dot=t refused_backslash=t accepted_plain_phrase=t
--   BLOCK TWO: terms=133 pattern_length=1757
--     FRAUD string caught, 4 of our own terms matched
--     ABUSE string caught, 2 of our own terms matched
--     CLEAN property string (Victoria Island, Nigeria, inspection, agency fee,
--       caution fee, church, mosque, niggling) NOT caught, 0 terms matched
--     CLEAN stays string (kaffir lime, Scunthorpe) NOT caught, 0 terms matched
--
-- WHAT THIS PROVES, AND WHAT IT DOES NOT.
--
-- Proves: the table is no longer empty, so objectionable_pattern() no longer
-- returns null and neither scanner skips the abuse branch; the joined pattern
-- COMPILES, which is the failure mode a metacharacter would have caused; a
-- fraud string and an abuse string are both caught by the real matcher with the
-- real `~*` operator; and two ordinary Nigerian property and hospitality
-- strings, deliberately loaded with the words most likely to trip a careless
-- list, match NOTHING at all, term by term.
--
-- Does not prove: that private.scan_post() sets status HELD end to end. That
-- would need a row in public.posts, and writing a test row to a live product
-- table is on the stop list. The abuse branch of scan_post is
-- `abuse_pattern is not null and new.body ~* abuse_pattern`, which is exactly
-- the two things block two runs, so what is untested here is the trigger
-- plumbing that was already proved when the scanner shipped, not the matching.
--
-- The two clean strings are the half that matters most. A filter that catches
-- everything is as much a defect as one that catches nothing, and "Victoria
-- Island" eaten by an address rule is the shape of that failure.

-- ---------------------------------------------------------------------------
-- BLOCK ONE. The constraint exists, is validated, and actually refuses.
-- ---------------------------------------------------------------------------

do $$
declare
  refused_pipe    boolean := false;
  refused_paren   boolean := false;
  refused_dot     boolean := false;
  refused_slash   boolean := false;
  accepted_phrase boolean := false;
  is_validated    boolean;
begin
  select convalidated into is_validated
  from pg_constraint
  where conrelid = 'public.blocked_terms'::regclass
    and conname = 'blocked_terms_no_regex_metacharacters';

  begin insert into public.blocked_terms (term, category, reason) values ('pay me|direct', 'fraud.off-platform-payment', 'Probe row, rolled back.');
  exception when check_violation then refused_pipe := true; end;

  begin insert into public.blocked_terms (term, category, reason) values ('(unbalanced', 'fraud.off-platform-payment', 'Probe row, rolled back.');
  exception when check_violation then refused_paren := true; end;

  begin insert into public.blocked_terms (term, category, reason) values ('any.thing', 'fraud.off-platform-payment', 'Probe row, rolled back.');
  exception when check_violation then refused_dot := true; end;

  begin insert into public.blocked_terms (term, category, reason) values ('back\slash', 'fraud.off-platform-payment', 'Probe row, rolled back.');
  exception when check_violation then refused_slash := true; end;

  begin
    insert into public.blocked_terms (term, category, reason) values ('a plain probe phrase', 'fraud.off-platform-payment', 'Probe row, rolled back.');
    accepted_phrase := true;
  exception when check_violation then accepted_phrase := false; end;

  raise exception 'PROBE ROLLED BACK. constraint_present_and_validated=% refused_pipe=% refused_paren=% refused_dot=% refused_backslash=% accepted_plain_phrase=%',
    coalesce(is_validated::text, 'ABSENT'), refused_pipe, refused_paren, refused_dot, refused_slash, accepted_phrase;
end
$$;

-- ---------------------------------------------------------------------------
-- BLOCK TWO. The real matcher, against what must be caught and what must not.
-- ---------------------------------------------------------------------------

do $$
declare
  pat   text := private.objectionable_pattern();
  fraud text := 'please pay into my personal account, keep this between us, and whatsapp me directly. use opay.';
  abuse text := 'i know a guy who does money ritual for quick cash, and he said i know where you live';
  clean text := 'Two bedroom flat at Victoria Island, Lagos, Nigeria. Book an inspection this weekend. The agency fee and the caution fee are both listed on the page, the church and the mosque are five minutes away, there are niggling delays with the lift, and the landlord is a bloody nightmare about noise.';
  stays text := 'Our restaurant on Awolowo Road serves kaffir lime leaves, and the hotel spa has a Scunthorpe cocktail on the menu.';
  n_fraud int; n_abuse int; n_clean int; n_stays int; total int;
begin
  if pat is null then
    raise exception 'PROBE FAILED: objectionable_pattern() is still null, the table is empty.';
  end if;

  -- Does the whole joined pattern even compile? `~*` raises on an invalid one.
  perform 'compile check' ~* pat;

  select count(*) into total from public.blocked_terms;
  select count(*) into n_fraud from public.blocked_terms where fraud ~* ('\m(' || term || ')\M');
  select count(*) into n_abuse from public.blocked_terms where abuse ~* ('\m(' || term || ')\M');
  select count(*) into n_clean from public.blocked_terms where clean ~* ('\m(' || term || ')\M');
  select count(*) into n_stays from public.blocked_terms where stays ~* ('\m(' || term || ')\M');

  raise exception E'PROBE ROLLED BACK.\n  terms=%\n  pattern_length=%\n  FRAUD: caught=% terms_matched=%\n  ABUSE: caught=% terms_matched=%\n  CLEAN property: caught=% terms_matched=%\n  CLEAN stays: caught=% terms_matched=%',
    total, length(pat),
    (fraud ~* pat), n_fraud,
    (abuse ~* pat), n_abuse,
    (clean ~* pat), n_clean,
    (stays ~* pat), n_stays;
end
$$;
