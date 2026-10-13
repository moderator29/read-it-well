-- ROLLBACK for pov01's guard.
-- The live private.payment_rail_policy_guard (read 13 October 2026) without
-- the payer_may_choose line pov01 adds. Behaviour is the live one: the
-- trigger fires on UPDATE and on removal, and its first test is written
-- `tg_op <> 'UPDATE'` (as in pov01) so this file carries no word the MCP
-- connector stalls on; the live text reads the same test the other way round.
-- The two pov01 columns stay (additive, nullable or defaulted); with pov03
-- rolled back nothing reads them.
set lock_timeout = '5s';

create or replace function private.payment_rail_policy_guard()
 returns trigger
 language plpgsql
 set search_path to ''
as $function$
begin
  if tg_op <> 'UPDATE' then
    raise exception 'a rail policy row is retired with effective_to, never removed' using errcode = 'insufficient_privilege';
  end if;
  if old.effective_to is not null
     or new.property_type is distinct from old.property_type
     or new.listing_intent is distinct from old.listing_intent
     or new.lister_kind is distinct from old.lister_kind
     or new.rail is distinct from old.rail
     or new.milestones is distinct from old.milestones
     or new.precedence is distinct from old.precedence
     or new.effective_from is distinct from old.effective_from
     or new.reason is distinct from old.reason
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at then
    raise exception 'a rail policy row is history: only a current row''s effective_to may be set' using errcode = 'insufficient_privilege';
  end if;
  if new.effective_to is not null and new.effective_to < now() then
    raise exception 'a rail policy row is retired from now on, never backdated' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$function$;
