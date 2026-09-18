-- B4, second file: what the nightly sweeps read. Two read-only functions.
--
-- WHAT THIS DOES.
--
--   1. private.inventory_drift(p_limit): the honest count against the sold
--      count, on both spines, for tonight and every night ahead.
--
--      Room spine (M4/M5): every room_inventory night compares units_booked
--      against the rooms held by live (PENDING or CONFIRMED) bookings on that
--      room type covering that night. bookings.room_type_id and
--      bookings.rooms arrive with M6, which is founder-gated and NOT applied,
--      so that comparison is written as dynamic SQL behind an
--      information_schema check: until M6 lands no booking can hold a room,
--      which means any units_booked above zero IS drift and is reported as
--      such with a live count of zero. The function never references the M6
--      columns statically, so it creates and runs today and grows the
--      moment M6 lands, with no edit.
--
--      Listing spine (whole-place stays on availability): a night marked
--      'booked' with no live booking covering it is an orphan hold (the
--      thing the hold sweep exists to prevent, so finding one means a
--      writer forgot the release); a live booking night with no 'booked'
--      row is a missed calendar write. Only tonight and onwards: past nights
--      of a completed stay legitimately stay 'booked'. Only bookings with a
--      listing_id: after M6 a room booking has none and lives on the other
--      spine.
--
--      This function CORRECTS NOTHING. It returns ids and dates so the
--      inventory-drift cron job can raise a risk_alerts row for the admin
--      alerts desk (MK-65, TWO_MODE_BACKEND_RESEARCH 7.5). Silent correction
--      would hide the writer that is wrong.
--
--   2. private.cron_job_failures(p_since, p_limit): the failed rows of
--      cron.job_run_details in the window, joined to the job name, so the
--      pg-cron-watch job can alert on a database job that failed (A2-121,
--      MK-66). Behind to_regclass, so a database without pg_cron's run
--      table answers "not available" instead of erroring. return_message is
--      an SQL error text, never a customer field, and is cut to 300
--      characters.
--
-- Both are STABLE (they only read) and reachable through service-role-only
-- public doors on the M5 model. No table is created or altered, nothing is
-- dropped, every statement replays cleanly.
--
-- HOW IT WAS PROBED. scripts/probes/b4_lifecycle.sh lifts the text between
-- the ">>> b4_drift" and "<<< b4_drift" markers into the same scratch
-- database as the lifecycle functions, seeds an orphan night, a missing
-- night and a room night sold with no booking, and asserts each is reported
-- and nothing is changed. cron_job_failures is probed there with the cron
-- schema absent (answers available=false) and needs the lead's live probe
-- for the present case (SQL in scripts/probes/b4_lifecycle_live.sql).

-- >>> b4_drift (the exact text scripts/probes/b4_lifecycle.sh loads)

create or replace function private.inventory_drift(
  p_limit integer default 200
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  today         date := (now() at time zone 'Africa/Lagos')::date;
  room_spine    boolean;
  room_nights   jsonb := '[]'::jsonb;
  orphan_nights jsonb := '[]'::jsonb;
  missing_nights jsonb := '[]'::jsonb;
begin
  if p_limit is null or p_limit < 1 or p_limit > 2000 then
    raise exception 'A drift report carries between 1 and 2000 rows per kind.' using errcode = '22023';
  end if;

  -- M6 adds bookings.room_type_id and bookings.rooms. Until it lands there is
  -- no booking that can hold a room, so a sold count above zero has nothing
  -- behind it.
  select exists (
    select 1
      from information_schema.columns c
     where c.table_schema = 'public'
       and c.table_name   = 'bookings'
       and c.column_name  = 'room_type_id'
  ) into room_spine;

  if room_spine then
    execute $q$
      select coalesce(jsonb_agg(jsonb_build_object(
               'kind',         'room_night',
               'room_type_id', d.room_type_id,
               'date',         d.date,
               'units_booked', d.units_booked,
               'live_rooms',   d.live_rooms
             ) order by d.date, d.room_type_id), '[]'::jsonb)
        from (
          select x.room_type_id, x.date, x.units_booked, x.live_rooms
            from (
              select ri.room_type_id, ri.date, ri.units_booked,
                     coalesce((
                       select sum(b.rooms)
                         from public.bookings b
                        where b.room_type_id = ri.room_type_id
                          and b.status in ('PENDING', 'CONFIRMED')
                          and b.check_in <= ri.date
                          and b.check_out > ri.date
                     ), 0)::integer as live_rooms
                from public.room_inventory ri
               where ri.date >= $1
            ) x
           where x.units_booked <> x.live_rooms
           order by x.date, x.room_type_id
           limit $2
        ) d
    $q$
    into room_nights
    using today, p_limit;
  else
    select coalesce(jsonb_agg(jsonb_build_object(
             'kind',         'room_night',
             'room_type_id', d.room_type_id,
             'date',         d.date,
             'units_booked', d.units_booked,
             'live_rooms',   0
           ) order by d.date, d.room_type_id), '[]'::jsonb)
      into room_nights
      from (
        select ri.room_type_id, ri.date, ri.units_booked
          from public.room_inventory ri
         where ri.date >= today
           and ri.units_booked <> 0
         order by ri.date, ri.room_type_id
         limit p_limit
      ) d;
  end if;

  -- A night this platform marked booked that no live booking covers.
  select coalesce(jsonb_agg(jsonb_build_object(
           'kind',       'orphan_night',
           'listing_id', d.listing_id,
           'date',       d.date
         ) order by d.date, d.listing_id), '[]'::jsonb)
    into orphan_nights
    from (
      select av.listing_id, av.date
        from public.availability av
       where av.status = 'booked'
         and av.date >= today
         and not exists (
           select 1
             from public.bookings b
            where b.listing_id = av.listing_id
              and b.status in ('PENDING', 'CONFIRMED')
              and b.check_in <= av.date
              and b.check_out > av.date
         )
       order by av.date, av.listing_id
       limit p_limit
    ) d;

  -- A live booking night the calendar does not show as booked.
  select coalesce(jsonb_agg(jsonb_build_object(
           'kind',       'missing_night',
           'booking_id', d.booking_id,
           'listing_id', d.listing_id,
           'date',       d.date
         ) order by d.date, d.listing_id), '[]'::jsonb)
    into missing_nights
    from (
      select b.id as booking_id, b.listing_id, n.night::date as date
        from public.bookings b
        cross join lateral generate_series(
          greatest(b.check_in, today)::timestamp,
          (b.check_out - 1)::timestamp,
          interval '1 day'
        ) as n(night)
       where b.status in ('PENDING', 'CONFIRMED')
         and b.listing_id is not null
         and b.check_out > today
         and not exists (
           select 1
             from public.availability av
            where av.listing_id = b.listing_id
              and av.date = n.night::date
              and av.status = 'booked'
         )
       order by n.night, b.listing_id
       limit p_limit
    ) d;

  return jsonb_build_object(
    'today',          today,
    'room_spine',     room_spine,
    'room_nights',    room_nights,
    'orphan_nights',  orphan_nights,
    'missing_nights', missing_nights
  );
end;
$$;

comment on function private.inventory_drift(integer) is
  'Read-only. Reports, never corrects: room_inventory nights whose units_booked disagrees with live bookings (once M6 gives bookings a room_type_id; before that any sold unit is drift), availability nights marked booked with no live booking, and live booking nights the calendar does not show. Tonight and onwards, Lagos. Returns jsonb {today, room_spine, room_nights, orphan_nights, missing_nights}.';

create or replace function private.cron_job_failures(
  p_since interval default interval '25 hours',
  p_limit integer  default 100
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  failures jsonb := '[]'::jsonb;
begin
  if p_since is null or p_since < interval '1 minute' then
    raise exception 'A failure window is at least one minute.' using errcode = '22023';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 1000 then
    raise exception 'A failure report carries between 1 and 1000 rows.' using errcode = '22023';
  end if;

  if to_regclass('cron.job_run_details') is null then
    return jsonb_build_object('available', false, 'failures', '[]'::jsonb);
  end if;

  execute $q$
    select coalesce(jsonb_agg(jsonb_build_object(
             'jobid',          d.jobid,
             'jobname',        j.jobname,
             'runid',          d.runid,
             'status',         d.status,
             'start_time',     d.start_time,
             'return_message', left(d.return_message, 300)
           ) order by d.start_time desc), '[]'::jsonb)
      from (
        select r.jobid, r.runid, r.status, r.start_time, r.return_message
          from cron.job_run_details r
         where r.status = 'failed'
           and r.start_time >= now() - $1
         order by r.start_time desc
         limit $2
      ) d
      left join cron.job j on j.jobid = d.jobid
  $q$
  into failures
  using p_since, p_limit;

  return jsonb_build_object('available', true, 'failures', failures);
end;
$$;

comment on function private.cron_job_failures(interval, integer) is
  'Read-only. The failed pg_cron runs in the last p_since, with the job name and the first 300 characters of the error, for the pg-cron-watch job. Answers available=false where cron.job_run_details does not exist.';

-- <<< b4_drift

/* ------------------------------------------------- privileges and doors */

revoke all on function private.inventory_drift(integer) from public, anon, authenticated;
revoke all on function private.cron_job_failures(interval, integer) from public, anon, authenticated;

create or replace function public.inventory_drift(
  p_limit integer default 200
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select private.inventory_drift(p_limit);
$$;

create or replace function public.cron_job_failures(
  p_since interval default interval '25 hours',
  p_limit integer  default 100
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select private.cron_job_failures(p_since, p_limit);
$$;

comment on function public.inventory_drift(integer) is
  'Pass-through to private.inventory_drift for the inventory-drift cron job. Service role only.';
comment on function public.cron_job_failures(interval, integer) is
  'Pass-through to private.cron_job_failures for the pg-cron-watch cron job. Service role only.';

revoke all on function public.inventory_drift(integer) from public, anon, authenticated;
revoke all on function public.cron_job_failures(interval, integer) from public, anon, authenticated;
grant execute on function public.inventory_drift(integer) to service_role;
grant execute on function public.cron_job_failures(interval, integer) to service_role;
