/*
 * AN INSPECTION'S COLUMNS ARE WRITTEN ONLY BY WHOSE THEY ARE.
 *
 * Applied 13 October 2026. Written by the viewing track on 12 October 2026 for
 * review; apply it only after reading it, then rename and record it as
 * CONTRIBUTING.md says. It changes no table, no column, no policy and no
 * grant: it adds one trigger function and one trigger, and nothing the app
 * does today is refused by it (every action names only the columns its move
 * needs, `lib/inspections/actions.ts`).
 *
 * WHAT IS OPEN TODAY, THROUGH THE API, WITH THE STATE UNCHANGED.
 *
 * `inspection_requests_update_party` lets either party update any column;
 * `private.guard_inspection_transition` returns early when the state does
 * not change; `private.freeze_inspection_parties` freezes only the two
 * parties and the listing. The insert policy does not look at
 * `conversation_id` either. So:
 *
 *   1. Either party can point `conversation_id` at ANY conversation, one
 *      they are not in included. The thread page reads the live inspection
 *      of a conversation (`readOpenInspectionForConversation`) under the
 *      reader's own RLS, so a lister who is a party to the inspection sees
 *      it, with its Confirm and Decline, inside a DIFFERENT renter's thread,
 *      and the day kit's "On my way" then goes into that thread.
 *   2. The requester can move `slot_at` while it is CONFIRMED (V-05 froze a
 *      private copy for the truth questions and named the column itself as
 *      still open), so both screens show an agreed time the lister never
 *      agreed to, and no notification says so.
 *   3. The requester can rewrite `requested_at` (described as "never
 *      overwritten by a reschedule") or write `lister_note`, which every
 *      screen shows as the lister's own words; the lister can rewrite
 *      `note`, the renter's.
 *   4. A REQUESTED row can be inserted already carrying a `slot_at` or a
 *      `lister_note`, the same two claims made at birth.
 *
 * WHAT THIS DOES. One BEFORE INSERT OR UPDATE trigger, named to run after
 * `inspection_requests_set_lister` (so `lister_id` is the real lister on an
 * insert) and after the transition guard on an update:
 *
 *   - `conversation_id`, when it is set or changed, must be the conversation
 *     between exactly these two people about exactly this listing, which is
 *     the one `startConversation` finds or makes for the request and the
 *     booking actions alike (clearing it to null stays allowed);
 *   - on an update, `requested_at` never changes; `slot_at` changes only
 *     when the lister moves the row into CONFIRMED or PROPOSED; `note` is
 *     the requester's and `lister_note` the lister's;
 *   - a REQUESTED row is born with no `slot_at` and no `lister_note`.
 *
 * WHO IT DOES NOT TOUCH. A caller with no JWT (the service role, pg_cron and
 * database-internal work) and staff (`admin`, `super_admin`, who hold
 * `inspection_requests_admin_all`) pass untouched, as they pass the guard.
 * `book_viewing_slot` inserts as the renter with `slot_at` set, which is fine:
 * its row is born CONFIRMED, never REQUESTED, and carries no conversation
 * until the action stamps the parties' own one. The report submission's
 * close (CONFIRMED to COMPLETED) changes none of these columns.
 *
 * NO DROP. `create or replace trigger` (Postgres 14 and later) replaces in
 * place, so this file can be re-run.
 *
 * PROBE AFTER APPLYING, as the real roles, each inside a transaction that is
 * rolled back:
 *   - as the renter of a live request, update its conversation_id to a
 *     conversation they are not in: expect check_violation;
 *   - as the renter of a CONFIRMED request, update slot_at: expect
 *     check_violation;
 *   - CONTROL that must succeed: as the lister of a REQUESTED request,
 *     update state to PROPOSED with a slot_at two days out: expect 1 row;
 *   - CONTROL that must succeed: as the renter, update conversation_id to
 *     the conversation `startConversation` returned for that listing:
 *     expect 1 row.
 */

set lock_timeout = '5s';

create or replace function private.inspection_columns_belong()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null
     or private.has_role(caller, 'admin'::public.app_role)
     or private.has_role(caller, 'super_admin'::public.app_role) then
    return new;
  end if;

  /* 1. The thread an inspection is drawn in is its own parties' thread. */
  if new.conversation_id is not null
     and (tg_op = 'INSERT' or new.conversation_id is distinct from old.conversation_id)
     and not exists (
       select 1
         from public.conversations c
        where c.id = new.conversation_id
          and c.guest_id = new.requester_id
          and c.agent_id = new.lister_id
          and c.listing_id = new.listing_id
     ) then
    raise exception 'an inspection belongs only in the conversation between its two parties about its listing'
      using errcode = 'check_violation';
  end if;

  if tg_op = 'INSERT' then
    /* 4. A request is a question. The agreed time and the lister's answer
       are written by the lister, later. */
    if new.state = 'REQUESTED'::public.inspection_state
       and (new.slot_at is not null or new.lister_note is not null) then
      raise exception 'a new inspection request carries no agreed time and no lister note'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  /* 3. What was asked for stays what was asked for. */
  if new.requested_at is distinct from old.requested_at then
    raise exception 'the time an inspection was asked for does not change'
      using errcode = 'check_violation';
  end if;

  /* 2. The agreed time moves only with the lister's answer. */
  if new.slot_at is distinct from old.slot_at
     and not (
       caller = old.lister_id
       and new.state is distinct from old.state
       and new.state in ('CONFIRMED'::public.inspection_state, 'PROPOSED'::public.inspection_state)
     ) then
    raise exception 'the agreed time of an inspection changes only with the lister''s answer'
      using errcode = 'check_violation';
  end if;

  /* 3. Each side's line is that side's. */
  if new.note is distinct from old.note and caller <> old.requester_id then
    raise exception 'the request note is the requester''s to write'
      using errcode = 'check_violation';
  end if;
  if new.lister_note is distinct from old.lister_note and caller <> old.lister_id then
    raise exception 'the lister note is the lister''s to write'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

comment on function private.inspection_columns_belong() is
  'An inspection''s conversation is its own parties'' thread about its listing; requested_at never changes; slot_at moves only with the lister''s answer; note is the requester''s and lister_note the lister''s. Service role and staff pass.';

revoke all on function private.inspection_columns_belong() from public, anon, authenticated;

create or replace trigger inspection_requests_y_columns_belong
  before insert or update on public.inspection_requests
  for each row execute function private.inspection_columns_belong();
