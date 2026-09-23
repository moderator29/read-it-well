-- THE NINTH BUILDER. `newEnquiry`, written, fixture-rendered, and reachable
-- from nothing.
--
-- It is the one on this list with a number attached to it: an enquiry answered
-- the same day turns into a viewing far more often than one answered next
-- week, and a lister who is an agent working from a phone is not sitting
-- inside the application when it arrives. The in-app row alone asks them to
-- open an app to discover whether the thing that just happened mattered. The
-- email carries the first two lines of what was actually asked, so they can
-- decide from the notification and reply from the bus.
--
-- ----------------------------------------------------------------------------
-- AN ENQUIRY IS NOT A MESSAGE, AND THE DIFFERENCE IS THE WHOLE TRIGGER.
--
-- `private.notify_message` already writes an in-app row for EVERY message, and
-- emailing every one of those would be a mailing list rather than a product.
-- What is worth an email is the FIRST message in a conversation that is about
-- a property, from the person asking to the person listing. Every condition
-- below is one of those words:
--
--   the conversation has a `listing_id`          it is about a property
--   this is the first message in it              it is an enquiry, not a reply
--   the sender is the conversation's guest       it is the asker, not the lister
--   there is an `agent_id` and it is not them    there is somebody to tell
--
-- A second message in the same thread enqueues nothing, and so does the
-- lister's own reply, which is what keeps this from becoming a per-message
-- mailer the day somebody has a long conversation.
--
-- ----------------------------------------------------------------------------
-- THE ONE TEMPLATE THAT HONOURS A MUTE.
--
-- Everything else in `public.email_outbox` is a security obligation, a receipt
-- for money that moved, or the state of an agreement the reader is a party to,
-- and none of those is switchable on /settings. This one IS: the Messages
-- switch on that card promises that turning it off stops message email, and an
-- enquiry is a message. `lib/notify/templates.ts` declares the channel and the
-- drain passes it to `contactForUser`, which resolves a muted person to nobody
-- and drops the row. The promise on that card stays checkable.
--
-- ----------------------------------------------------------------------------
-- NOTHING OF WHAT WAS WRITTEN IS IN THE QUEUE.
--
-- The payload carries three ids. The words the enquirer typed are read at send
-- time from `public.messages` by the service role, truncated rather than
-- summarised, because it is somebody else's writing and this platform does not
-- paraphrase people to each other.

create or replace function private.enqueue_new_enquiry_email()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  c public.conversations;
  v_earlier bigint;
begin
  select * into c from public.conversations where id = new.conversation_id;
  if c.id is null or c.listing_id is null or c.agent_id is null then
    return new;
  end if;
  if new.sender_id is distinct from c.guest_id then
    return new;
  end if;
  if c.agent_id = c.guest_id then
    return new;
  end if;

  /* The first message, counted rather than assumed: a conversation can be
     opened by one code path and written to by another, and "created_at is the
     same as the conversation's" would be a guess about both. */
  select count(*) into v_earlier
    from public.messages m
   where m.conversation_id = new.conversation_id
     and m.id <> new.id;
  if v_earlier > 0 then
    return new;
  end if;

  perform private.email_outbox_enqueue(
    c.agent_id,
    'listing.new_enquiry',
    /* One per conversation, ever. */
    'enquiry:' || c.id::text,
    jsonb_build_object(
      'conversation_id', c.id,
      'message_id', new.id,
      'listing_id', c.listing_id,
      'enquirer_id', c.guest_id
    )
  );
  return new;
end;
$$;

revoke all on function private.enqueue_new_enquiry_email()
  from public, anon, authenticated;

drop trigger if exists messages_enqueue_new_enquiry_email on public.messages;
create trigger messages_enqueue_new_enquiry_email
  after insert on public.messages
  for each row
  execute function private.enqueue_new_enquiry_email();

do $$
declare
  v_open int;
  v_trigger int;
begin
  select count(*) into v_open
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private' and p.proname = 'enqueue_new_enquiry_email'
     and (has_function_privilege('anon', p.oid, 'EXECUTE')
       or has_function_privilege('authenticated', p.oid, 'EXECUTE'));
  if v_open <> 0 then
    raise exception 'rule 21: private.enqueue_new_enquiry_email is executable by anon or authenticated';
  end if;

  select count(*) into v_trigger from pg_trigger
   where tgname = 'messages_enqueue_new_enquiry_email' and not tgisinternal and tgenabled = 'O';
  if v_trigger <> 1 then
    raise exception 'the enquiry trigger is not installed and enabled (%)', v_trigger;
  end if;
end
$$;
