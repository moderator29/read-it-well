create table if not exists public.message_hidden (
  user_id uuid not null references auth.users (id) on delete cascade,
  message_id uuid not null references public.messages (id) on delete cascade,
  hidden_at timestamptz not null default now(),
  primary key (user_id, message_id)
);
comment on table public.message_hidden is 'Messages a person deleted for themselves. Written only by delete_message; a person sees only their own rows.';
alter table public.message_hidden enable row level security;
do $blk$
begin
  if not exists (select 1 from pg_policies where tablename = 'message_hidden' and policyname = 'message_hidden_own_select') then
    create policy message_hidden_own_select on public.message_hidden for select to authenticated
      using (user_id = (select auth.uid()));
  end if;
end;
$blk$;
revoke all on public.message_hidden from anon, authenticated;
grant select on public.message_hidden to authenticated;
