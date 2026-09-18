-- B4, third file: the nightly badge sweep stops dying on the example lister.
--
-- WHAT WAS WRONG. pg_cron job rentme-nightly-badges (select
-- private.sweep_badges()) has failed every night since the example lister was
-- marked, with "The example lister holds no badges. Badge photo_pro was refused
-- for user e0000000-...-000000000001", raised by
-- public.refuse_badge_for_example_lister() (20260809081841). The example
-- account owns the 64 demo listings, all PUBLISHED, none REJECTED, so the
-- photo_pro query in the sweep selects it every night, private.award_badge
-- tries the insert, the trigger refuses, and the exception ends the whole
-- sweep: every badge computed after photo_pro (rentme_elite) and every award
-- the same run would have made is lost with it. The B4 pg-cron-watch job
-- surfaced this on the lead's first live probe (one failure in 25 hours).
--
-- THE FIX, at the one door every award goes through. private.award_badge is
-- the only writer of user_badges from the sweep and from the event triggers
-- (award_listing_badges and friends), so it is taught the same question the
-- refusal trigger asks: is this user a demo agent? If so it returns without
-- inserting, exactly as it already does for a null user. The sweep's own text
-- is untouched; its seven queries still name the example lister and the door
-- now quietly declines. The trigger stays exactly as it is, as the backstop
-- for any writer that bypasses the door: an example account still cannot be
-- given a badge by anyone, this just stops a scheduled job asking for one.
--
-- WHY NOT EDIT THE SWEEP. Seven queries would each need the same exclusion,
-- and the eighth badge added next month would forget it. The predicate lives
-- in one place, reused from the trigger by shape (agents.user_id = user and
-- agents.is_demo), never a hardcoded id.
--
-- ADDITIVE: create or replace of one function with the same signature and
-- return type; nothing dropped, no privilege changed (the existing revokes
-- persist through the replace).
--
-- HOW IT WAS PROBED. Locally (scripts/probes/b4_badge_sweep.log): a scratch
-- database with agents, badges, user_badges, the real refusal trigger text
-- and this function; award_badge for a demo agent inserts nothing and raises
-- nothing, for a real agent inserts once and is idempotent on the second
-- call, and a direct insert for the demo agent is still refused by the
-- trigger. Live, inside a transaction the lead rolls back:
--
--   begin;
--   select private.award_badge('e0000000-0000-4000-8000-000000000001', 'photo_pro', 'probe', '{}'::jsonb);
--     -- must return without raising
--   select count(*) from public.user_badges where user_id = 'e0000000-0000-4000-8000-000000000001';
--     -- 0
--   select private.sweep_badges();
--     -- must return a count, not raise; every badge it grants is rolled back below
--   rollback;

create or replace function private.award_badge(
  p_user     uuid,
  p_code     text,
  p_reason   text,
  p_evidence jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user is null then return; end if;

  -- The example lister holds no badges (20260809081841). Decline at the door
  -- rather than let the trigger's refusal end a sweep that has six more
  -- badges to consider for everybody else.
  if exists (
    select 1 from public.agents a
     where a.user_id = p_user and a.is_demo
  ) then
    return;
  end if;

  insert into public.user_badges (user_id, badge_code, reason, evidence)
  values (p_user, p_code, p_reason, p_evidence)
  on conflict (user_id, badge_code) do nothing;
end;
$$;

comment on function private.award_badge(uuid, text, text, jsonb) is
  'The one door for granting a badge. Idempotent on (user, badge). Returns silently for a null user and for a demo agent, so the nightly sweep never dies on the example lister; the user_badges trigger still refuses the example lister for any other writer.';
