# Subject access: giving a person a copy of their data

The privacy notice promises a copy of the personal data Vallo holds about a
person, in a portable format (Nigeria Data Protection Act 2023). This is how
that promise is kept.

## Self-serve (the normal case)

A signed-in member opens **Settings → Privacy & Security → A copy of your
data → Download your data**. The browser downloads `vallo-data-<date>.json`
from `GET /api/account/export`.

- **What is in it:** the account (id, email, created), the profile, and every
  table that names the member: roles, terms acceptances, applications and
  document records, businesses, wallets and their entries, pots, bank
  accounts and saved cards (as stored, which is masked), bookings, refunds,
  reservations, rent payments, inspections, escrow evidence, conversations the
  member started, messages the member sent, support tickets, assistant
  conversations and messages, notifications, push devices, saved items and
  searches, Price Check history, posts, stories, comments, reactions,
  reviews, reports, follows, blocks, mutes, place memberships and badges.
  The list is `OWNED_TABLES` in `apps/web/src/lib/account/export.ts`.
- **How it is kept to that person:** every read uses the member's own session
  (RLS applies) and is filtered on the table's owner column to the member's
  id. Child rows are reached only through the member's own parent rows.
- **What it leaves out, and says so in the file (`notIncluded`):** security
  records only our systems read (`known_devices`, `account_identities`),
  queued emails (`email_outbox`), and the files themselves (photographs and
  documents are listed by storage path, not embedded).
- **Pacing:** three exports an hour per account (`data_export` bucket).
- **Tests:** `lib/account/export.test.ts`, `app/api/account/export/route.test.ts`.

## By request (what the export leaves out, or someone who cannot sign in)

1. Confirm the requester controls the account's email address (reply from it).
2. With the service role, read the rows `notIncluded` names for that user id,
   and the files under their uid folder in each bucket.
3. Send them within 30 days of the request, and write an `audit_log` row
   (`account.subject_access`, the user id, what was sent). Do not paste
   another person's data into the reply: messages from the other party in a
   conversation are theirs.
