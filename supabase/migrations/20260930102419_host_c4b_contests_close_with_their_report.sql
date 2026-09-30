-- HOST C4b: A REVIEW CONTEST CLOSES WITH ITS REPORT (30 September 2026).
-- Applied 30 September 2026 with the founder's approval. Written by the host
-- build team; split out of the held
-- 20260930160000 file at the lead's request (the C4b half was approved as
-- written). Idempotent. Widens one CHECK, adds one function and one trigger;
-- no row is changed, no column dropped.
--
-- WHY. A contest's report can be resolved on the Reports lane without
-- `decide_review_contest` (a moderator closing the report directly). The
-- contest then stayed "open" for ever. Now a trigger on `reports` closes the
-- contest when its linked report is resolved or dismissed (as KEPT: the review
-- stays, because hiding is only ever the explicit `decide_review_contest` with
-- its public note) or withdrawn (as WITHDRAWN), and tells the lister.
-- `decide_review_contest` closes the contest first, so the trigger then finds
-- nothing open and does nothing.

alter table public.review_contests drop constraint if exists review_contests_status_chk;
alter table public.review_contests add constraint review_contests_status_chk
  check (status in ('open', 'kept', 'hidden', 'withdrawn'));

create or replace function private.close_contest_with_its_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  c     public.review_contests%rowtype;
  title text;
begin
  if new.status is not distinct from old.status or new.status not in ('resolved', 'dismissed', 'withdrawn') then
    return null;
  end if;
  select * into c from public.review_contests where report_id = new.id and status = 'open' for update;
  if c.id is null then return null; end if;

  update public.review_contests
     set status = case when new.status = 'withdrawn' then 'withdrawn' else 'kept' end,
         decided_by = coalesce(new.resolved_by, (select auth.uid())),
         decided_at = now()
   where id = c.id;

  if new.status <> 'withdrawn' then
    select coalesce(l.title, ac.name) into title from public.reviews r
      left join public.listings l on l.id = r.listing_id
      left join public.accommodations ac on ac.id = r.accommodation_id
     where r.id = c.review_id;
    perform private.notify(c.lister_id, 'listing'::public.notification_kind,
      'We looked at the review and kept it',
      'The review of ' || coalesce(title, 'your place') || ' meets the review standards, so it stays up. You can still answer it publicly.',
      '/host/reviews');
  end if;
  return null;
end;
$function$;
revoke all on function private.close_contest_with_its_report() from public, anon, authenticated;
drop trigger if exists reports_close_review_contest on public.reports;
create trigger reports_close_review_contest after update of status on public.reports
  for each row execute function private.close_contest_with_its_report();

-- ------------------------------------------------------------ read-back
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'reports_close_review_contest' and tgrelid = 'public.reports'::regclass) then
    raise exception 'host c4b: the contest-closing trigger is missing';
  end if;
  if not exists (select 1 from pg_constraint where conname = 'review_contests_status_chk'
                   and pg_get_constraintdef(oid) like '%withdrawn%') then
    raise exception 'host c4b: review_contests cannot be withdrawn';
  end if;
  if has_function_privilege('authenticated', 'private.close_contest_with_its_report()', 'execute') then
    raise exception 'host c4b: the trigger function is open to members';
  end if;
end $$;
