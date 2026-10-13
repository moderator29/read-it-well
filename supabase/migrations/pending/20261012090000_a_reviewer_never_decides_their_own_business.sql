-- PENDING, NOT APPLIED. A reviewer never decides their own business, their
-- own property, or a verification rung on their own business.
--
-- WHY. `private.refuse_self_review` (20260929093746, public-repo hardening
-- round 1) refuses a reviewer deciding their own listing or agent
-- application, on the write itself, whoever the caller is. The host spine was
-- never added to it, and `private.guard_owner_write` lets any admin through
-- untouched. So an admin who also owns a hotel, a shortlet or a restaurant
-- could approve their own application (`businesses.reviewer_id`), publish
-- their own property (`accommodations.reviewer_id`) and pass their own
-- identity rung (`business_verification_checks.reviewer_id`), which is the
-- one write that lights the verified mark. The app refuses all four in
-- `apps/web/src/lib/admin/business-actions.ts`; this is the database's half,
-- so a desk or a script that forgets to ask cannot do it either.
--
-- WHAT IT CHANGES. One trigger function and three triggers. No column, grant
-- or policy changes, and rows decided before it is applied are left alone.
-- It contains no DROP: the triggers are created with CREATE OR REPLACE.
--
-- WHAT COUNTS AS A DECISION, as in `private.refuse_self_review`: the moment a
-- reviewer's id or decision time is written. Status alone moving (an owner
-- resubmitting, a purge clearing a reviewer) is not a decision.
--
-- PROBE AFTER APPLYING, as the real role: an admin who owns a business
-- updating its `reviewer_id` to themselves must fail with 42501, and the
-- same admin deciding a business somebody else owns must succeed.

create or replace function private.refuse_self_review_host()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  subject uuid;
begin
  if new.reviewer_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if tg_table_name = 'business_verification_checks' then
      if new.reviewer_id is not distinct from old.reviewer_id
         and new.decided_at is not distinct from old.decided_at then
        return new;
      end if;
    elsif new.reviewer_id is not distinct from old.reviewer_id
          and new.reviewed_at is not distinct from old.reviewed_at then
      return new;
    end if;
  end if;

  if tg_table_name = 'businesses' then
    subject := new.owner_id;
  else
    -- accommodations and business_verification_checks both name their
    -- business, and ownership lives on the business row.
    select b.owner_id into subject from public.businesses b where b.id = new.business_id;
  end if;

  if subject is not null and subject = new.reviewer_id then
    raise exception 'Nobody reviews their own business. Leave it for another reviewer.'
      using errcode = '42501';
  end if;
  return new;
end;
$function$;

revoke all on function private.refuse_self_review_host() from public, anon, authenticated;

create or replace trigger businesses_01_no_self_review
  before update of reviewer_id, reviewed_at on public.businesses
  for each row execute function private.refuse_self_review_host();

create or replace trigger accommodations_01_no_self_review
  before update of reviewer_id, reviewed_at on public.accommodations
  for each row execute function private.refuse_self_review_host();

create or replace trigger business_verification_checks_01_no_self_review
  before insert or update of reviewer_id, decided_at on public.business_verification_checks
  for each row execute function private.refuse_self_review_host();
