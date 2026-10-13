set lock_timeout = '5s';

-- Vallo has no wallet (custody retired 25 September 2026). A refund goes back
-- to the card or account that paid. One stored summary still said "wallet".
update public.cancellation_policies
   set summary = 'Cancel free of charge up to 48 hours before check-in. Inside 48 hours the first night is kept and the rest is refunded to the card or account you paid with.',
       updated_at = now()
 where id = 'ef000000-0000-4000-8000-000000000001'
   and summary ilike '%wallet%';
