-- DRAFT, not applied. Batch 1, RESTAURANT-01 (defect D-02).
-- Built from the live private.reservation_is_valid read on 13 October 2026.
-- The only change: one transaction-scoped advisory lock per restaurant and
-- Lagos day, taken before the covers are counted. Without it, two guests
-- asking for the last covers at the same instant both read the same sum
-- (READ COMMITTED) and both rows are written, so the window is oversold.
-- With it, the second insert waits for the first to commit, then counts
-- again and is refused if the room is gone.
set lock_timeout = '5s';

create or replace function private.reservation_is_valid()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $fn$
declare
  kind      public.property_type;
  state     public.listing_status;
  b_kind    public.business_kind;
  b_state   public.listing_status;
  b_source  public.source_kind;
  b_demo    boolean;
  local_at  timestamp;
  win       record;
  taken     integer;
begin
  if new.listing_id is not null then
    select property_type, status into kind, state
    from public.listings where id = new.listing_id;

    if kind is null then
      raise exception 'reservation refers to a listing that does not exist';
    end if;

    if kind <> 'restaurant' then
      raise exception 'only a restaurant takes reservations, not a %', kind;
    end if;

    if state <> 'PUBLISHED' then
      raise exception 'that restaurant is not published';
    end if;
  else
    select b.kind, b.status, b.source, b.is_demo into b_kind, b_state, b_source, b_demo
    from public.businesses b where b.id = new.business_id;

    if b_kind is null then
      raise exception 'reservation refers to a business that does not exist';
    end if;

    if b_kind <> 'restaurant' then
      raise exception 'only a restaurant takes reservations, not a %', b_kind;
    end if;

    if b_state <> 'PUBLISHED' then
      raise exception 'that restaurant is not published';
    end if;

    -- The first-party-only law, carried into the business era: a table at a
    -- partner venue is never held here.
    if b_source <> 'first_party' then
      raise exception 'only a first-party restaurant takes reservations here';
    end if;

    if b_demo then
      raise exception 'This restaurant is an example of what the catalogue will hold. No such venue is open, so no table can be held.'
        using errcode = 'check_violation';
    end if;

    -- Capacity against the service window, whenever the moment, the party or
    -- the standing of this reservation is being set. Cancelling never needs
    -- room. Lagos wall clock throughout, because that is where the kitchen is.
    if new.status in ('PENDING', 'CONFIRMED')
       and (tg_op = 'INSERT'
            or new.reserved_for is distinct from old.reserved_for
            or new.party_size is distinct from old.party_size
            or old.status not in ('PENDING', 'CONFIRMED')) then
      local_at := new.reserved_for at time zone 'Africa/Lagos';

      -- RESTAURANT-01: one writer at a time per restaurant and Lagos day, so
      -- the count below cannot be read stale by a rival insert.
      perform pg_advisory_xact_lock(
        hashtextextended('reservation_covers:' || new.business_id::text || ':' || (local_at::date)::text, 0)
      );

      select sw.opens, sw.closes, sw.covers into win
      from public.service_windows sw
      where sw.business_id = new.business_id
        and sw.weekday = extract(dow from local_at)::smallint
        and sw.opens <= local_at::time
        and local_at::time <= sw.last_seating
      order by sw.opens desc
      limit 1;

      if win.covers is null then
        raise exception 'that restaurant does not seat guests at that time';
      end if;

      select coalesce(sum(r.party_size), 0) into taken
      from public.reservations r
      where r.business_id = new.business_id
        and r.id <> new.id
        and r.status in ('PENDING', 'CONFIRMED')
        and (r.reserved_for at time zone 'Africa/Lagos')::date = local_at::date
        and (r.reserved_for at time zone 'Africa/Lagos')::time >= win.opens
        and (r.reserved_for at time zone 'Africa/Lagos')::time <= win.closes;

      if taken + new.party_size > win.covers then
        raise exception 'that restaurant has no room for % more at that time', new.party_size;
      end if;
    end if;
  end if;

  -- Checked only when the moment itself is being set, so that confirming or
  -- cancelling a reservation whose time has since passed still works. A venue
  -- must be able to close off yesterday's list.
  if (tg_op = 'INSERT' or new.reserved_for is distinct from old.reserved_for)
     and new.reserved_for <= now() then
    raise exception 'a table cannot be reserved in the past';
  end if;

  new.updated_at := now();
  return new;
end;
$fn$;
