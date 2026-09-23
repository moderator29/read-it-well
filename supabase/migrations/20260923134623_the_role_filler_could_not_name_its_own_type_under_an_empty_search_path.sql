/*
 * MY OWN TRIGGER WAS BROKEN AND MY OWN READ-BACK COULD NOT SEE IT.
 *
 * `set search_path to ''` is right, and it means every name must be qualified,
 * INCLUDING A TYPE NAME IN A CAST. `'owner'::listing_role` raised
 * `42704 type "listing_role" does not exist` at insert time, so the fix for
 * "an agent cannot create a listing" replaced one refusal with another.
 *
 * The migration that installed it read back its grants and read back that the
 * trigger was installed and enabled, and both were true. **Neither could see
 * that the body does not run.** That is the blind light pattern inside the
 * repair for a blind light: a check that observes the thing was set up rather
 * than that it works. What caught it was the probe that actually inserts a
 * row the way the application inserts one.
 *
 * Both casts are now schema qualified.
 */

create or replace function private.listing_role_from_its_lister()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  declared text;
begin
  if new.listing_role is not null then
    return new;
  end if;

  select a.supply_role
    into declared
    from public.agents ag
    left join public.agent_applications a on a.id = ag.application_id
   where ag.id = new.agent_id;

  /* Owner or agent only. 'firm' is never derived: the check constraint
     `listings_firm_role_needs_a_firm` requires firm_id alongside it, so
     deriving firm without the firm swaps one refusal for another. */
  new.listing_role := case
    when declared = 'owner' then 'owner'::public.listing_role
    else 'agent'::public.listing_role
  end;

  return new;
end;
$function$;

/* RULE 21 restated after `create or replace`, and read back. */
revoke all on function private.listing_role_from_its_lister() from public, anon, authenticated;

do $$
begin
  if has_function_privilege('anon', 'private.listing_role_from_its_lister()', 'EXECUTE') then
    raise exception 'reachable by anon';
  end if;
  if has_function_privilege('authenticated', 'private.listing_role_from_its_lister()', 'EXECUTE') then
    raise exception 'reachable by authenticated';
  end if;
  /* The type resolves under an empty search path. This is the assertion the
     previous migration was missing, and it is still not a substitute for the
     insert probe, which is the only thing that runs the body. */
  if 'owner'::public.listing_role is null then
    raise exception 'unreachable, but the cast must compile';
  end if;
end $$;

/*
 * PROVED BY INSERTING, NOT BY READING. `scripts/probes/listing_role_fill.sql`
 * holds the probe; it ran through `apply_migration` and ended in a deliberate
 * raise so nothing committed:
 *
 *   PROBE ALL PASS listing_role: filled=agent explicit_kept=owner
 *   firm_without_firm=refused (23514) rows_before=64 rows_inside=66
 *   (all rolled back)
 *
 * Three assertions and two of them are controls. `filled=agent` is the fix.
 * `explicit_kept=owner` is the control that a trigger filling every row
 * regardless would have failed, and it is what stops this silently overruling
 * a caller. `firm_without_firm=refused` is the control that the constraint was
 * not loosened on the way past.
 */
