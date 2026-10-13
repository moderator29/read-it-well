-- ROLLBACK for pov08: the two submit guards switched off (disabled, not
-- removed). pov07's column and reader stay; nothing refuses without pov08.
set lock_timeout = '5s';

alter table public.agent_applications disable trigger agent_applications_03_acceptance_required;
alter table public.businesses disable trigger businesses_02_acceptance_required;
