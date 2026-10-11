-- D73 Part A, first piece: the stays_instant_pay switch and its two helpers.
-- Applied alone on 7 October 2026 after the whole of d73a timed out once in the
-- MCP and rolled back. The rest of d73a follows as its own migration; this text
-- is exactly what was applied.
insert into public.feature_flags (key, enabled, note)
values ('stays_instant_pay', false,
        'D73: a hotel room or nightly stay at the published price is booked and paid in one flow, with no host acceptance or Vallo review step. Off until the founder switches it on.')
on conflict (key) do nothing;

create or replace function private.stays_instant_pay_on()
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select coalesce((select f.enabled from public.feature_flags f where f.key = 'stays_instant_pay'), false);
$$;

create or replace function private.instant_pay_window()
returns interval
language sql
immutable
set search_path to ''
as $$ select interval '30 minutes' $$;

revoke all on function private.stays_instant_pay_on() from public, anon, authenticated;
revoke all on function private.instant_pay_window() from public, anon, authenticated;
