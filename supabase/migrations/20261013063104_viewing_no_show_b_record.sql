-- Applied 13 October 2026, part of the viewing no-show and both-sides reminders migration (founder decisions, round 2).
-- Dependencies and grants were checked against the live database before applying.
set lock_timeout = '5s';

create table if not exists public.inspection_no_shows (
  inspection_id uuid primary key references public.inspection_requests (id) on delete cascade,
  reported_by   uuid not null references auth.users (id) on delete cascade,
  absent_id     uuid not null references auth.users (id) on delete cascade,
  absent_role   text not null check (absent_role in ('requester', 'lister')),
  note          text check (note is null or length(note) <= 400),
  reported_at   timestamptz not null default now(),
  disputed_at   timestamptz,
  dispute_note  text check (dispute_note is null or length(dispute_note) <= 400),
  resolved_at   timestamptz,
  resolution    text check (resolution is null or resolution in ('upheld', 'overturned')),
  resolved_by   uuid references auth.users (id) on delete set null,
  constraint inspection_no_shows_parties_differ check (reported_by <> absent_id),
  constraint inspection_no_shows_resolved_after_dispute check (resolved_at is null or disputed_at is not null)
);

comment on table public.inspection_no_shows is
  'A viewing one party says the other did not come to: who reported it, who is said to have stayed away, the 48-hour dispute and staff''s resolution. Written only by report_/dispute_/resolve_inspection_no_show.';

create index if not exists inspection_no_shows_reported_by_idx on public.inspection_no_shows (reported_by);
create index if not exists inspection_no_shows_absent_idx on public.inspection_no_shows (absent_id, reported_at desc);
create index if not exists inspection_no_shows_resolved_by_idx on public.inspection_no_shows (resolved_by);

alter table public.inspection_no_shows enable row level security;
revoke all on public.inspection_no_shows from public, anon, authenticated;
grant select on public.inspection_no_shows to authenticated;
grant all on public.inspection_no_shows to service_role;

create policy inspection_no_shows_select_party on public.inspection_no_shows
  for select to authenticated
  using (reported_by = (select auth.uid()) or absent_id = (select auth.uid()));

create policy inspection_no_shows_select_admin on public.inspection_no_shows
  for select to authenticated
  using (
    private.has_role((select auth.uid()), 'admin'::public.app_role)
    or private.has_role((select auth.uid()), 'super_admin'::public.app_role)
  );
