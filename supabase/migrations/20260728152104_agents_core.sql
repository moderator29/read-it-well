-- Agents subsystem: applications, approved agents, documents, payout accounts.
--
-- Two state machines, deliberately separate (intake C-03, C-04): a person
-- applies once, is verified once, then lists many properties. agent_applications
-- carries the 6-step application (Personal, Identity, Business, Documents,
-- Bank/Payout, Review) through the frozen status vocabulary; agents holds the
-- approved, verified profile. The vocabulary here is the single canonical set,
-- matching apps/web/src/lib/agent/types.ts, so an enum value never disagrees
-- with the UI.
--
-- RLS throughout: an applicant reaches only their own application and may edit it
-- only while it is a DRAFT (once submitted it is locked to the reviewer);
-- documents and payout accounts are reachable only by their owner; admins may
-- read everything and move applications through review. Approving an application
-- and creating the agent row is a privileged action performed by the service
-- layer or an admin, never by the applicant, so agents has no self-insert policy.

create type public.agent_application_status as enum (
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'MORE_INFO_REQUIRED',
  'APPROVED',
  'REJECTED',
  'SUSPENDED'
);

create type public.agent_type as enum ('individual', 'business');

-- Human-facing application reference, NF-AGT-##### as the references show.
create sequence public.agent_ref_seq start 10001;

create table public.agent_applications (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  reference           text not null unique default ('NF-AGT-' || lpad(nextval('public.agent_ref_seq')::text, 5, '0')),
  type                public.agent_type not null default 'individual',
  status              public.agent_application_status not null default 'DRAFT',
  -- Step 1, Personal.
  full_name           text,
  phone               text,
  email               text,
  residential_address text,
  state_code          text references public.states (code),
  city                text,
  -- Step 2, Identity.
  id_type             text,
  id_number           text,
  -- Step 3, Business (individual applicants leave these null).
  business_name       text,
  business_rc         text,
  -- Step 5, Bank / Payout.
  bank_name           text,
  account_number      text,
  account_name        text,
  -- Step 6, Review.
  agree_terms         boolean not null default false,
  submitted_at        timestamptz,
  reviewed_at         timestamptz,
  reviewer_id         uuid references auth.users (id),
  review_notes        text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- Nigerian phone and 10-digit NUBAN account, validated when present.
  constraint agent_applications_phone_chk
    check (phone is null or phone ~ '^(\+?234|0)\d{10}$'),
  constraint agent_applications_account_chk
    check (account_number is null or account_number ~ '^\d{10}$')
);

comment on table public.agent_applications is 'The 6-step agent application. One canonical status machine.';

create index agent_applications_user_idx   on public.agent_applications (user_id);
create index agent_applications_status_idx on public.agent_applications (status);

create table public.agents (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null unique references auth.users (id) on delete cascade,
  application_id uuid references public.agent_applications (id) on delete set null,
  display_name   text not null,
  type           public.agent_type not null default 'individual',
  status         public.agent_application_status not null default 'APPROVED',
  verified       boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.agents is 'Approved, verified agents. One row per agent user.';

create table public.agent_documents (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.agent_applications (id) on delete cascade,
  kind           text not null,
  storage_path   text not null,
  uploaded_at    timestamptz not null default now()
);

comment on table public.agent_documents is 'Uploaded verification documents, keyed to an application.';

create table public.payout_accounts (
  id             uuid primary key default gen_random_uuid(),
  agent_id       uuid not null references public.agents (id) on delete cascade,
  bank_name      text not null,
  account_number text not null,
  account_name   text not null,
  is_default     boolean not null default false,
  created_at     timestamptz not null default now(),
  constraint payout_accounts_number_chk check (account_number ~ '^\d{10}$')
);

comment on table public.payout_accounts is 'Agent bank accounts for settlement. 10-digit NUBAN.';

-- updated_at maintenance.
create trigger agent_applications_set_updated_at
  before update on public.agent_applications
  for each row execute function public.set_updated_at();

create trigger agents_set_updated_at
  before update on public.agents
  for each row execute function public.set_updated_at();

-- Row Level Security.
alter table public.agent_applications enable row level security;
alter table public.agents            enable row level security;
alter table public.agent_documents   enable row level security;
alter table public.payout_accounts   enable row level security;

-- Applications: applicant owns their rows, but may only edit a DRAFT. Insert is
-- allowed with their own user_id. Submitting past DRAFT is done by the service
-- layer (it also stamps submitted_at), so the update policy holds the row open
-- only while it is a draft.
create policy agent_applications_insert_own
  on public.agent_applications for insert
  with check (auth.uid() = user_id);

create policy agent_applications_select_own
  on public.agent_applications for select
  using (auth.uid() = user_id);

create policy agent_applications_update_draft
  on public.agent_applications for update
  using (auth.uid() = user_id and status = 'DRAFT')
  with check (auth.uid() = user_id);

create policy agent_applications_select_admin
  on public.agent_applications for select
  using (private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin'));

create policy agent_applications_review_admin
  on public.agent_applications for update
  using (private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin'))
  with check (private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin'));

-- Agents: an agent reads their own row; admins read all. No self-insert.
create policy agents_select_own
  on public.agents for select
  using (auth.uid() = user_id);

create policy agents_select_admin
  on public.agents for select
  using (private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin'));

create policy agents_manage_admin
  on public.agents for all
  using (private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin'))
  with check (private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin'));

-- Documents: reachable by the owning applicant and by admins.
create policy agent_documents_select_own
  on public.agent_documents for select
  using (exists (
    select 1 from public.agent_applications a
    where a.id = agent_documents.application_id and a.user_id = auth.uid()
  ));

create policy agent_documents_insert_own
  on public.agent_documents for insert
  with check (exists (
    select 1 from public.agent_applications a
    where a.id = agent_documents.application_id and a.user_id = auth.uid() and a.status = 'DRAFT'
  ));

create policy agent_documents_admin
  on public.agent_documents for select
  using (private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin'));

-- Payout accounts: reachable only by the owning agent.
create policy payout_accounts_own
  on public.payout_accounts for all
  using (exists (
    select 1 from public.agents ag
    where ag.id = payout_accounts.agent_id and ag.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.agents ag
    where ag.id = payout_accounts.agent_id and ag.user_id = auth.uid()
  ));

create policy payout_accounts_admin_read
  on public.payout_accounts for select
  using (private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin'));
