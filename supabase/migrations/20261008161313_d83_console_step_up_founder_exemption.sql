-- D83: THE FOUNDER'S ACCOUNT OPENS THE CONSOLE WITHOUT THE SECURITY-KEY STEP (8 October 2026).
-- The founder: "MY ACCOUNT PHANTOMFCALLS SUPER ADMIN I DONT KNOW HOW TO SET SECRET KEY REMOVE SECRET
-- KEY FOR ME SO I ENTER FROM MY CONSOLE FROM MY ACCOUNT AUTOMATICALLY".
-- Narrow on purpose: one listed account, and only while it holds super_admin. Every other admin and
-- staff member still proves a security key per session. Undo: delete the row (or the table).
set local lock_timeout = '5s';

create table if not exists private.console_step_up_exemptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  reason text not null check (char_length(btrim(reason)) between 5 and 300),
  created_at timestamptz not null default now()
);
alter table private.console_step_up_exemptions enable row level security;
revoke all on private.console_step_up_exemptions from public, anon, authenticated;

insert into private.console_step_up_exemptions (user_id, reason)
values ('2255d905-0f31-437e-b719-aa2e4a18e03d', 'Founder request, 8 October 2026: enter the console without a security key.')
on conflict (user_id) do nothing;

create or replace function private.console_step_up_ok()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1 from public.console_step_ups s
     where s.user_id = (select auth.uid())
       and s.session_id = nullif((select auth.jwt()) ->> 'session_id', '')::uuid
       and s.expires_at > now())
  or exists (
    select 1 from private.console_step_up_exemptions e
     where e.user_id = (select auth.uid())
       and exists (select 1 from public.user_roles r
                    where r.user_id = e.user_id and r.role = 'super_admin'::public.app_role));
$function$;

insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
values (null, 'console.step_up_exempted', 'user', '2255d905-0f31-437e-b719-aa2e4a18e03d',
        jsonb_build_object('reason', 'Founder request, 8 October 2026', 'scope', 'super_admin only'));
