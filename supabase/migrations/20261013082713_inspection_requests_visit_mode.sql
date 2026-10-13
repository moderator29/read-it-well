set lock_timeout = '5s';

alter table public.inspection_requests
  add column if not exists visit_mode text not null default 'in_person'
  constraint inspection_requests_visit_mode_chk check (visit_mode in ('in_person', 'video'));

comment on column public.inspection_requests.visit_mode is
  'How the viewing happens: in_person at the property, or video, a live call with the lister through Vallo calls. Chosen by the requester; money never moves for either.';
