/*
 * V-98. NEXT UP: THE ONE THING A HOME-SCREEN WIDGET MAY KNOW.
 *
 * A widget runs outside the app, with no session cookie, so it holds a
 * DEVICE-BOUND TOKEN instead: minted by the signed-in app on this phone,
 * handed to the native side, and stored here only as a SHA-256 hash. The
 * token can do exactly one thing, ask `widget_next_up`, which answers the
 * person's next commitment at AREA level: what, when, the area and state,
 * and the other party's first name and initial. Never an address, never an
 * amount, never a reference. A revoked or expired token (ninety days) gets
 * nothing, and signing out everywhere revokes every token (`revokeWidgetTokens`).
 *
 * The widgets themselves (Android Glance, iOS WidgetKit) are native projects
 * and are not in this migration.
 */

create table if not exists public.widget_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  label text check (label is null or char_length(label) <= 40),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '90 days',
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists widget_tokens_user_idx on public.widget_tokens (user_id, created_at desc);

alter table public.widget_tokens enable row level security;
revoke all on table public.widget_tokens from public, anon, authenticated;

comment on table public.widget_tokens is
  'V-98. Hashes of device-bound tokens that let a home-screen widget read one area-level "next up" item. Service role only; 90 days; revoked on sign-out everywhere.';

create or replace function public.widget_next_up(p_token_hash text)
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_user uuid;
  v_insp record;
  v_book record;
  v_has_insp boolean;
  v_has_book boolean;
begin
  update public.widget_tokens t
     set last_used_at = now()
   where t.token_hash = p_token_hash
     and t.revoked_at is null
     and t.expires_at > now()
  returning t.user_id into v_user;
  if v_user is null then
    return jsonb_build_object('status', 'unauthorised');
  end if;
  /* A banned, deleted or deleting account answers nothing, whatever the token. */
  if exists (select 1 from auth.users u
              where u.id = v_user
                and ((u.banned_until is not null and u.banned_until > now()) or u.deleted_at is not null))
     or exists (select 1 from public.account_deletion_requests r
                 where r.user_id = v_user and r.status in ('SCHEDULED', 'PURGING')) then
    return jsonb_build_object('status', 'unauthorised');
  end if;

  select i.id, i.slot_at, l.area, l.state_code,
         case when i.requester_id = v_user then i.lister_id else i.requester_id end as other,
         (i.requester_id = v_user) as as_renter
    into v_insp
    from public.inspection_requests i
    join public.listings l on l.id = i.listing_id
   where (i.requester_id = v_user or i.lister_id = v_user)
     and i.state = 'CONFIRMED'::public.inspection_state
     and i.slot_at > now()
   order by i.slot_at
   limit 1;
  v_has_insp := found;

  select b.id, b.check_in, l.area, l.state_code
    into v_book
    from public.bookings b
    join public.listings l on l.id = b.listing_id
   where b.guest_id = v_user
     and b.status = 'CONFIRMED'::public.booking_status
     and b.check_in >= (now() at time zone 'Africa/Lagos')::date
   order by b.check_in
   limit 1;
  v_has_book := found;

  if v_has_insp and (not v_has_book or v_insp.slot_at < (v_book.check_in::timestamp at time zone 'Africa/Lagos')) then
    return jsonb_build_object(
      'status', 'ok',
      'kind', 'inspection',
      'at', v_insp.slot_at,
      'area', v_insp.area,
      'state', v_insp.state_code,
      'person', (select nullif(btrim(coalesce(p.first_name, '') || ' ' ||
                        coalesce(left(nullif(btrim(p.surname), ''), 1) || '.', '')), '')
                   from public.profiles p where p.id = v_insp.other),
      'role', case when v_insp.as_renter then 'renter' else 'lister' end,
      /* Where each side keeps its inspections. */
      'href', case when v_insp.as_renter then '/bookings?kind=inspection' else '/agent/inspections' end
    );
  end if;
  if v_has_book then
    return jsonb_build_object(
      'status', 'ok',
      'kind', 'check_in',
      'on', v_book.check_in,
      'area', v_book.area,
      'state', v_book.state_code,
      /* The list, never a row id: a widget shows nothing that names a booking. */
      'href', '/bookings'
    );
  end if;
  return jsonb_build_object('status', 'ok', 'kind', 'nothing');
end;
$$;

revoke all on function public.widget_next_up(text) from public, anon, authenticated;
grant execute on function public.widget_next_up(text) to service_role;

/*
 * REVOKED WHEREVER THE ACCOUNT IS STOPPED. A widget token outlives the app's
 * session by design, so every place that stops an account stops its widgets:
 * asking for deletion, a "this was not me" money hold (V-19, and any other
 * hold), and ending every other session.
 */
create or replace function private.revoke_widget_tokens_for(p_user uuid)
returns void
language sql
security definer
set search_path to ''
as $$
  update public.widget_tokens set revoked_at = now()
   where user_id = p_user and revoked_at is null;
$$;
revoke all on function private.revoke_widget_tokens_for(uuid) from public, anon, authenticated;

create or replace function private.widget_tokens_stop_on_row()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  perform private.revoke_widget_tokens_for(new.user_id);
  return new;
end;
$$;
revoke all on function private.widget_tokens_stop_on_row() from public, anon, authenticated;

drop trigger if exists widget_tokens_stop_on_deletion on public.account_deletion_requests;
create trigger widget_tokens_stop_on_deletion
  after insert on public.account_deletion_requests
  for each row execute function private.widget_tokens_stop_on_row();

do $$
begin
  if to_regclass('public.account_money_holds') is not null then
    execute 'drop trigger if exists widget_tokens_stop_on_hold on public.account_money_holds';
    execute 'create trigger widget_tokens_stop_on_hold
               after insert or update of hold_until on public.account_money_holds
               for each row execute function private.widget_tokens_stop_on_row()';
  end if;
end
$$;

/* end_other_sessions, copied verbatim from the live definition (read with
   pg_get_functiondef on 24 September 2026), with one line added: the widgets
   go too. */
create or replace function public.end_other_sessions()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  actor uuid := (select auth.uid());
  current_session uuid := nullif(((select auth.jwt()) ->> 'session_id'), '')::uuid;
  removed integer;
begin
  if actor is null then
    return jsonb_build_object('status', 'forbidden');
  end if;

  -- `is distinct from` rather than `<>`, because a null current_session must
  -- not make the predicate null and quietly spare every row. A caller whose
  -- token carries no session claim wants everything gone, and gets it.
  delete from auth.sessions s
   where s.user_id = actor
     and s.id is distinct from current_session;
  get diagnostics removed = row_count;

  perform private.revoke_widget_tokens_for(actor);  -- V-98, the one added line

  return jsonb_build_object('status', 'ok', 'ended', removed);
end;
$function$;

do $$
begin
  /* has_table_privilege answers for the named role (a grant to PUBLIC
     included, a column grant not); information_schema's grant views answer
     only for the observer and pass by seeing nothing. */
  if has_table_privilege('anon', 'public.widget_tokens', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
     or has_table_privilege('authenticated', 'public.widget_tokens', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER') then
    raise exception 'widget_tokens is not born locked';
  end if;
  if has_function_privilege('anon', 'public.widget_next_up(text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.widget_next_up(text)', 'EXECUTE') then
    raise exception 'widget_next_up is callable by an API role';
  end if;
end
$$;
