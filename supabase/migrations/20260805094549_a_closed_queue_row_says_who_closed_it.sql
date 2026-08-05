-- Who closed it, not just that it closed.
--
-- risk_alerts, reports and message_flags each carried a status and, for two of
-- the three, a resolved_at timestamp. None of them recorded a person. So the
-- console could show that an alert about somebody being asked to pay outside
-- RentMe had been resolved, and nobody could say by whom. The audit log does
-- hold the actor, but a queue that makes you cross-reference a second table to
-- answer "who signed this off" is a queue nobody cross-references.
--
-- on delete set null rather than cascade, deliberately: a member of staff
-- leaving must never erase the history of the decisions they made. The row
-- stays, the link goes.
--
-- Every foreign key gets a covering index, per the house rule.

alter table public.risk_alerts
  add column if not exists resolved_by uuid references auth.users(id) on delete set null;

alter table public.reports
  add column if not exists resolved_by uuid references auth.users(id) on delete set null;

alter table public.message_flags
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

create index if not exists risk_alerts_resolved_by_idx   on public.risk_alerts (resolved_by);
create index if not exists reports_resolved_by_idx       on public.reports (resolved_by);
create index if not exists message_flags_reviewed_by_idx on public.message_flags (reviewed_by);

comment on column public.risk_alerts.resolved_by is
  'The admin who resolved this alert. Null while open, and null again only if that account is deleted.';
comment on column public.reports.resolved_by is
  'The admin who last moved this report out of open.';
comment on column public.message_flags.reviewed_by is
  'The admin who reviewed this flag.';
