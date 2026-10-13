-- DIRECT MESSAGES, STEP 1 (founder, 9 October 2026: "build the access where in
-- everyone's profile I can message them"). A direct thread is a chat between
-- two members that is about neither a listing, a table, a stay nor a business.
-- The enum value is added alone because a new value cannot be used in the
-- transaction that adds it; the shape check, the pair index and the doors
-- follow in direct_messages_doors. Applied live 9 October 2026.
alter type public.thread_context add value if not exists 'direct';
