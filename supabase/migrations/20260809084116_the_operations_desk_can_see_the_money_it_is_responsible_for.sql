-- The wallet health helpers existed and nothing could reach them.
--
-- private.wallets_overdrawn() and private.stale_withdrawal_holds() have been in
-- this database since the wallet layer landed, and their public pass-throughs
-- carry EXECUTE for service_role only. That is correct for a cron job and
-- useless for a person: an operator holding the admin role cannot call either
-- one, so the only way to answer "is anybody's money stuck" was a SQL console.
--
-- These three functions are the admin-facing door. Each one repeats the role
-- check at its own boundary rather than trusting the caller, in the same shape
-- public.escrow_admin_resolve already uses: auth.uid() must carry 'admin' or
-- 'super_admin' or the answer is {"status": "forbidden"} and nothing runs. The
-- existing service_role-only functions are left exactly as they are; nothing
-- here widens them.

/* ---------------------------------------------------------------- read side */

create or replace function public.admin_payment_health(p_stale_minutes integer default 30)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  actor uuid := auth.uid();
  minutes integer := greatest(coalesce(p_stale_minutes, 30), 1);
  overdrawn jsonb;
  holds jsonb;
  unsettled jsonb;
begin
  if actor is null
     or not (private.has_role(actor, 'admin') or private.has_role(actor, 'super_admin')) then
    return jsonb_build_object('status', 'forbidden');
  end if;

  -- A wallet below zero is a ledger that has lost an argument with itself.
  -- It is listed first because it is the only finding here that means the
  -- books are wrong rather than slow.
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'wallet_id', o.wallet_id,
        'user_id', o.user_id,
        'display_name', p.display_name,
        'balance_minor', o.balance_minor
      )
      order by o.balance_minor
    ),
    '[]'::jsonb
  )
  into overdrawn
  from private.wallets_overdrawn() o
  left join public.profiles p on p.id = o.user_id;

  -- A PENDING withdrawal hold subtracts from spendable balance for as long as
  -- it sits there, so a transfer whose webhook never landed freezes somebody's
  -- money with nothing on any screen to explain it.
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'reference', h.reference,
        'wallet_id', h.wallet_id,
        'user_id', w.user_id,
        'display_name', p.display_name,
        'amount_minor', h.amount_minor,
        'created_at', h.created_at
      )
      order by h.created_at
    ),
    '[]'::jsonb
  )
  into holds
  from private.stale_withdrawal_holds(minutes) h
  left join public.wallets w on w.id = h.wallet_id
  left join public.profiles p on p.id = w.user_id;

  -- Payments the provider has not settled. Bounded to the last thirty days and
  -- fifty rows: this is a health panel, not a ledger export, and an operator
  -- who needs the whole history has the reconcile route for it.
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'provider', t.provider,
        'provider_ref', t.provider_ref,
        'amount_minor', t.amount_minor,
        'currency', t.currency,
        'status', t.status,
        'booking_id', t.booking_id,
        'created_at', t.created_at
      )
      order by t.created_at desc
    ),
    '[]'::jsonb
  )
  into unsettled
  from (
    select *
    from public.transactions
    where status in ('PENDING', 'FAILED')
      and created_at > now() - interval '30 days'
    order by created_at desc
    limit 50
  ) t;

  return jsonb_build_object(
    'status', 'ok',
    'stale_minutes', minutes,
    'overdrawn', overdrawn,
    'stale_holds', holds,
    'unsettled', unsettled
  );
end;
$function$;

revoke all on function public.admin_payment_health(integer) from public;
revoke all on function public.admin_payment_health(integer) from anon;
grant execute on function public.admin_payment_health(integer) to authenticated;
grant execute on function public.admin_payment_health(integer) to service_role;

/* --------------------------------------------------------------- write side */

create or replace function public.admin_expire_stale_withdrawal_holds(
  p_older_than_minutes integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  actor uuid := auth.uid();
  minutes integer := greatest(coalesce(p_older_than_minutes, 30), 1);
  swept jsonb;
  moved integer;
begin
  if actor is null
     or not (private.has_role(actor, 'admin') or private.has_role(actor, 'super_admin')) then
    return jsonb_build_object('status', 'forbidden');
  end if;

  -- The sweep itself is already written and already correct: only PENDING rows
  -- move, so a webhook arriving mid sweep cannot be undone by this.
  swept := public.expire_stale_withdrawal_holds(minutes);
  moved := coalesce((swept ->> 'expired')::integer, 0);

  -- Releasing somebody's frozen balance is a money movement and goes on the
  -- record with the operator's name against it.
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (
    actor,
    'wallet.expire_stale_withdrawal_holds',
    'wallet_entry',
    null,
    jsonb_build_object(
      'older_than_minutes', minutes,
      'expired', moved,
      'references', coalesce(swept -> 'references', '[]'::jsonb)
    )
  );

  return jsonb_build_object(
    'status', 'ok',
    'expired', moved,
    'references', coalesce(swept -> 'references', '[]'::jsonb)
  );
end;
$function$;

revoke all on function public.admin_expire_stale_withdrawal_holds(integer) from public;
revoke all on function public.admin_expire_stale_withdrawal_holds(integer) from anon;
grant execute on function public.admin_expire_stale_withdrawal_holds(integer) to authenticated;
grant execute on function public.admin_expire_stale_withdrawal_holds(integer) to service_role;

/* ------------------------------------------------------- the example listings */

create or replace function public.admin_retire_demo_listings(p_listing_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  actor uuid := auth.uid();
  retired uuid[];
begin
  if actor is null
     or not (private.has_role(actor, 'admin') or private.has_role(actor, 'super_admin')) then
    return jsonb_build_object('status', 'forbidden');
  end if;

  if p_listing_ids is null or array_length(p_listing_ids, 1) is null then
    return jsonb_build_object('status', 'nothing_selected');
  end if;

  -- `is_demo` is in the WHERE clause rather than assumed from the caller, so
  -- this function can never take a real listing off the catalogue however it is
  -- called. Retiring is SUSPENDED rather than a delete: the rows stay, the
  -- catalogue stops showing them, and a mistake is one status change to undo.
  with moved as (
    update public.listings l
       set status = 'SUSPENDED',
           updated_at = now()
     where l.id = any(p_listing_ids)
       and l.is_demo is true
       and l.status <> 'SUSPENDED'
    returning l.id
  )
  select coalesce(array_agg(id), '{}'::uuid[]) into retired from moved;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (
    actor,
    'listing.retire_examples',
    'listing',
    null,
    jsonb_build_object(
      'requested', array_length(p_listing_ids, 1),
      'retired', coalesce(array_length(retired, 1), 0),
      'ids', to_jsonb(retired)
    )
  );

  return jsonb_build_object(
    'status', 'ok',
    'retired', coalesce(array_length(retired, 1), 0),
    'ids', to_jsonb(retired)
  );
end;
$function$;

revoke all on function public.admin_retire_demo_listings(uuid[]) from public;
revoke all on function public.admin_retire_demo_listings(uuid[]) from anon;
grant execute on function public.admin_retire_demo_listings(uuid[]) to authenticated;
grant execute on function public.admin_retire_demo_listings(uuid[]) to service_role;
