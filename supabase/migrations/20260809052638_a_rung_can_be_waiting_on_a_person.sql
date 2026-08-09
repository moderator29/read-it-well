-- A verification rung has a third answer: not yet.
--
-- agent_verification_checks_status_check allowed 'passed' and 'failed' and
-- nothing else, which forced every automated check into one of two verdicts. It
-- is the wrong shape for the case the Paystack rung produces constantly: the
-- bank says the account belongs to ADEBAYO MUSA and the identity document says
-- Adebayo Musa-Bello. That is not a pass, and calling it a failure would drop
-- somebody's public verification tier over a hyphen and tell them they had been
-- refused. It is a question for a human, and until now there was no way to
-- write that down.
--
-- 'pending' carries the two names in the note and changes nothing else.
-- private.agent_tier counts only rows with status = 'passed' and walks the
-- ladder stopping at the first rung that is not passed, so a pending row is
-- arithmetically identical to no row: nobody's tier moves. What it adds is the
-- sentence the reviewer needs, attached to the rung it is about, in the queue
-- where they are already looking.
--
-- The two existing readers, lib/agent/verification-queries.ts and
-- lib/admin/verification-queries.ts, both skip any status they do not
-- recognise, which they wrote as a defence against exactly this divergence.
-- They will ignore a pending row rather than break on it, and the admin KYC
-- queue built alongside this reads it deliberately.

begin;

alter table public.agent_verification_checks
  drop constraint agent_verification_checks_status_check;

alter table public.agent_verification_checks
  add constraint agent_verification_checks_status_check
  check (status = any (array['passed'::text, 'failed'::text, 'pending'::text]));

comment on constraint agent_verification_checks_status_check on public.agent_verification_checks is
  'passed, failed, or pending. Pending means an automated check ran and produced something a person has to look at; it is arithmetically identical to no row as far as private.agent_tier is concerned, so nobody''s tier moves on it.';

commit;
