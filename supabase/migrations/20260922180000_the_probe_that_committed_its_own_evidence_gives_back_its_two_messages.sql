-- THE FIRST HALF OF UNDOING A PROBE THAT COMMITTED INSTEAD OF ROLLING BACK.
--
-- Migration 20260919181950 is not a migration. It forges JWT claims, proves a
-- stranger cannot read a reservation thread, and then ends on an UPDATE rather
-- than a RAISE, so it committed its own evidence into live product tables.
-- Writing test rows to live product tables is on the stop list and that one is
-- already past it. The founder has ruled that the rows go: the only
-- reservation this platform has being a forged one is the same dishonesty that
-- was removed from the front page.
--
-- THIS REMOVES ONLY THE TWO FORGED MESSAGES. The other three rows, the venue,
-- the reservation and the thread, are chained by ON DELETE CASCADE in both
-- directions, and conversations_context_shape_chk forbids a reservation thread
-- without a reservation, so the thread cannot be spared by nulling the link.
-- A REAL MESSAGE SENT BY A REAL PERSON ON 20 SEPTEMBER is sitting in that
-- thread, so removing the forged reservation would take it too. That is a
-- decision about somebody's own data rather than a tidy-up, and it waits for
-- them. BUILD_07_LEDGER section 15 names all five rows and the real one.
--
-- Deleting by exact id, never by a predicate that could widen.

delete from public.messages
where id in (
  'c06eb9fd-2fe4-4559-8eb2-7eb5ac092727',  -- "Your table is held for four at seven. See you tomorrow."
  '6a6c704a-0055-4680-aa76-f5cbd6ffb05b'   -- "Hello, we are coming for dinner tomorrow at seven."
);

do $$
declare
  left_in_thread integer;
  forged_left integer;
begin
  select count(*) into left_in_thread
    from public.messages
   where conversation_id = '2ad0ffaf-d58a-4e1f-8e80-134368820533';

  select count(*) into forged_left
    from public.messages
   where id in ('c06eb9fd-2fe4-4559-8eb2-7eb5ac092727', '6a6c704a-0055-4680-aa76-f5cbd6ffb05b');

  if forged_left <> 0 then
    raise exception 'REFUSING: % forged messages survived the delete', forged_left;
  end if;

  if left_in_thread <> 1 then
    raise exception 'REFUSING: the thread holds % messages, expected exactly the one real one', left_in_thread;
  end if;
end $$;
