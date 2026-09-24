-- Removes the revoked push token a QA probe registered for the QA member on
-- 23 September, matched by id, owner, the probe's token prefix and its
-- revoked state, so on any other database this deletes nothing.
delete from public.push_tokens
 where id = 'a0be03aa-8042-47ae-98e7-e50a8bd976a8'
   and user_id = '957b3bd2-cce3-425d-bba9-5cd876ca3d62'
   and token like 'https://web.push.apple.com/QA-PROBE-a4-%'
   and revoked_at is not null;
