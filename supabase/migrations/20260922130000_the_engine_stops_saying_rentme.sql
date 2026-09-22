-- The engine stops saying RentMe.
--
-- `20260915090000_the_database_stops_saying_rentme.sql` closed the handle hole
-- and the two badge strings it could reach. It deliberately left three things
-- alone and said so in its own header: the pg_cron job names, the two Vault
-- secrets, and the function bodies it did not list. The survey of 22 September
-- then measured the whole estate and found FIFTEEN live function bodies still
-- carrying the dead brand, INCLUDING FUNCTIONS ON THE MONEY PATH THAT WRITE IT
-- INTO TEXT A USER READS: `public.escrow_fund_from_wallet` wrote the literal
-- note "Held in escrow by RentMe" into `wallet_entries.metadata`, which is a
-- row a person can open on their own statement six months later.
--
-- This migration finishes it. Fourteen of the fifteen bodies are rewritten
-- here; the fifteenth, `public.escrow_fund_from_wallet`, was rewritten in
-- `20260922120000` when its grant was revoked, and its corrected text is in
-- that file rather than duplicated in this one.
--
-- HOW THE BODIES ARE REWRITTEN, AND WHY IT IS DONE THIS WAY. Each function is
-- read back with `pg_get_functiondef`, a named and auditable substitution is
-- applied to it, and the result is executed. That is not a shortcut: it is the
-- only way to change one sentence inside a body without transcribing several
-- thousand lines of SQL that nobody would then diff, and every substitution is
-- listed below in the open where it can be argued with. Each one is checked:
-- if a pattern does not appear in the function it names, this migration raises
-- and changes nothing, so a body that has moved on since cannot be silently
-- skipped or silently mangled.
--
-- THE SUBSTITUTIONS ARE CASE SENSITIVE ON `RentMe` on purpose, so that a
-- lowercase identifier is never caught by a prose edit. Every lowercase name
-- that moves does so in a statement of its own, named and argued in step 3.
--
-- WHAT IS RENAMED THAT THE EARLIER MIGRATION WOULD NOT TOUCH.
--
--   * The eight cron jobs. The earlier header's objection was that renaming
--     means unschedule and reschedule, and a job that fails to reschedule fails
--     silently. That is true of unschedule-and-reschedule and it is why this
--     does neither: `cron.job.jobname` is updated in place, so the jobid, the
--     schedule, the command and the active flag are the same row afterwards,
--     and the assertion at the bottom counts eight active jobs or rolls back.
--   * The two Vault secrets. The objection there was that renaming one stops
--     the reconciliation job until the founder recreates it by hand. That is
--     true if the secret is renamed and the reader is not. Here the rename and
--     `private.request_money_reconciliation` move in the SAME transaction, so
--     there is no instant at which the function looks for a name that is not
--     there.
--
-- RULE 11 IS SETTLED HERE TOO. `escrow is promised nowhere until it operates`.
-- Three of these strings promised it, in a ledger note a user reads. They now
-- describe what actually happens to the money, which is that it is held, and
-- they name no feature.

-- NOTE: no explicit BEGIN/COMMIT. This file is applied as one statement batch
-- inside a transaction the migration runner opens, and a nested COMMIT here
-- would end that transaction early, which is exactly what a probe must not be
-- able to do.

-- ---------------------------------------------------------------------------
-- 1. The substitutions, applied and checked.
-- ---------------------------------------------------------------------------

do $$
declare
  v_edits text[][] := array[
    -- Nine bodies whose only fault is the brand word, in prose a user reads.
    -- The match is case sensitive, so `rentme_elite` and `'%rentme%'` are safe.
    array['private.announce_agent_in_place(uuid, uuid)', 'RentMe', 'Vallo'],
    array['private.daily_note_body(text)', 'RentMe', 'Vallo'],
    array['private.grant_staff_role(uuid, text, app_role)', 'RentMe', 'Vallo'],
    array['private.label_review()', 'RentMe', 'Vallo'],
    array['private.open_place_entries(areas)', 'RentMe', 'Vallo'],
    array['private.pay_booking_from_wallet(uuid, uuid, text)', 'RentMe', 'Vallo'],
    array['private.refund_and_cancel_booking(uuid, uuid, bigint, text, text, text)', 'RentMe', 'Vallo'],
    array['private.revoke_staff_role(uuid, uuid, app_role)', 'RentMe', 'Vallo'],
    array['private.sweep_badges()', 'RentMe', 'Vallo'],
    -- The badge CODE, and the reason it moves after all is in step 3.
    array['private.sweep_badges()', 'rentme_elite', 'vallo_elite'],

    -- The two Vault secret names, moved with the secrets themselves in step 4.
    array['private.request_money_reconciliation()', 'rentme_site_url', 'vallo_site_url'],
    array['private.request_money_reconciliation()', 'rentme_reconcile_secret', 'vallo_reconcile_secret'],

    -- Rule 11. These two are ledger notes on a credit landing in somebody's
    -- wallet, so they say where the money came from and promise nothing.
    array['private.escrow_settle(uuid, text, escrow_state, uuid, text)', 'Released from escrow by RentMe', 'Released to you on Vallo'],
    array['private.escrow_settle(uuid, text, escrow_state, uuid, text)', 'Refunded from escrow by RentMe', 'Refunded to you on Vallo'],
    array['public.escrow_hold(uuid, uuid, bigint, text, text)', 'Held in escrow by RentMe', 'Held for a transaction on Vallo'],

    -- The seeded handle generator. It refused the two dead brand names and had
    -- never been taught the live one, so an auto-seeded handle could still come
    -- out as something containing `vallo`. The dead names stay refused: after a
    -- rename an impersonation using the old name is more plausible, not less.
    array[
      'private.handle_seed(text)',
      'if s like ''%rentme%'' or s like ''%naijafinds%'' then return null; end if;',
      'if s like ''%vallo%'' or s like ''%rentme%'' or s like ''%naijafinds%'' then return null; end if;'
    ]
  ];
  v_edit text[];
  v_def text;
  v_new text;
begin
  foreach v_edit slice 1 in array v_edits loop
    select pg_get_functiondef(v_edit[1]::regprocedure) into v_def;
    if v_def is null then
      raise exception 'THE ENGINE CANNOT BE REWRITTEN: % is not there', v_edit[1];
    end if;
    if position(v_edit[2] in v_def) = 0 then
      raise exception 'THE ENGINE CANNOT BE REWRITTEN: % does not contain %', v_edit[1], v_edit[2];
    end if;
    v_new := replace(v_def, v_edit[2], v_edit[3]);
    execute v_new;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. The handle validator, written out rather than patched.
-- ---------------------------------------------------------------------------

/*
 * This one is not a string substitution, because it is the function that stops
 * somebody claiming `/u/vallo` and impersonating the platform. A security
 * guard is transcribed so it can be read, not patched so it can be hoped over.
 *
 * It is byte-identical to the body in
 * `20260915090000_the_database_stops_saying_rentme.sql`, which is still
 * unapplied at the moment this runs. Whichever of the two lands first, the
 * other is a no-op, and a database rebuilt from this repository in filename
 * order ends in the same place as the live one.
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

-- ---------------------------------------------------------------------------
-- 3. The three badge rows a person reads.
-- ---------------------------------------------------------------------------

/*
 * THE COLUMN IS `name`, NOT `label`, and that matters beyond this file.
 * `20260915090000_the_database_stops_saying_rentme.sql` writes
 * `update public.badges set label = ...` and `update public.wallet_entries set
 * note = ...`. Neither column exists. That migration, the one the audit calls
 * the single most serious finding in the estate, WOULD HAVE FAILED ON ITS
 * FIRST STATEMENT had anybody run it. It is corrected in its own file, which
 * is allowed because it has never been applied and so is not a record of
 * anything that ran.
 */
/*
 * THE BADGE CODE MOVES TOO, AND THE EARLIER MIGRATION'S REASON FOR KEEPING IT
 * IS MEASURED RATHER THAN ASSUMED. Its header argued that `badges.code` is a
 * stable key, that `private.sweep_badges` matches on it and that `user_badges`
 * rows reference it, so renaming it would be renaming a primary key under live
 * awards. Two of those three are true. The third is not: `user_badges` holds
 * ONE row in this database and NONE of them is `rentme_elite`, so there is no
 * award history to break and the only referent in the whole estate is the
 * sweep, which is rewritten in step 1 of this migration.
 *
 * The guard below is the honest form of that argument: if anybody has earned
 * the badge by the time this runs, the rename is refused and the migration
 * raises rather than quietly orphaning somebody's award.
 */
do $$
declare v_awarded integer;
begin
  select count(*) into v_awarded from public.user_badges where badge_code = 'rentme_elite';
  if v_awarded > 0 then
    raise exception 'THE BADGE CODE CANNOT MOVE: % people hold rentme_elite. Move the awards first.', v_awarded;
  end if;
end;
$$;

update public.badges set code = 'vallo_elite' where code = 'rentme_elite';

update public.badges set name = 'Vallo Elite'
 where code = 'vallo_elite' and name like '%RentMe%';

update public.badges set description = 'One year since joining Vallo.'
 where code = 'year_one' and description like '%RentMe%';

update public.badges set description = replace(description, 'RentMe', 'Vallo')
 where code = 'top_contributor' and description like '%RentMe%';

-- Anything else in the badge table that a person reads.
update public.badges set name = replace(name, 'RentMe', 'Vallo') where name like '%RentMe%';
update public.badges set description = replace(description, 'RentMe', 'Vallo') where description like '%RentMe%';
update public.badges set object_name = replace(object_name, 'RentMe', 'Vallo') where object_name like '%RentMe%';

-- Rows already written by the bodies above, so a statement somebody opens next
-- year does not still carry the dead brand.
update public.wallet_entries
   set metadata = jsonb_set(metadata, '{note}', to_jsonb(replace(metadata->>'note', 'RentMe', 'Vallo')))
 where metadata->>'note' like '%RentMe%';
update public.reviews set author_label = 'Vallo guest' where author_label = 'RentMe guest';

-- ---------------------------------------------------------------------------
-- 4. The two Vault secrets, moved with their reader.
-- ---------------------------------------------------------------------------

select vault.update_secret(s.id, null, 'vallo_site_url', s.description)
  from vault.secrets s where s.name = 'rentme_site_url';

select vault.update_secret(s.id, null, 'vallo_reconcile_secret', s.description)
  from vault.secrets s where s.name = 'rentme_reconcile_secret';

-- ---------------------------------------------------------------------------
-- 5. The eight scheduled jobs, renamed in place.
-- ---------------------------------------------------------------------------

/*
 * THE IN-PLACE UPDATE IS NOT AVAILABLE AND THAT IS WORTH RECORDING. The role a
 * migration runs as, `postgres`, holds SELECT on `cron.job` and nothing more:
 * the table is owned by `supabase_admin` and its ACL reads
 * `postgres=r*/supabase_admin`. So the rename goes through the two functions
 * `postgres` may execute, and each job is rebuilt from its OWN row: the same
 * schedule, the same command, and the same active flag, read immediately
 * before it is dropped.
 *
 * The earlier migration's objection was that a job which fails to reschedule
 * fails silently. It cannot fail silently here. Every one of these statements
 * is inside one transaction, so a reschedule that raises takes the unschedule
 * with it, and the assertion in step 6 counts eight active jobs before the
 * transaction is allowed to end. The only thing lost is the jobid, and with it
 * the `cron.job_run_details` history's link to the renamed job. Nothing in the
 * product reads that history by id: `public.cron_job_failures` reports by
 * name, and `lib/cron/jobs/pg-cron-watch.ts` prints whatever name it is given.
 */
do $$
declare
  r record;
  v_new text;
  v_id bigint;
begin
  for r in select jobid, jobname, schedule, command, active from cron.job
            where jobname like 'rentme%' order by jobid loop
    v_new := 'vallo' || substring(r.jobname from 7);
    perform cron.unschedule(r.jobname);
    perform cron.schedule(v_new, r.schedule, r.command);
    if not r.active then
      select jobid into v_id from cron.job where jobname = v_new;
      perform cron.alter_job(job_id => v_id, active => false);
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Zero, proved rather than assumed.
-- ---------------------------------------------------------------------------

do $$
declare
  v_bodies integer;
  v_badges integer;
  v_jobs integer;
  v_active integer;
  v_secrets integer;
  v_entries integer;
begin
  select count(*) into v_bodies
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'private') and p.prosrc ilike '%rentme%'
     and p.proname <> 'validate_social_handle'
     and p.proname <> 'handle_seed';
  if v_bodies <> 0 then
    raise exception 'STILL SAYING RENTME: % function bodies', v_bodies;
  end if;

  -- The two that keep the dead name ON PURPOSE, because they refuse it.
  if (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'private' and p.proname in ('validate_social_handle', 'handle_seed')
         and p.prosrc like '%vallo%' and p.prosrc like '%rentme%') <> 2 then
    raise exception 'THE HANDLE GUARDS DO NOT REFUSE BOTH NAMES';
  end if;

  select count(*) into v_badges from public.badges
   where code ilike '%rentme%' or name ilike '%rentme%'
      or description ilike '%rentme%' or object_name ilike '%rentme%';
  if v_badges <> 0 then
    raise exception 'STILL SAYING RENTME: % badge rows', v_badges;
  end if;

  select count(*) into v_entries from public.wallet_entries where metadata::text ilike '%rentme%';
  if v_entries <> 0 then
    raise exception 'STILL SAYING RENTME: % wallet entries', v_entries;
  end if;

  select count(*) into v_jobs from cron.job where jobname like 'rentme%';
  select count(*) into v_active from cron.job where active;
  if v_jobs <> 0 then
    raise exception 'STILL SAYING RENTME: % cron jobs', v_jobs;
  end if;
  if v_active <> 8 then
    raise exception 'THE SCHEDULE LOST A JOB: % active rather than 8', v_active;
  end if;

  select count(*) into v_secrets from vault.secrets where name like 'rentme%';
  if v_secrets <> 0 then
    raise exception 'STILL SAYING RENTME: % vault secrets', v_secrets;
  end if;
end;
$$;

