-- An operational one-off, kept so the applied set and the file set match.
--
-- It fired the money reconciliation once, by hand, against the deployment that
-- went live at 17:36, to learn whether the secret rotation had actually opened
-- the door. Not a test row and not a fixture: the real scheduled job, run early.
-- The reply was then read out of `net._http_response` rather than inferred from
-- the call returning, because a job that reports success for firing a request
-- it never reads is the fault that cost this platform 24 days.
--
-- It returned 200 with charges and holds both examined at `unavailable:false`
-- over a real 48 hour window. First successful reconciliation since 29 August.
--
-- LEFT INERT. Re-running it would fire a real job against production, which is
-- not something a schema rebuild should do. The call is preserved in the
-- comment rather than in the statement.
--
--   select private.request_money_reconciliation();

do $$ begin
  null;
end $$;
