-- Track K probe: only the super admin grants; nobody escalates.
-- Run after stub_schema.sql (track_a) and the Track K migration.
\set ON_ERROR_STOP 0
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'founder@x'),
  ('00000000-0000-4000-8000-00000000000b', 'admin@x'),
  ('00000000-0000-4000-8000-00000000000c', 'staff@x'),
  ('00000000-0000-4000-8000-00000000000d', 'member@x');
insert into public.user_roles values
  ('00000000-0000-4000-8000-00000000000a', 'super_admin'),
  ('00000000-0000-4000-8000-00000000000b', 'admin');

create or replace function pg_temp.as_user(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false) $$;

select '1 member grants self' as step, (select pg_temp.as_user('00000000-0000-4000-8000-00000000000d')),
  public.admin_grant_staff('00000000-0000-4000-8000-00000000000d', array['support'], null)->>'status' as answer;
select '2 admin (not super) grants member' as step, (select pg_temp.as_user('00000000-0000-4000-8000-00000000000b')),
  public.admin_grant_staff('00000000-0000-4000-8000-00000000000d', array['support'], null)->>'status' as answer;
select '3 super grants staff kyc+support' as step, (select pg_temp.as_user('00000000-0000-4000-8000-00000000000a')),
  public.admin_grant_staff('00000000-0000-4000-8000-00000000000c', array['kyc_review','support'], 'first hire')->>'status' as answer;
select '4 super grants an unknown scope' as step,
  public.admin_grant_staff('00000000-0000-4000-8000-00000000000c', array['everything'], null)->>'status' as answer;
select '5 super grants the admin' as step,
  public.admin_grant_staff('00000000-0000-4000-8000-00000000000b', array['support'], null)->>'status' as answer;
select '6 staff can support before handbook (expect f)' as step,
  private.staff_can('00000000-0000-4000-8000-00000000000c', 'support') as answer;
select '7 staff grants themselves more' as step, (select pg_temp.as_user('00000000-0000-4000-8000-00000000000c')),
  public.admin_grant_staff('00000000-0000-4000-8000-00000000000c', array['agreements'], null)->>'status' as answer;
select '8 staff grants the member' as step,
  public.admin_grant_staff('00000000-0000-4000-8000-00000000000d', array['support'], null)->>'status' as answer;
select '9 staff acks an old handbook' as step, public.staff_acknowledge_handbook('2026-01-01')->>'status' as answer;
select '10 staff acks the handbook' as step, public.staff_acknowledge_handbook('2026-09-25')->>'status' as answer;
select '11 staff can support (expect t)' as step, private.staff_can('00000000-0000-4000-8000-00000000000c', 'support') as answer;
select '12 staff can agreements (expect f)' as step, private.staff_can('00000000-0000-4000-8000-00000000000c', 'agreements') as answer;
select '13 member acks handbook' as step, (select pg_temp.as_user('00000000-0000-4000-8000-00000000000d')),
  public.staff_acknowledge_handbook('2026-09-25')->>'status' as answer;
select '14 member can support (expect f)' as step, private.staff_can('00000000-0000-4000-8000-00000000000d', 'support') as answer;
select '15 staff revokes nobody' as step, (select pg_temp.as_user('00000000-0000-4000-8000-00000000000c')),
  public.admin_revoke_staff('00000000-0000-4000-8000-00000000000c', 'I quit myself')->>'status' as answer;
select '16 super revokes staff' as step, (select pg_temp.as_user('00000000-0000-4000-8000-00000000000a')),
  public.admin_revoke_staff('00000000-0000-4000-8000-00000000000c', 'Contract ended')->>'status' as answer;
select '17 revoked staff can support (expect f)' as step, private.staff_can('00000000-0000-4000-8000-00000000000c', 'support') as answer;
select '18 admin can anything (expect t)' as step, private.staff_can('00000000-0000-4000-8000-00000000000b', 'guarantee') as answer;
select '19 audit rows' as step, string_agg(action, ',' order by created_at) as answer from public.audit_log;
select '20 staff email names the scopes' as step, payload->>'scope_words' as answer from public.email_outbox where template = 'staff.access_granted';
-- 21-22: direct writes as an API role are refused outright.
set role authenticated;
select pg_temp.as_user('00000000-0000-4000-8000-00000000000c');
insert into public.staff_grants (user_id, scopes, granted_by) values ('00000000-0000-4000-8000-00000000000c', array['agreements']::public.staff_scope[], '00000000-0000-4000-8000-00000000000c');
update public.staff_grants set revoked_at = null;
reset role;
select '21-22 grant row unchanged (expect revoked)' as step, (revoked_at is not null)::text as answer from public.staff_grants where user_id = '00000000-0000-4000-8000-00000000000c';
