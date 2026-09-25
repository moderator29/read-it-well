-- Track A: no flag that could re-enable custody. Turning on wallet, held
-- payments or their payouts is refused for everybody, super admin included;
-- the rest of the guard is unchanged.
create or replace function private.guard_feature_flag_write()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  api_caller boolean := coalesce(current_setting('role', true), 'none') in ('authenticated', 'anon');
  uid uuid := auth.uid();
  is_super boolean := uid is not null and private.has_role(uid, 'super_admin'::public.app_role);
  touched_key text := coalesce(new.key, old.key);
begin
  if tg_op <> 'DELETE' and new.enabled
     and new.key in ('wallet', 'wallet_pots', 'held_payments', 'held_payments_payouts') then
    raise exception 'custody_retired: Vallo never holds customer money, so % cannot be turned on', new.key
      using errcode = '42501', hint = 'Track A, 25 September 2026. See docs/MONEY_ARCHITECTURE.md.';
  end if;
  if touched_key = 'held_payments' or old.key = 'held_payments' then
    if api_caller and not is_super then
      raise exception 'held_payments_is_super_admin_only: only a super admin may change the held payments switch'
        using errcode = '42501', hint = 'ESC-08.';
    end if;
  end if;
  if touched_key = 'held_payments_payouts' or old.key = 'held_payments_payouts' then
    if api_caller and not is_super
       and not (tg_op = 'UPDATE' and new.key = old.key and new.enabled = false) then
      raise exception 'held_payments_payouts_resume_is_super_admin_only: only a super admin may resume escrow payouts'
        using errcode = '42501', hint = 'ESC-05.';
    end if;
  end if;
  return coalesce(new, old);
end;
$function$;
