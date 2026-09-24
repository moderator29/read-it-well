-- V-15, REVIEW FIX: THE SEARCH WALK RESUMES WHERE IT STOPPED.
--
-- The five-minute new-match run reads alerting saved searches by id, twenty
-- pages at most. When there were more, every run started again at the first
-- id, so searches past the cap were never read and the queue never closed.
-- The walk now keeps its place in one row: the id it stopped after and when
-- the current pass began. A run resumes after that id; a run that reaches the
-- end closes the pass (the place goes back to null) and marks done only the
-- queued listings enqueued before the pass began, which every page of the
-- pass has seen. Service role only.

create table if not exists public.match_alert_walk (
  id               smallint primary key default 1 check (id = 1),
  after_id         uuid,
  pass_started_at  timestamptz,
  updated_at       timestamptz not null default now()
);

comment on table public.match_alert_walk is
  'V-15. Where the new-match run''s walk over alerting saved searches stopped (after_id) and when the current pass began. One row. Service role only.';

alter table public.match_alert_walk enable row level security;
revoke all on public.match_alert_walk from public, anon, authenticated;
grant all on public.match_alert_walk to service_role;

insert into public.match_alert_walk (id) values (1) on conflict (id) do nothing;
