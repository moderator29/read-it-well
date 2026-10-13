-- Applied 13 October 2026. A reviewer never decides their own business, their own property, or a verification rung on their own business.
set lock_timeout = '5s';
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
