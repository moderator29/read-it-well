-- V-87, LASRERA, ESVARBON AND CAC AS DATED CREDENTIALS, NEVER GATES.
--
-- Three optional credentials a supplier can hold, each checked by a named
-- member of staff and shown as a dated fact: registered with LASRERA (number
-- checked on the LASRERA register), a registered estate surveyor and valuer
-- (ESVARBON), and for a firm, a named person a director of the company at the
-- CAC. None of them is required to list: making them gates would exclude most
-- people who let flats outside Lagos and many inside it, and Vallo would be
-- enforcing a state law it is not charged with. Shown, dated, weighed by the
-- reader.
--
--   public.credentials          one row per person per kind: the number, the
--                               company for a CAC check, when and by whom it
--                               was checked and where. Re-checked yearly; a
--                               check older than a year is not shown (it
--                               disappears rather than going grey).
--   public.record_credential    staff only (guarded inside): writes or
--                               refreshes a check, with an audit row.
--   public.listing_credentials  per published real listing, the lister's
--                               checks from the last year. What a reader
--                               sees: kind, number, company, date. Never who
--                               checked it.
--
-- LASRERA and ESVARBON have no API anybody could find, so the first version is
-- a person reading the public register by hand and recording the date; the CAC
-- director check goes through the identity aggregator with V-49 when it exists.

create table if not exists public.credentials (
  id           uuid primary key default gen_random_uuid(),
  subject_id   uuid not null references auth.users(id) on delete cascade,
  kind         text not null check (kind in ('lasrera', 'esvarbon', 'cac_director')),
  number       text not null check (length(btrim(number)) between 2 and 60),
  company_name text check (company_name is null or length(btrim(company_name)) between 2 and 200),
  source       text not null check (source in ('register_by_hand', 'aggregator')),
  checked_at   timestamptz not null default now(),
  checked_by   uuid not null references auth.users(id),
  unique (subject_id, kind),
  constraint credentials_company_only_for_cac check ((kind = 'cac_director') = (company_name is not null))
);

comment on table public.credentials is
  'V-87. Optional, dated credentials: LASRERA, ESVARBON, CAC directorship. Never required. Shown only while the check is under a year old.';

revoke all on public.credentials from public, anon, authenticated;
alter table public.credentials enable row level security;

drop policy if exists credentials_select_own on public.credentials;
create policy credentials_select_own on public.credentials
  for select to authenticated using (subject_id = (select auth.uid()));

drop policy if exists credentials_select_staff on public.credentials;
create policy credentials_select_staff on public.credentials
  for select to authenticated
  using (
    private.has_role((select auth.uid()), 'admin'::public.app_role)
    or private.has_role((select auth.uid()), 'super_admin'::public.app_role)
  );

grant select on public.credentials to authenticated;
grant all on public.credentials to service_role;

create or replace function public.record_credential(
  p_subject uuid, p_kind text, p_number text, p_company text, p_source text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null or not (private.has_role(actor, 'admin'::public.app_role)
                           or private.has_role(actor, 'super_admin'::public.app_role)) then
    return 'forbidden';
  end if;
  if p_kind not in ('lasrera', 'esvarbon', 'cac_director') then return 'invalid'; end if;
  if p_number is null or length(btrim(p_number)) < 2 then return 'invalid'; end if;
  if (p_kind = 'cac_director') <> (p_company is not null and length(btrim(p_company)) >= 2) then return 'invalid'; end if;

  insert into public.credentials (subject_id, kind, number, company_name, source, checked_at, checked_by)
  values (p_subject, p_kind, btrim(p_number), nullif(btrim(coalesce(p_company, '')), ''),
          coalesce(p_source, 'register_by_hand'), now(), actor)
  on conflict (subject_id, kind) do update
    set number = excluded.number, company_name = excluded.company_name, source = excluded.source,
        checked_at = now(), checked_by = actor;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'credential.checked', 'user', p_subject::text,
          jsonb_build_object('kind', p_kind, 'source', coalesce(p_source, 'register_by_hand')));
  return 'recorded';
end;
$$;

comment on function public.record_credential(uuid, text, text, text, text) is
  'V-87. Staff record (or refresh) a credential check they made. Refuses anybody else inside the function.';

revoke all on function public.record_credential(uuid, text, text, text, text) from public, anon;
grant execute on function public.record_credential(uuid, text, text, text, text) to authenticated;

create or replace view public.listing_credentials as
  select l.id as listing_id, c.kind, c.number, c.company_name, c.checked_at
    from public.listings l
    join public.agents a on a.id = l.agent_id
    join public.credentials c on c.subject_id = a.user_id
   where l.status = 'PUBLISHED'::public.listing_status
     and not l.is_demo
     and not a.is_demo
     and c.checked_at > now() - interval '365 days';

comment on view public.listing_credentials is
  'V-87. The lister''s credential checks from the last year, per published real listing: kind, number, company, date, never the checker. A definer view granted to readers, the same recorded exception as public.listing_lister: an invoker view would need a policy letting strangers read credentials rows.';

revoke all on public.listing_credentials from public, anon, authenticated;
grant select on public.listing_credentials to anon, authenticated;

do $readback$
declare bad text := '';
begin
  if has_table_privilege('anon', 'public.credentials', 'select') then bad := bad || ' [anon reads credentials]'; end if;
  if has_table_privilege('authenticated', 'public.credentials', 'insert') then bad := bad || ' [a member can write a credential]'; end if;
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'listing_credentials' and column_name = 'checked_by') then
    bad := bad || ' [the checker is public]';
  end if;
  if bad <> '' then raise exception 'READ-BACK FAILED:%', bad; end if;
end;
$readback$;
