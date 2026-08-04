-- pg_cron is installed, so the seven badges that needed a scheduler can be earned.
--
-- Seven of the fourteen were unreachable because they are not events. Nobody
-- fires a trigger when a year passes, or when a median moves, or when a guest
-- finishes a stay, because `booking_status` is PENDING, CONFIRMED, CANCELLED
-- and has no COMPLETED: a stay ends when a date goes by, and a date going by is
-- not a write. They were named in KNOWN_GAPS rather than faked with a trigger
-- firing at the wrong moment. This is the sweep they were waiting for.
--
-- One function, run nightly, idempotent by construction because
-- `private.award_badge` is `on conflict do nothing`. It can be run by hand at
-- any time and will award exactly what is owed and nothing else.
--
-- Two of the seven get a definition in numbers for the first time, and both are
-- written down here rather than left in a query for somebody to reverse:
--
--   local_guide  "Known for knowing one place well" had no number at all.
--                Twenty live posts inside a single place. Twenty is somebody
--                who keeps showing up, not one good afternoon.
--
--   photo_pro    "Ten listings through the quality gate with no rejections"
--                needs a rejection HISTORY, and `listings.status` holds only
--                the present. Ten published and none currently rejected is the
--                honest reading of the data that exists. A host who was
--                rejected once and fixed it earns this, which is the generous
--                error and the right one: the badge is about the work, not
--                about a clean record we cannot actually see.
--
-- The body of `private.sweep_badges()` lives in the next migration, which fixed
-- `min(uuid)` on its first real call. Creating a function proves nothing; the
-- DDL applied green here and 42883 came out the moment it ran.

create extension if not exists pg_cron;

/* 02:20 UTC is 03:20 in Lagos: the quietest hour, and well clear of midnight
   when the view salt rotates. */
select cron.unschedule('rentme-nightly-badges')
 where exists (select 1 from cron.job where jobname = 'rentme-nightly-badges');

select cron.schedule('rentme-nightly-badges', '20 2 * * *', 'select private.sweep_badges()');
