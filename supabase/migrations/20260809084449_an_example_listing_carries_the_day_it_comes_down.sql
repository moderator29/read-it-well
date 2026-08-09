/*
 * Every example listing now carries the date it comes down.
 *
 * A dataset with no expiry becomes permanent by accident. Forty two example
 * properties were inserted because an empty catalogue looks broken, and "we
 * will take them out when real listings arrive" is not a plan, it is the
 * sentence that is still true in two years with nobody able to say who owns
 * it. DEMO-2 item 10 asked for a date, decided and recorded on the row. This
 * is it: 2026-11-07, ninety days from the day they landed.
 *
 * WHY A COLUMN ON `listings` RATHER THAN A FIELD ON THE EXAMPLE LISTER.
 *
 * The lister record is the tidier place and it is the wrong one, for three
 * reasons that all point the same way.
 *
 *   Retirement is expected to happen in waves, not at once. That is not a
 *   guess: `ListingSearchFilter.excludeDemo` was built as a flag rather than a
 *   migration precisely because supply arrives unevenly, thin in one city and
 *   healthy in another, and the decision gets reversed once or twice. Lagos
 *   filling up first is the likely case, and one date on one lister row cannot
 *   express "these eighteen, now" while a date per listing can. A single date
 *   is what you get by setting them all the same.
 *
 *   The date has to survive the lister. Removing the example collection may
 *   well mean deleting the lister account, and a retirement date that vanishes
 *   with the record it was meant to police is worse than none: the rows would
 *   outlive the only evidence that they were ever temporary.
 *
 *   The rule belongs beside the flag it qualifies. `is_demo` is on `listings`,
 *   the CHECK constraints that keep a trust mark off an example row are on
 *   `listings`, and a reader asking "what is true of this row" should not have
 *   to join to find out when it expires.
 *
 * The cost is 42 copies of one date instead of one, which is the correct
 * trade: this table is the authority on what a listing is.
 *
 * WHAT ENFORCES IT. Not this migration, deliberately. Nothing here or in the
 * read path compares the clock to the date and starts hiding rows: a catalogue
 * that empties itself overnight with no warning would take discovery, the map
 * and every city page blank at once, with the cause invisible from any screen.
 * The alarm is a spec, `apps/web/src/lib/listings/retirement.test.ts`, which
 * fails the build once the date is behind us and the tree still ships the
 * collection. A red build is a good failure. A blank marketplace is not.
 *
 * The switch, when somebody reaches for it, is `excludeDemo`, already pushed
 * down to SQL against `listings_demo_idx`.
 *
 * Additive and reversible. One nullable column, one BEFORE trigger, one CHECK.
 * No row is deleted and no existing column changes meaning.
 */

-- 1. The column. Nullable because it is meaningless on real inventory, and the
--    CHECK below makes that precise in both directions.
alter table public.listings
  add column demo_retire_after date;

comment on column public.listings.demo_retire_after is
  'The day this example listing is due out of the catalogue. NULL on real '
  'inventory, and NOT NULL on every row with is_demo set. Mirrored in '
  'apps/web/src/lib/listings/retirement.ts, where a spec fails the build once '
  'the date has passed and the rows are still here.';

-- 2. The default, as a trigger rather than a column DEFAULT.
--
--    A column DEFAULT would stamp a retirement date onto real listings too,
--    which is the opposite of the claim being made: a real property does not
--    expire. So the default is conditional on the flag, and the same function
--    clears the date when a row stops being an example, so the two columns can
--    never disagree.
--
--    Ninety days because DEMO-1, recruiting real listers by hand, is a
--    fortnight of phone calls repeated a few times, and a quarter is long
--    enough that nobody can say they were not given a run at it.
create or replace function public.stamp_demo_retirement_date()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if new.is_demo then
    if new.demo_retire_after is null then
      new.demo_retire_after := current_date + 90;
    end if;
  else
    new.demo_retire_after := null;
  end if;
  return new;
end;
$$;

/* A trigger function has no business on the REST API surface. The catalogue
   sweep in 20260809082855 ran before this function existed, so it revokes its
   own grant rather than waiting for the next sweep. */
revoke all on function public.stamp_demo_retirement_date() from public, anon, authenticated;

create trigger listings_stamp_demo_retirement_date
  before insert or update of is_demo, demo_retire_after on public.listings
  for each row execute function public.stamp_demo_retirement_date();

-- 3. The date on the rows that exist. Stated as a literal rather than as
--    current_date + 90 so that re-running this file on another environment
--    lands the same day rather than ninety days from whenever it was run: the
--    date is a decision, not an interval.
update public.listings
   set demo_retire_after = date '2026-11-07'
 where is_demo;

-- 4. The rule, so a future insert cannot skip the date by disabling the
--    trigger or writing through a path that does not fire it.
alter table public.listings
  add constraint listings_demo_carries_a_retirement_date check (
    (is_demo and demo_retire_after is not null)
    or ((not is_demo) and demo_retire_after is null)
  );
