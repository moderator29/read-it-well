set lock_timeout = '5s';

update public.feature_flags
   set enabled = false,
       note = 'Off: booking a table is free (HANDOFF section 2). Turn on only on a founder ruling that settles DECISIONS open conflict 2.',
       updated_at = now()
 where key = 'restaurant_deposits'
   and enabled;
