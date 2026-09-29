-- MONEY 11a / V-89 (part 1 of 2): A REPORT CAN BE WITHDRAWN BY ITS REPORTER.
--
-- From the unapplied 20260924160400_v89 (moved to superseded/). Only the
-- parts Track K did not already build: the claim machinery (queue_claims,
-- queue_take, queue_release, queue_assign, queue_operators, is_operator) is
-- live from `20260925163931_track_k2_the_queue_can_be_claimed_and_assigned`
-- and is NOT touched here.
--
-- ALTER TYPE ... ADD VALUE cannot be used in the transaction that adds it,
-- so everything that names 'withdrawn' is in part 2.
alter type public.report_status add value if not exists 'withdrawn';

do $$
begin
  if not exists (select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
                  where t.typname = 'report_status' and e.enumlabel = 'withdrawn') then
    raise exception 'read-back: report_status has no withdrawn value';
  end if;
end $$;
