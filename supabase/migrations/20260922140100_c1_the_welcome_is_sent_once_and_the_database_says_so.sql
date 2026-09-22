-- THE WELCOME IS SENT ONCE, AND THE DATABASE IS WHAT SAYS SO.
--
-- `welcome` has existed in `lib/email/messages.ts`, written six times over for
-- six kinds of reader, complete and in the fixtures, with ZERO CALLERS. Nobody
-- has ever received the first email this platform was designed to send.
--
-- Wiring it needs one fact the application cannot hold on its own: whether
-- this person has already had it. Both confirmation paths (the six digit code
-- and the emailed link) end in the same place, a person can land on the link
-- path twice by tapping the mail twice, and a welcome that arrives three times
-- is worse than one that never arrives at all.
--
-- SO THE FLAG IS A COLUMN AND THE CLAIM IS A CONDITIONAL UPDATE. The send site
-- runs `update ... set welcomed_at = now() where id = $1 and welcomed_at is
-- null returning id`, and sends only if a row comes back. Two concurrent
-- callbacks race on the row lock, one wins, one gets nothing, and exactly one
-- email leaves. A boolean in application memory could not do that and a check
-- then write could not either.
--
-- THE RESIDUAL, STATED RATHER THAN HIDDEN. `authenticated` holds table wide
-- UPDATE on the columns of a profile row its owner's policy lets through, so a
-- person could in principle null their own flag and collect a second welcome.
-- Expressing "these columns and not that one" needs the revoke-then-grant
-- dance SEC-6 used on `anon`, on a table with a great many more readers, and
-- that is a wider change than this column is worth. The send site bounds it
-- the other way instead: it refuses when the account's email was confirmed
-- more than a day ago, so the worst a determined person can do is send
-- themselves one extra email during their own first day.

alter table public.profiles
  add column if not exists welcomed_at timestamptz;

comment on column public.profiles.welcomed_at is
  'When the welcome email was claimed for this account. Set by a conditional update at the send site so exactly one welcome leaves however many times a confirmation link is opened. Null means it has not been sent.';
