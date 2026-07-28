-- Admin and trust: audit log, risk alerts, user reports.
--
-- The audit log is append-only and admin-readable: every privileged action gets
-- a row, and there is no update or delete policy, so history cannot be quietly
-- rewritten (Master Rule 13, Build audit-trail requirement). Risk alerts are an
-- internal operations surface, admin-only. Reports let any signed-in user flag a
-- listing, review, message or user; the reporter can see their own reports, and
-- admins triage all of them.

create type public.alert_severity as enum ('low', 'medium', 'high');
create type public.alert_status   as enum ('open', 'resolved');
create type public.report_status  as enum ('open', 'reviewing', 'resolved', 'dismissed');

create table public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references auth.users (id) on delete set null,
  action      text not null,
  entity_type text not null,
  entity_id   text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

comment on table public.audit_log is 'Append-only record of privileged actions.';

create index audit_log_entity_idx on public.audit_log (entity_type, entity_id);
create index audit_log_actor_idx  on public.audit_log (actor_id);

create table public.risk_alerts (
  id          uuid primary key default gen_random_uuid(),
  severity    public.alert_severity not null default 'low',
  status      public.alert_status not null default 'open',
  title       text not null,
  description text,
  entity_type text,
  entity_id   text,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

comment on table public.risk_alerts is 'Operational risk alerts for the admin console.';

create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null,
  target_id   text not null,
  reason      text not null,
  status      public.report_status not null default 'open',
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

comment on table public.reports is 'Abuse and content reports raised by users.';

create index reports_status_idx on public.reports (status);

-- Row Level Security.
alter table public.audit_log   enable row level security;
alter table public.risk_alerts enable row level security;
alter table public.reports     enable row level security;

-- Audit log: admins read; writes come from the service role. No update or delete
-- policy at all, so the log is append-only from every non-service caller.
create policy audit_log_admin_select
  on public.audit_log for select
  using (private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin'));

-- Risk alerts: admin only, read and manage.
create policy risk_alerts_admin_all
  on public.risk_alerts for all
  using (private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin'))
  with check (private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin'));

-- Reports: a user raises and sees their own; admins triage all.
create policy reports_insert_own
  on public.reports for insert
  with check (auth.uid() = reporter_id);

create policy reports_select_own
  on public.reports for select
  using (auth.uid() = reporter_id);

create policy reports_admin_all
  on public.reports for all
  using (private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin'))
  with check (private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin'));
