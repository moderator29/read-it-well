-- A badge that was awarded to the example account, and the rule that stops it
-- happening again.
--
-- HOW IT HAPPENED, recorded because it is the whole argument for doing this at
-- the database rather than in a checklist. While verifying that the trust
-- constraints actually refuse what they claim to refuse, a temporary example
-- listing was inserted, checked and deleted. That insert happened BEFORE the
-- badge suppression was applied, so `private.award_listing_badges` fired and
-- granted `first_listing` to the example account, with a notification. The
-- listing was deleted a second later. THE BADGE WAS NOT: badges do not cascade
-- from listings, so it outlived the row that earned it by a whole minute and
-- would have outlived it forever.
--
-- So: a trust signal was attached to the platform's example account, by an
-- automated trigger, from a row that no longer exists, during the very work
-- whose purpose was to prevent exactly that. A convention would not have caught
-- it. The cleanup is below, and so is the structural rule.

-- 1. Mark the lister, so the rule can be written about a property of the row
--    rather than about a hardcoded identifier. `agents.is_demo` mirrors
--    `listings.is_demo` and gives the read path one clean question to ask about
--    who is offering a property.
alter table public.agents
  add column is_demo boolean not null default false;

comment on column public.agents.is_demo is
  'True for the platform''s own example lister. Such an account holds only '
  'example inventory, cannot be signed into, and can never hold a badge or a '
  'verification tier.';

update public.agents
   set is_demo = true
 where id = 'e0000000-0000-4000-8000-000000000002';

-- An example lister may never be verified, in either of the two ways that is
-- expressed. The listings-side trigger already refuses an example listing
-- attached to a verified lister; this refuses the lister ever becoming verified
-- while holding that inventory, which is the same rule approached from the
-- other end.
alter table public.agents
  add constraint agents_demo_is_never_verified check (
    is_demo = false or (verified = false and verification_tier = 0)
  );

-- 2. Remove the badge and the notification it raised. Deleted rather than
--    revoked: a revocation is the record of something earned and withdrawn,
--    and this was never earned.
delete from public.notifications
 where user_id = 'e0000000-0000-4000-8000-000000000001';

delete from public.user_badges
 where user_id = 'e0000000-0000-4000-8000-000000000001';

-- 3. The structural rule. A badge is a trust signal and the example account
--    exists to hold inventory that carries none.
create or replace function public.refuse_badge_for_example_lister()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if exists (
    select 1 from public.agents a
     where a.user_id = new.user_id and a.is_demo
  ) then
    raise exception
      'The example lister holds no badges. Badge % was refused for user %.', new.badge_code, new.user_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger user_badges_never_for_the_example_lister
  before insert or update of user_id, badge_code on public.user_badges
  for each row execute function public.refuse_badge_for_example_lister();
