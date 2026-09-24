/*
 * SCUML ITEM 8: A CLOSE MATCH ON COMMON NAMES IS A HIT, IN ITS OWN GROUP.
 *
 * Builds on 20260924176000 to 176400 and on builder 3's hold claims
 * (20260924173200). Nothing here touches a hold or a claim.
 *
 * For a screening duty a missed match is worse than a wrong one. The matcher
 * (apps/web/src/lib/compliance/sanctions/match.ts) no longer records a close
 * match that rests only on names common in Nigeria without raising it: it
 * raises it, marked. `sanctions_hits.common_name` carries the mark, set once
 * when the hit is raised and never edited. The desk sends it as `commonName`
 * and lists those matches after the others, in their own group ("common
 * name, check identifiers"). They are decided exactly like any other match,
 * two people, and like any other match they hold no money until a second
 * person confirms one.
 *
 * Only `common_name` is added to the match guard; everything else in it is
 * as 176400 left it (decided_at set once, status moves once).
 *
 * THE RISK HOOK (SCUML item 15). 20260924175100 left
 * `private.sanctions_hit_for` answering null ("not screened") for this desk
 * to fill. It now answers true while any match on the person is open or
 * confirmed (a common-name match included: it is a match until two people
 * clear it), false when the person has been screened and nothing is open or
 * confirmed, and null when they have never been screened.
 */

set local lock_timeout = '5s';

alter table public.sanctions_hits
  add column if not exists common_name boolean not null default false;

comment on column public.sanctions_hits.common_name is
  'SCUML item 8. A close match resting only on names common in Nigeria: raised, shown in the desk''s lower group. Set once.';

create or replace function private.sanctions_hit_status_guard()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'SCUML item 8: a match is never deleted' using errcode = 'P0001';
  end if;
  if new.status is distinct from old.status
     and not ((old.status = 'open' and new.status in ('cleared', 'confirmed'))
              or (old.status = 'confirmed' and new.status = 'released')) then
    raise exception 'SCUML item 8: a match moves open to cleared or confirmed, or confirmed to released, once' using errcode = 'P0001';
  end if;
  if new.id <> old.id or new.person_id <> old.person_id or new.entry_id <> old.entry_id
     or new.match_kind <> old.match_kind or new.score <> old.score or new.screened_name <> old.screened_name
     or new.source <> old.source or new.entry_reference <> old.entry_reference
     or new.matched_name <> old.matched_name or new.screening_id <> old.screening_id
     or new.created_at <> old.created_at or new.common_name <> old.common_name then
    raise exception 'SCUML item 8: a match is not edited' using errcode = 'P0001';
  end if;
  /* A decision's time is set once; a release is dated on its own decision row. */
  if old.decided_at is not null and new.decided_at is distinct from old.decided_at then
    raise exception 'SCUML item 8: a match is not edited (decided_at is set once)' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

/* ------------------------------------------------------------- the desk */

create or replace function public.sanctions_desk()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  v_me uuid := (select auth.uid());
begin
  if not private.compliance_staff(v_me) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  return jsonb_build_object(
    'status', 'ok',
    'me', v_me,
    'lists', coalesce((
      select jsonb_agg(jsonb_build_object('source', v.source, 'activatedAt', v.activated_at, 'entries', v.entry_count, 'origin', v.origin) order by v.source)
        from (select distinct on (source) * from public.sanctions_list_versions
               where activated_at is not null order by source, activated_at desc) v
    ), '[]'::jsonb),
    'waitingLists', coalesce((
      select jsonb_agg(jsonb_build_object('id', v.id, 'source', v.source, 'entries', v.entry_count,
                                          'previousEntries', (select o.entry_count from public.sanctions_list_versions o
                                                               where o.source = v.source and o.activated_at is not null
                                                               order by o.activated_at desc limit 1),
                                          'origin', v.origin, 'loadedBy', v.loaded_by, 'loadedAt', v.loaded_at,
                                          'proposedBy', v.activation_proposed_by) order by v.loaded_at desc)
        from public.sanctions_list_versions v
       where private.sanctions_list_waiting(v)
    ), '[]'::jsonb),
    'hits', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', h.id, 'personId', h.person_id, 'source', h.source, 'reference', h.entry_reference,
               'kind', h.match_kind, 'score', h.score, 'screenedName', h.screened_name,
               'matchedName', h.matched_name, 'createdAt', h.created_at, 'trigger', s.trigger, 'status', h.status,
               'commonName', h.common_name,
               'datesOfBirth', to_jsonb(e.dates_of_birth), 'nationalities', to_jsonb(e.nationalities),
               'delisted', exists (select 1 from public.sanctions_delisting_flags f where f.hit_id = h.id),
               'moneyHeld', exists (select 1 from public.account_money_holds m
                                     where m.user_id = h.person_id and m.hold_until > now()),
               'claims', coalesce((select jsonb_agg(jsonb_build_object('owner', c.owner, 'until', c.until) order by c.owner)
                                     from private.hold_claims c where c.user_id = h.person_id), '[]'::jsonb),
               'pending', (select jsonb_build_object('id', d.id, 'decision', d.decision, 'note', d.note,
                                                     'proposedBy', d.proposed_by, 'proposedAt', d.proposed_at)
                             from public.sanctions_hit_decisions d
                            where d.hit_id = h.id and d.approved_by is null and d.rejected_by is null))
             order by h.status = 'open' desc, h.common_name, h.match_kind = 'exact' desc, h.created_at)
        from public.sanctions_hits h
        join public.sanctions_screenings s on s.id = h.screening_id
        join public.sanctions_entries e on e.id = h.entry_id
       where h.status in ('open', 'confirmed')
    ), '[]'::jsonb),
    'recent', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.id, 'subject', r.subject_kind, 'trigger', r.trigger,
                                          'outcome', r.outcome, 'at', r.screened_at) order by r.screened_at desc)
        from (select * from public.sanctions_screenings order by screened_at desc limit 30) r
    ), '[]'::jsonb),
    'waiting', (select count(*) from public.sanctions_screen_queue where done_at is null)
  );
end;
$$;

/* ------------------------------------------------------ the risk hook */

create or replace function private.sanctions_hit_for(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_user is null then null::boolean
    when exists (select 1 from public.sanctions_hits h
                  where h.person_id = p_user and h.status in ('open', 'confirmed')) then true
    when exists (select 1 from public.sanctions_screenings s
                  where s.person_id = p_user and s.outcome in ('clear', 'exact', 'fuzzy')) then false
    else null::boolean
  end;
$$;
revoke all on function private.sanctions_hit_for(uuid) from public, anon, authenticated;

/* Readback: the table stays locked, the desk stays staff-only. */
do $$
begin
  if has_table_privilege('authenticated', 'public.sanctions_hits', 'SELECT, INSERT, UPDATE, DELETE')
     or has_table_privilege('anon', 'public.sanctions_hits', 'SELECT, INSERT, UPDATE, DELETE') then
    raise exception 'SCUML item 8: sanctions_hits is readable by a member';
  end if;
  if has_function_privilege('anon', 'public.sanctions_desk()', 'EXECUTE') then
    raise exception 'SCUML item 8: sanctions_desk is callable signed out';
  end if;
  if has_function_privilege('authenticated', 'private.sanctions_hit_for(uuid)', 'EXECUTE') then
    raise exception 'SCUML item 15: the sanctions hook is callable by a member';
  end if;
end
$$;
