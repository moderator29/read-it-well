-- TRACK G, MIGRATION 6 OF 6: THE FIRM ARM ON `owns_listing`, AND THE GATE.
--
-- `private.owns_listing` has had ONE arm since July: the listing's agent is
-- me. A firm needs a second: the listing was published under a firm I am an
-- ACTIVE member of. Six policies depend on this function, so widening it here
-- widens all six with no policy edit, which is exactly why it was written as a
-- function in the first place (`20260728152229:131`).
--
-- NOTE THE ASYMMETRY IN THE POLICY BELOW, AND IT IS DELIBERATE. `using` admits
-- a firm colleague to read and amend a firm listing; `with check` still
-- demands that the row's own `agent_id` be the caller. A colleague may edit
-- the firm's listing. NOBODY MAY REASSIGN A LISTING TO THEMSELVES.
--
-- The policy is REPLACED rather than added to, because two permissive policies
-- on one table are an OR that nobody can read six months later.
--
-- ---------------------------------------------------------------------------
-- THE GATE, AND A DEPARTURE FROM THE RESEARCH SKETCH THAT IS NAMED RATHER THAN
-- SLIPPED IN.
--
-- `ROLE_ARCHITECTURE_RESEARCH.md` migration 6 sketches a gate whose owner arm
-- refuses to publish an owner's listing without an ownership document on file.
-- THAT ARM CONTRADICTS TWO THINGS THIS PROJECT HAS ALREADY RULED, including
-- the sketch's own closing paragraph.
--
--   1. HANDOFF 09 section 3.4 is a founder level ruling: most Nigerian land
--      sits outside the formal register, "I have none of these" is a FIRST
--      CLASS ANSWER, and it REACHES A PUBLISHED LISTING. It simply never earns
--      the words "ownership verified".
--   2. The sketch's own last line says the lesson is "go live fast on a light
--      check, keep verifying afterwards, and gate the BADGE rather than the
--      shelf". An owner arm that demands a document gates the shelf.
--
-- So the owner arm is not built. What gates the owner's BADGE is already built
-- and is in migration 3 of this set: `ownership_verified_at` cannot be set
-- without a named member of staff behind it, and the listing draws the rung as
-- not reached until it is. Gate the badge, not the shelf.
--
-- AND THE POSITIVE MANDATE ARM IS DELIBERATELY NOT SWITCHED ON TODAY, which is
-- the second departure and it is a DEFERRAL rather than a decision. A rule
-- saying "an agent's listing needs a mandate on file" is correct and it is
-- coming. Switching it on before the listing wizard collects one would stop
-- the review desk publishing ANY agent listing, because the wizard that would
-- gather the mandate is another group's file and has not been written yet. A
-- gate that stops the product working in order to enforce a field nothing
-- fills is not a gate, it is an outage. The arm is written below, commented,
-- one line from live, and `docs/BUILD_07_LEDGER.md` carries the handover.
--
-- WHAT IS SWITCHED ON IS THE PART THAT CANNOT BE WRONG UNDER ANY COLLECTION
-- PATH: A LISTING MAY NOT GO LIVE ON PAPERWORK STAFF HAVE ALREADY REFUSED.
-- That closes a real harm, breaks nothing (no rejected row exists anywhere
-- today, checked against the live database), and needs no form to be written
-- first.
--
-- WHERE IT FIRES, WHICH IS WHY IT IS SAFE. Nothing in the lister's own path
-- writes `PUBLISHED`: a listing goes SUBMITTED, and a member of staff moves it
-- to PUBLISHED from the review desk. So a refusal here reaches a REVIEWER who
-- can act on it, never a landlord staring at a form that will not submit.
--
-- RULE 21, BORN LOCKED. Two SECURITY DEFINER functions are defined here, one
-- of them by `create or replace` over a function that already exists. `create
-- or replace` KEEPS WHATEVER GRANTS THE OLD DEFINITION CARRIED, so the revoke
-- is restated in full for both rather than assumed to have survived, and the
-- probe reads both back.

create or replace function private.owns_listing(target_listing_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.listings l
      join public.agents a on a.id = l.agent_id
     where l.id = target_listing_id and a.user_id = (select auth.uid())
  ) or exists (
    select 1 from public.listings l
      join public.firm_members m on m.firm_id = l.firm_id
      join public.agents a on a.id = m.agent_id
     where l.id = target_listing_id and l.firm_id is not null
       and m.status = 'active' and a.user_id = (select auth.uid())
  );
$$;

revoke all on function private.owns_listing(uuid) from public;
revoke execute on function private.owns_listing(uuid) from anon;
revoke execute on function private.owns_listing(uuid) from authenticated;

drop policy if exists listings_owner_all on public.listings;
create policy listings_owner_all
  on public.listings for all
  using (private.owns_listing(listings.id))
  with check (exists (select 1 from public.agents a
                       where a.id = listings.agent_id and a.user_id = (select auth.uid())));

/* --------------------------------------------------------------- the gate */

create or replace function private.listing_supply_proof_gate()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status <> 'PUBLISHED' or new.is_demo then return new; end if;

  if new.listing_role = 'owner' then
    -- A REFUSED OWNERSHIP DOCUMENT STOPS A PUBLISH. A MISSING ONE DOES NOT.
    -- See the note at the head of this file: "I have none of these" reaches a
    -- published listing and simply never earns the ownership mark.
    if exists (select 1 from public.agent_documents d
                where d.listing_id = new.id and d.kind = 'ownership'
                  and d.review_status = 'rejected')
       and not exists (select 1 from public.agent_documents d
                        where d.listing_id = new.id and d.kind = 'ownership'
                          and d.review_status <> 'rejected') then
      raise exception 'The ownership document for this listing was refused. It cannot be published on a refused document.'
        using errcode = 'check_violation';
    end if;
  else
    if exists (select 1 from public.listing_mandates m
                where m.listing_id = new.id and m.review_status = 'rejected')
       and not exists (select 1 from public.listing_mandates m
                        where m.listing_id = new.id and m.review_status <> 'rejected') then
      raise exception 'The mandate for this listing was refused. It cannot be published on a refused mandate.'
        using errcode = 'check_violation';
    end if;

    -- THE POSITIVE ARM, WRITTEN AND NOT SWITCHED ON. The day the listing
    -- wizard collects a mandate, delete the two comment markers and this rule
    -- is live. It is left here rather than in a document because a rule kept
    -- in a document is a rule nobody finds.
    --
    -- if not exists (select 1 from public.listing_mandates m
    --                 where m.listing_id = new.id and m.review_status <> 'rejected') then
    --   raise exception 'A listing published by an agent or a firm needs a mandate on file.'
    --     using errcode = 'check_violation';
    -- end if;
  end if;

  return new;
end;
$$;

revoke all on function private.listing_supply_proof_gate() from public;
revoke execute on function private.listing_supply_proof_gate() from anon;
revoke execute on function private.listing_supply_proof_gate() from authenticated;

drop trigger if exists listing_supply_proof_gate on public.listings;
create trigger listing_supply_proof_gate
  before insert or update of status on public.listings
  for each row execute function private.listing_supply_proof_gate();
