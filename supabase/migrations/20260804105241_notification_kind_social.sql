-- One line, its own migration, on purpose.
--
-- Postgres will not let a newly added enum value be USED in the transaction
-- that adds it. Adding 'social' and then writing a policy, trigger or insert
-- that references it in the same migration applies cleanly and then fails at
-- runtime with "unsafe use of new value". So the value lands alone here and
-- everything that uses it comes in the next migration.

alter type public.notification_kind add value if not exists 'social';
