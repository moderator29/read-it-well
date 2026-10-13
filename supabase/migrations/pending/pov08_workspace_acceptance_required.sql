-- DRAFT, not applied. PAY ON VALLO 8 of 8. Needs pov07. Apply AFTER the app
-- on track/pay-on-vallo is live: until then the forms in production do not
-- record pay_on_vallo, and a submission would be refused.
-- Ruling 6, enforced in the database as well as in the server actions: a
-- member's workspace application or setup is not SUBMITTED unless its
-- consents record the Terms, the Privacy Policy and the pay-on-Vallo
-- statement.
--
--   agent_applications  (owner, agent and firm registrations, and the
--     professional application): on INSERT as SUBMITTED, or on the move to
--     SUBMITTED from DRAFT or MORE_INFO_REQUIRED.
--   businesses  (host setup: hotel, shortlet, restaurant): on the move to
--     SUBMITTED. The host's Terms and Privacy Policy are already recorded
--     there with the Host Agreement.
--
-- API roles only (the session role authenticated or anon), as the existing
-- guards do: staff tools and the service role pass. A refusal is 42501 with
-- a sentence the app does not need to show (the forms ask first).
-- Probe: supabase/tests/probes-pending/pov08-workspace-acceptance-required.sql
set lock_timeout = '5s';

create or replace function private.workspace_submit_needs_acceptance()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $fn$
begin
  -- The session's API role (PostgREST sets it), read as book_stay_instantly
  -- reads it: inside a definer function current_user is the owner.
  if coalesce(current_setting('role', true), 'none') not in ('authenticated', 'anon') then
    return new;
  end if;
  if new.status::text <> 'SUBMITTED' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status::text = 'SUBMITTED' then
    return new;
  end if;
  if not private.consents_accepted(new.consents, 'terms')
     or not private.consents_accepted(new.consents, 'privacy')
     or not private.consents_accepted(new.consents, 'pay_on_vallo') then
    raise exception 'acceptance_required: accept the Terms of Service, the Privacy Policy and that every payment for a deal happens inside Vallo before sending this'
      using errcode = '42501';
  end if;
  return new;
end;
$fn$;

create or replace trigger agent_applications_03_acceptance_required
  before insert or update of status on public.agent_applications
  for each row execute function private.workspace_submit_needs_acceptance();

create or replace trigger businesses_02_acceptance_required
  before insert or update of status on public.businesses
  for each row execute function private.workspace_submit_needs_acceptance();

revoke all on function private.workspace_submit_needs_acceptance() from public, anon, authenticated;
