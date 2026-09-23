/*
 * DOES THE IDENTITY RECORDER ACTUALLY RUN.
 *
 * Run this through `apply_migration`, never through `execute_sql`: the MCP
 * read-only role cannot write, and this probe must write the way the product
 * writes. It ends in a deliberate `raise exception` so the whole transaction
 * rolls back and nothing is left behind in auth.users.
 *
 * Last run 2026-09-23:
 *   PROBE ALL PASS account_identities: wrote=testperson@gmail.com rule=gmail
 *   shared=2 no_email_rows=0 (all rolled back)
 */
do $$
declare
  u1 uuid := gen_random_uuid();
  u2 uuid := gen_random_uuid();
  u3 uuid := gen_random_uuid();
  got_canonical text;
  got_rule text;
  shares integer;
  skipped integer;
begin
  insert into auth.users (id, email, aud, role)
  values (u1, 'Test.Person+one@GoogleMail.com', 'authenticated', 'authenticated');

  select email_canonical, canonical_rule into got_canonical, got_rule
    from public.account_identities where user_id = u1;

  if got_canonical is null then
    raise exception 'PROBE FAIL: the trigger did not write a row at all';
  end if;
  if got_canonical <> 'testperson@gmail.com' then
    raise exception 'PROBE FAIL: canonical is %, expected testperson@gmail.com', got_canonical;
  end if;
  if got_rule <> 'gmail' then
    raise exception 'PROBE FAIL: rule is %', got_rule;
  end if;

  insert into auth.users (id, email, aud, role)
  values (u2, 't.e.s.t.p.e.r.s.o.n@gmail.com', 'authenticated', 'authenticated');

  select count(*) into shares from public.account_identities
   where email_canonical = 'testperson@gmail.com';
  if shares <> 2 then
    raise exception 'PROBE FAIL: two accounts on one mailbox counted as %', shares;
  end if;

  insert into auth.users (id, email, aud, role, phone)
  values (u3, null, 'authenticated', 'authenticated', '+2348000000000');
  select count(*) into skipped from public.account_identities where user_id = u3;
  if skipped <> 0 then
    raise exception 'PROBE FAIL: an account with no address was recorded';
  end if;

  raise exception 'PROBE ALL PASS account_identities: wrote=% rule=% shared=% no_email_rows=% (all rolled back)',
    got_canonical, got_rule, shares, skipped;
end $$;
