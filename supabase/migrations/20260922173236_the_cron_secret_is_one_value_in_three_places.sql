-- REDACTED ON PURPOSE. DO NOT RESTORE THE LITERAL INTO THIS FILE.
--
-- On 22 September this migration rotated the Vault secret
-- `vallo_reconcile_secret`, after Vercel refused every production build with
-- INVALID_CRON_SECRET because `CRON_SECRET` carried trailing whitespace. A
-- Vercel `sensitive` variable is write only: the API returns an empty string
-- for its value even when asked to decrypt, so the whitespace could not be
-- trimmed in place and the only way to clear it was to write a new value.
--
-- Writing a new value on one holder means writing it on all three: Vercel
-- `CRON_SECRET`, which the scheduler presents; Vercel `RECONCILE_CRON_SECRET`,
-- which our door compares; and this Vault secret, which
-- `private.request_money_reconciliation` presents through pg_net.
--
-- THE SQL THAT RAN CARRIED THE BEARER AS A LITERAL, because
-- `vault.update_secret` is the only way to write it and only a migration runs
-- with the rights to call it. That literal was removed from
-- `supabase_migrations.schema_migrations` by the migration applied immediately
-- after this one, and it is not reproduced here. **A secret recorded in the
-- migration history in plaintext is not in the Vault at all.**
--
-- The value lives in `vault.secrets`, in Vercel `CRON_SECRET` and in Vercel
-- `RECONCILE_CRON_SECRET`, and nowhere else. To rotate it again, write all
-- three by hand; do not put it in a file.
--
-- The write was guarded: it read the secret back and failed unless the Vault
-- held exactly what was asked for, with no whitespace at either end. The first
-- draft of that guard asserted a length of 50 against a 59 character value and
-- correctly refused its own write.

do $$ begin
  null; -- redacted; see the note above
end $$;
