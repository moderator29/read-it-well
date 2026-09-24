-- MON-02 (staged: apply after the release that points the admin button at the
-- verifying sweep). The two age-only functions fail every PENDING withdrawal
-- past a cutoff without asking the processor, so a transfer that had paid out
-- was released as well and the member was paid twice. The release no longer
-- calls either; nothing else does (no cron job, no other function). No API
-- role keeps EXECUTE, so neither can be reached again by accident.
revoke all on function public.admin_expire_stale_withdrawal_holds(integer) from public, anon, authenticated, service_role;
revoke all on function public.expire_stale_withdrawal_holds(integer) from public, anon, authenticated, service_role;
comment on function public.admin_expire_stale_withdrawal_holds(integer) is
  'RETIRED (MON-02): age-only release. The admin sweep verifies each hold with Paystack (lib/wallet/reconciliation.ts sweepStaleWithdrawalHolds).';
comment on function public.expire_stale_withdrawal_holds(integer) is
  'RETIRED (MON-02): age-only release. See sweepStaleWithdrawalHolds.';
