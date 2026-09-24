-- Deleting one person never takes the other party's records with them.
--
-- The app never deletes a user: the account purge anonymises auth.users in
-- place. A delete from the dashboard or the Admin API did, and it cascaded
-- through conversations (both parties' threads), their messages, the
-- messages' moderation flags and attachments, the person's reports, and
-- their agents row with every listing, review and reservation under it.
-- Those keys now refuse the delete. So does deleting a booking or a table
-- reservation that has a thread: the thread's context cannot change
-- (conversations_context_is_valid, conversations_context_shape_chk), so it
-- keeps the booking or reservation it is about.
--
-- The dashboard's "Delete user" and a hard Admin API delete now fail with
-- 23503 for such a person, as they already did for anybody with a wallet or
-- a booking. Remove a person with the account deletion flow (the purge);
-- docs/DEPLOY.md section 4.8.

alter table public.conversations
  drop constraint conversations_guest_id_fkey,
  add constraint conversations_guest_id_fkey foreign key (guest_id) references auth.users(id) on delete restrict;
alter table public.conversations
  drop constraint conversations_agent_id_fkey,
  add constraint conversations_agent_id_fkey foreign key (agent_id) references auth.users(id) on delete restrict;
alter table public.messages
  drop constraint messages_sender_id_fkey,
  add constraint messages_sender_id_fkey foreign key (sender_id) references auth.users(id) on delete restrict;
alter table public.reports
  drop constraint reports_reporter_id_fkey,
  add constraint reports_reporter_id_fkey foreign key (reporter_id) references auth.users(id) on delete restrict;
alter table public.agents
  drop constraint agents_user_id_fkey,
  add constraint agents_user_id_fkey foreign key (user_id) references auth.users(id) on delete restrict;

alter table public.conversations
  drop constraint conversations_booking_id_fkey,
  add constraint conversations_booking_id_fkey foreign key (booking_id) references public.bookings(id) on delete restrict;
alter table public.conversations
  drop constraint conversations_reservation_id_fkey,
  add constraint conversations_reservation_id_fkey foreign key (reservation_id) references public.reservations(id) on delete restrict;
