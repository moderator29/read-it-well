-- M12, corrected by its own probe.
--
-- Soft-deleting the default card promoted the most recent survivor from
-- inside the BEFORE trigger. The promotion is an UPDATE on the survivor, which
-- fires the same trigger, which clears "every other default", which reaches
-- back for the row being deleted while it is still mid-update: Postgres
-- refuses with 27000, "tuple to be updated was already modified by an
-- operation triggered by the current command", and the person cannot remove
-- their default card at all.
--
-- The BEFORE half keeps what belongs before the write: the first live row is
-- the default, choosing a default clears the others, a deleted row is never
-- the default. Promotion moves to an AFTER UPDATE trigger, where the deleted
-- row is already written as not-default, so the promotion's own clear-others
-- pass finds nothing to touch. Both tables, same two functions.
create or replace function private.soft_deleting_single_default()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  has_live boolean;
begin
  if new.deleted_at is not null then
    new.is_default := false;
    return new;
  end if;

  if tg_op = 'INSERT' then
    execute format(
      'select exists (select 1 from public.%I t where t.user_id = $1 and t.deleted_at is null)',
      tg_table_name
    ) into strict has_live using new.user_id;
    if not has_live then
      new.is_default := true;
    end if;
  end if;

  if new.is_default then
    execute format(
      'update public.%I set is_default = false where user_id = $1 and id <> $2 and is_default',
      tg_table_name
    ) using new.user_id, new.id;
  end if;

  return new;
end;
$function$;

create or replace function private.soft_deleting_promote_default()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  survivor uuid;
begin
  if old.is_default and old.deleted_at is null and new.deleted_at is not null then
    execute format(
      'select t.id from public.%I t where t.user_id = $1 and t.deleted_at is null and t.id <> $2 order by t.created_at desc limit 1',
      tg_table_name
    ) into survivor using new.user_id, new.id;
    if survivor is not null then
      execute format('update public.%I set is_default = true where id = $1', tg_table_name)
        using survivor;
    end if;
  end if;
  return null;
end;
$function$;

revoke execute on function private.soft_deleting_single_default() from public, anon, authenticated;
revoke execute on function private.soft_deleting_promote_default() from public, anon, authenticated;

drop trigger if exists payment_methods_promote_default on public.payment_methods;
create trigger payment_methods_promote_default
  after update on public.payment_methods
  for each row execute function private.soft_deleting_promote_default();

drop trigger if exists bank_accounts_promote_default on public.bank_accounts;
create trigger bank_accounts_promote_default
  after update on public.bank_accounts
  for each row execute function private.soft_deleting_promote_default();
