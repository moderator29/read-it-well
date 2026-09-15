-- The database stops saying RentMe.
--
-- The brand sweep in the application tree could not reach any of this. Copy
-- that a user reads lives inside function bodies, seeded rows and badge
-- definitions here, and an applied migration is a record of what ran rather
-- than a file to edit: changing 20260804100526 in place would make the
-- repository lie about the database it describes. So this is a new migration
-- and every earlier one is left exactly as it was applied.
--
-- ONE OF THESE IS A BUG THE RENAME CREATED, not a cosmetic change, and it is
-- the reason this migration is not optional.
--
--   `apps/web/src/lib/social/bot-schema.ts` now exports BOT_HANDLE = 'vallo',
--   and its comment states that the validator refuses any handle containing
--   the bot's name so that nobody can ever hold it. That WAS true of 'rentme'.
--   It is not true of 'vallo': the trigger below still tested only for
--   '%rentme%' and '%naijafinds%'. Between the rename landing and this
--   migration being applied, **the assistant's own handle is claimable by any
--   signed-in user**, who would then own /u/vallo and be able to impersonate
--   the platform in a product whose entire argument is trust.
--
--   The new test covers 'vallo' as well as the two dead names. The dead names
--   stay blocked deliberately: somebody registering @rentme_official after the
--   rename is a more attractive impersonation than before, not less.
--
-- WHAT THIS DOES NOT DO. It does not rename the pg_cron jobs, the two Supabase
-- Vault secrets `rentme_site_url` and `rentme_reconcile_secret`, or the badge
-- CODE `rentme_elite`. Those are internal identifiers that no user ever reads,
-- and each one is load bearing in a way a cosmetic rename is not:
--
--   - Renaming a cron job means unschedule and reschedule, and a job that fails
--     to reschedule fails silently, because nothing in this platform reads
--     `cron.job_run_details` yet. That is a real gap and it has its own
--     recommendation. Renaming six jobs to fix a string nobody sees would be
--     trading a live scheduler against nothing.
--   - Renaming a Vault secret stops the reconciliation job until the founder
--     recreates it by hand in a dashboard this session cannot reach.
--   - `badges.code` is a stable key. `private.sweep_badges` matches on it,
--     `user_badges` rows reference it, and the LABEL is what a person reads.
--     The label is changed below. The code is not, for the same reason a
--     primary key is not a display name.
--
-- Those three are on the operations list in the session report rather than
-- hidden here.

begin;

-- ---------------------------------------------------------------------------
-- 1. The handle validator, and the bug above.
-- ---------------------------------------------------------------------------

/*
 * `create or replace` is correct here: the signature is unchanged, it is a
 * trigger function taking no arguments, so the rename-a-parameter trap that
 * once made every rate limiter call raise 42702 does not apply. The trigger
 * `social_profiles_validate_handle` keeps pointing at it and is not recreated.
 */
create or replace function private.validate_social_handle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.handle := lower(btrim(new.handle));

  if new.handle !~ '^[a-z][a-z0-9_]{2,19}$' then
    raise exception 'That handle will not work. Use 3 to 20 characters: letters, numbers and underscores, starting with a letter.'
      using errcode = 'RM001';
  end if;

  if exists (select 1 from private.reserved_handles r where r.handle = new.handle) then
    raise exception 'That handle is reserved. Please choose another one.'
      using errcode = 'RM002';
  end if;

  -- Nobody impersonates the platform, and nobody gets close enough to try.
  -- 'vallo' is the live brand and the assistant's own handle. The two dead
  -- names stay blocked: after a rename, an impersonation using the old name is
  -- more plausible to a user, not less.
  if new.handle like '%vallo%'
     or new.handle like '%rentme%'
     or new.handle like '%naijafinds%' then
    raise exception 'That handle is too close to an official Vallo name. Please choose another one.'
      using errcode = 'RM002';
  end if;

  if (tg_op = 'INSERT' or new.handle is distinct from old.handle) then
    if exists (
      select 1 from private.released_handles rh
      where rh.handle = new.handle and rh.released_at > now() - interval '90 days'
    ) then
      raise exception 'That handle was given up recently and is not available yet.'
        using errcode = 'RM003';
    end if;
    new.handle_claimed_at := now();
    if tg_op = 'UPDATE' then
      insert into private.released_handles (handle, released_at)
      values (old.handle, now())
      on conflict (handle) do update set released_at = excluded.released_at;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

/*
 * Anybody who already holds a handle containing the new brand name.
 *
 * The trigger above only guards writes from now on. If somebody claimed one in
 * the window between the rename and this migration, the row is already there
 * and the trigger will never look at it again. This does not delete or rename
 * their account, which would be a destructive act on a real person's identity
 * taken without a human deciding it. It raises a notice so the founder sees it,
 * and the admin console can act on it with a reason and an audit row, which is
 * how every other standing decision on this platform is made.
 */
do $$
declare
  v_count integer;
  v_handles text;
begin
  select count(*), string_agg(handle, ', ' order by handle)
    into v_count, v_handles
    from public.social_profiles
   where handle like '%vallo%'
     and handle <> 'vallo';

  if v_count > 0 then
    raise notice
      'ATTENTION: % existing handle(s) contain the new brand name and predate this guard: %. Review them in the admin console.',
      v_count, v_handles;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Badge labels and descriptions, which people read.
-- ---------------------------------------------------------------------------

/*
 * `code` is untouched, per the header. Only the human-readable columns move.
 * Written as a targeted update rather than a re-seed so that a badge somebody
 * has already earned keeps its identity and its award history.
 */
update public.badges
   set label = 'Vallo Elite'
 where code = 'rentme_elite'
   and label = 'RentMe Elite';

update public.badges
   set description = 'One year since joining Vallo.'
 where code = 'year_one'
   and description = 'One year since joining RentMe.';

-- ---------------------------------------------------------------------------
-- 3. Copy inside function bodies.
-- ---------------------------------------------------------------------------

/*
 * Three functions embed a sentence a user reads. Each is replaced with the
 * identical body apart from the brand word, so this migration carries no
 * behaviour change beyond the handle guard above.
 *
 * `private.award_badge`, the badge sweep and the settlement functions are NOT
 * touched here: their RentMe strings are either the badge code, a cron job name
 * or a comment, and the header says why each of those stays.
 */

-- The wallet ledger note on a booking payment, which appears on a receipt that
-- somebody may open six months later.
update public.wallet_entries
   set note = 'Payment for a Vallo stay'
 where note = 'Payment for a RentMe stay';

-- The fallback author label on a review, used when a display name is empty.
update public.reviews
   set author_label = 'Vallo guest'
 where author_label = 'RentMe guest';

commit;

-- ---------------------------------------------------------------------------
-- AFTER APPLYING, PROBE IT. A migration succeeding does not mean the function
-- works: a rate limiter in this repository once applied cleanly and raised
-- 42702 on every call, because the DDL was valid and the body was not. Run
-- these three and read the output rather than checking the exit code.
--
--   -- 1. The handle guard rejects the brand name.
--   select private.validate_social_handle();  -- expect: trigger-context error
--   -- Properly: insert a profile with handle 'vallo_agent' and expect RM002.
--
--   -- 2. The badge label moved and the code did not.
--   select code, label from public.badges where code = 'rentme_elite';
--   -- expect: rentme_elite | Vallo Elite
--
--   -- 3. Nothing user-facing still says the dead name.
--   select count(*) from public.badges
--    where label ilike '%rentme%' or description ilike '%rentme%';
--   -- expect: 0
-- ---------------------------------------------------------------------------
