-- STAFF SIGN-INS ARE AUDITED, AND A NEW PLACE ALERTS (29 September 2026).
--
-- Nothing recorded a staff account signing in, and the only new-device signal
-- was md5(user_agent), which an attacker sets to whatever they like. Now every
-- new session for an account that holds an admin role or a live staff grant:
--
--  * writes public.audit_log 'staff.sign_in' with the session id, the network
--    it came from (the /24 of an IPv4 address, the /48 of an IPv6 one) and a
--    SHA-256 of the whole user agent;
--  * when that network AND that user agent have not been seen together for
--    this account in 60 days, tells the account holder and every super admin,
--    in the app, that a staff account signed in from somewhere new.
--
-- The network is the stronger half: a copied user agent does not move the
-- attacker onto the staff member's network. And the session still opens no
-- desk until it proves the staff member's security key (the console's second
-- factor), so this is the alarm, not the lock. Like every trigger on the auth
-- schema, it can never break signing in.

create or replace function private.audit_staff_sign_in()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  is_staff boolean;
  net text;
  ua text;
  seen boolean;
  who text;
  boss uuid;
begin
  select exists (select 1 from public.user_roles r where r.user_id = new.user_id and r.role in ('admin', 'super_admin'))
      or exists (select 1 from public.staff_grants g where g.user_id = new.user_id and g.revoked_at is null)
    into is_staff;
  if not coalesce(is_staff, false) then
    return new;
  end if;

  net := case when new.ip is null then 'unknown'
              else host(network(set_masklen(new.ip, case when family(new.ip) = 4 then 24 else 48 end)))
                   || '/' || case when family(new.ip) = 4 then '24' else '48' end end;
  ua := left(encode(sha256(convert_to(coalesce(new.user_agent, ''), 'UTF8')), 'hex'), 32);

  select exists (
    select 1 from public.audit_log a
     where a.actor_id = new.user_id and a.action = 'staff.sign_in'
       and a.created_at > now() - interval '60 days'
       and a.metadata ->> 'network' = net and a.metadata ->> 'ua_hash' = ua)
    into seen;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (new.user_id, 'staff.sign_in', 'user', new.user_id::text,
          jsonb_build_object('session_id', new.id, 'network', net, 'ua_hash', ua, 'new_place', not seen));

  if not seen then
    select coalesce(nullif(btrim(p.display_name), ''), 'A staff member') into who
      from public.profiles p where p.id = new.user_id;
    perform private.notify(new.user_id, 'system'::public.notification_kind,
      'New sign-in to your staff account',
      'Your staff account signed in from a new network or device. If this was not you, tell the founder at once and change your password.',
      '/settings/privacy');
    for boss in
      select distinct r.user_id from public.user_roles r
       where r.role = 'super_admin'::public.app_role and r.user_id <> new.user_id
    loop
      perform private.notify(boss, 'system'::public.notification_kind,
        'Staff sign-in from a new place',
        coalesce(who, 'A staff member') || ' signed in from a new network or device.',
        '/admin/audit?q=staff.sign_in');
    end loop;
  end if;
  return new;
exception when others then
  raise warning '[staff sign-in] audit failed: %', sqlstate;
  return new;
end;
$function$;

revoke all on function private.audit_staff_sign_in() from public, anon, authenticated;

drop trigger if exists sessions_audit_staff_sign_in on auth.sessions;
create trigger sessions_audit_staff_sign_in after insert on auth.sessions
  for each row execute function private.audit_staff_sign_in();
