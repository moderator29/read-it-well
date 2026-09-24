-- Removes what the 23 September audit's own probes left on live, by exact id
-- AND the identifying fields read before deletion, so on any other database
-- this deletes nothing.
--   * three risk alerts raised by unsigned probe calls;
--   * an archived, empty QA savings pot;
--   * the QA accounts' scripted ('node') sessions from the audit window.
delete from public.risk_alerts
 where (id = '32987f01-4ac2-47d5-8f35-c836bbe3c68f' and title = 'Webhook: paystack, signature invalid'
        and created_at >= '2026-09-23 20:49:00+00' and created_at < '2026-09-23 20:49:01+00')
    or (id = 'ad909d45-90da-4bd1-8a74-004de6a834cd' and title = 'Webhook: yellowcard, unconfigured'
        and created_at >= '2026-09-23 20:49:02+00' and created_at < '2026-09-23 20:49:03+00')
    or (id = 'b001cf29-a3de-4f94-bf3d-9d01dd919db8' and title = 'Cron: account purge, unauthorised'
        and created_at >= '2026-09-23 20:52:17+00' and created_at < '2026-09-23 20:52:18+00');

delete from public.wallet_pots
 where id = '47925737-30d4-4c5a-a54c-1c8f4c2c5fb7'
   and user_id = '957b3bd2-cce3-425d-bba9-5cd876ca3d62'
   and balance_minor = 0
   and archived_at is not null
   and not exists (select 1 from public.wallet_entries e
                    where e.metadata ->> 'pot_id' = '47925737-30d4-4c5a-a54c-1c8f4c2c5fb7');

delete from auth.sessions
 where user_id in ('957b3bd2-cce3-425d-bba9-5cd876ca3d62', '03f3dd52-ea28-4852-9abe-e5b0a67c2a43')
   and user_agent = 'node'
   and created_at >= '2026-09-23 20:10:00+00' and created_at < '2026-09-23 20:50:00+00';
