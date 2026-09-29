-- Found 29 September 2026 by database probe mon-05, on the first run after
-- 20260929011637 (a refund reverses the split).
--
-- A PART-REFUND COULD WRITE A MIXED-SIGN LEDGER ROW. private.refund_components
-- split a refund cumulatively, rounding each of the lister, processor and
-- Guarantee parts down, and gave the platform whatever was left. Floor
-- differences can each run one kobo over their exact share, so when the
-- settlement carried no platform fee the "left over" went to -1 or -2 kobo.
-- The reversal row then held a positive platform part inside a negative gross,
-- which ledger_entries_sign_chk refuses, and the refund failed.
--
-- All four parts are now rounded down cumulatively (each one is never
-- negative, since the cumulative floor only rises). The few kobo of rounding
-- go to the part with the largest settled total: added when the parts come
-- short, and taken back largest-first, never below zero, when they run over.
-- Every part is >= 0 and the parts sum to the refund, so every row balances
-- and keeps one sign. Callers are unchanged.
create or replace function private.refund_components(
  p_booking uuid, p_prev bigint, p_amount bigint,
  out platform bigint, out agent bigint, out processor bigint, out guarantee bigint)
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  sg bigint; sp bigint; sa bigint; spr bigint; sgu bigint;
  prev bigint := greatest(coalesce(p_prev, 0), 0);
  amt bigint := greatest(coalesce(p_amount, 0), 0);
  upto bigint;
  tot bigint[]; part bigint[]; ord int[];
  r bigint; take bigint; i int;
begin
  select coalesce(sum(e.gross_minor), 0), coalesce(sum(e.platform_fee_minor), 0),
         coalesce(sum(e.agent_share_minor), 0), coalesce(sum(e.processor_fee_minor), 0),
         coalesce(sum(e.guarantee_reserve_minor), 0)
    into sg, sp, sa, spr, sgu
    from public.ledger_entries e
   where e.booking_id = p_booking and e.gross_minor > 0;
  if sg <= 0 then
    platform := 0; agent := amt; processor := 0; guarantee := 0;
    return;
  end if;
  upto := least(prev + amt, sg);
  prev := least(prev, sg);
  -- 1 platform, 2 agent, 3 processor, 4 guarantee
  tot  := array[greatest(sp, 0), greatest(sa, 0), greatest(spr, 0), greatest(sgu, 0)];
  part := array[
    (tot[1] * upto) / sg - (tot[1] * prev) / sg,
    (tot[2] * upto) / sg - (tot[2] * prev) / sg,
    (tot[3] * upto) / sg - (tot[3] * prev) / sg,
    (tot[4] * upto) / sg - (tot[4] * prev) / sg];
  -- Largest settled total first; ties go to the lister's share.
  select array_agg(k::int order by t desc, (k = 2) desc, k) into ord
    from unnest(tot) with ordinality as x(t, k);
  r := amt - (part[1] + part[2] + part[3] + part[4]);
  if r > 0 then
    part[ord[1]] := part[ord[1]] + r;
  else
    foreach i in array ord loop
      exit when r = 0;
      take := least(part[i], -r);
      part[i] := part[i] - take;
      r := r + take;
    end loop;
  end if;
  platform := part[1]; agent := part[2]; processor := part[3]; guarantee := part[4];
end;
$function$;
revoke all on function private.refund_components(uuid, bigint, bigint) from public, anon, authenticated;
