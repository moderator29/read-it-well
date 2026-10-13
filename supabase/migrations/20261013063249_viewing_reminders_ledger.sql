-- Applied 13 October 2026, part of the viewing no-show and both-sides reminders migration (founder decisions, round 2).
-- Dependencies and grants were checked against the live database before applying.
set lock_timeout = '5s';

create table if not exists public.viewing_reminders (
  inspection_id uuid not null references public.inspection_requests (id) on delete cascade,
  audience      text not null check (audience in ('renter', 'lister')),
  stage         text not null check (stage in ('eve', 'soon')),
  slot_at       timestamptz not null,
  sent_at       timestamptz not null default now(),
  primary key (inspection_id, audience, stage, slot_at)
);
alter table public.viewing_reminders enable row level security;
revoke all on public.viewing_reminders from public, anon, authenticated;
grant all on public.viewing_reminders to service_role;

-- Run separately with execute_sql (copy of already-sent renter reminders; 0 rows on 13 October 2026):
-- /* The renter reminders already sent, for the slot they were for. */
-- insert into public.viewing_reminders (inspection_id, audience, stage, slot_at, sent_at)
-- select m.subject_id, 'renter', m.stage, i.slot_at, m.sent_at
--   from public.member_reminders m
--   join public.inspection_requests i on i.id = m.subject_id
--  where m.kind = 'viewing'
--    and m.stage in ('eve', 'soon')
--    and i.slot_at is not null
-- on conflict do nothing;
