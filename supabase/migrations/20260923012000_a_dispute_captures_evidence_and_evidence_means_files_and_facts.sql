/*
 * THE DISPUTE, AND ITS EVIDENCE. Research file 4.8 and 5.2.
 *
 * Today a dispute is one free text field called `dispute_reason` on the escrow
 * row. That is a complaint, not evidence. Two people write two paragraphs, an
 * operator reads both, and there is nothing in the record that either of them
 * could not have invented ten minutes ago.
 *
 * EVIDENCE MEANS FILES AND FACTS. NOT OPINIONS.
 *
 *   A FILE is a receipt, a photograph, a screenshot of a message thread, a
 *   signed agreement. It carries its own date and its own uploader and it is
 *   append-only, so the version the operator reads is the version that was
 *   filed.
 *
 *   A FACT is one of a fixed list of things that either happened or did not:
 *   a viewing was attended, keys were handed over, an agreement was signed, a
 *   service was delivered, somebody was contacted on a date. It carries a date
 *   or an amount where one applies and nothing else. It cannot be argued with,
 *   only agreed or contradicted, and where the two parties contradict each
 *   other on the same fact the operator can see that at a glance instead of
 *   reading two essays.
 *
 *   AN OPINION IS NOT EVIDENCE and there is nowhere to put one. The caption on
 *   a file is capped at 200 characters and its label in the product asks what
 *   the file SHOWS. `dispute_reason` on the escrow row keeps its one statement
 *   of what the person says went wrong; everything filed after that is a file
 *   or a fact.
 *
 * APPEND ONLY, AND ENFORCED BY A TRIGGER RATHER THAN BY POLICY. RLS can be
 * satisfied by a service role that bypasses it, and every escrow write on this
 * platform runs as the service role, so a policy alone would protect nothing
 * from the code that actually writes. The trigger refuses an update or a
 * delete from anybody, including the owner.
 *
 * RULE 21. The append function is SECURITY DEFINER and is revoked from anon
 * and authenticated here, and the grants are read back at the end.
 */

create type public.escrow_evidence_kind as enum ('file', 'fact');

create type public.escrow_fact as enum (
  /* The viewing. */
  'viewing_attended',
  'viewing_missed',
  /* The handover. */
  'keys_received',
  'keys_not_received',
  /* The paperwork. */
  'agreement_signed',
  'agreement_not_signed',
  /* The service the fee was for. */
  'service_delivered',
  'service_not_delivered',
  /* The property. */
  'property_matched_listing',
  'property_differed_from_listing',
  /* Getting hold of the other side. */
  'contacted_on',
  'no_reply_since',
  /* What was agreed, in kobo. */
  'amount_agreed'
);

comment on type public.escrow_fact is
  'The closed list of things a party may assert in a dispute. Each one either happened or did not. There is deliberately no other value and no free text beside them.';

create table public.escrow_evidence (
  id            uuid primary key default gen_random_uuid(),
  escrow_id     uuid not null references public.escrows (id) on delete cascade,
  author_id     uuid not null references auth.users (id) on delete restrict,
  kind          public.escrow_evidence_kind not null,

  /* kind = 'fact' */
  fact          public.escrow_fact,
  happened_on   date,
  amount_minor  bigint check (amount_minor is null or amount_minor > 0),

  /* kind = 'file' */
  storage_path  text,
  file_name     text,
  mime_type     text,
  size_bytes    integer check (size_bytes is null or size_bytes > 0),

  /* What the file shows. Never an argument, and short enough that it cannot
     become one. */
  caption       text check (caption is null or char_length(btrim(caption)) between 1 and 200),

  created_at    timestamptz not null default now(),

  constraint escrow_evidence_fact_is_a_fact check (
    kind <> 'fact' or (fact is not null and storage_path is null)
  ),
  constraint escrow_evidence_file_is_a_file check (
    kind <> 'file' or (
      fact is null
      and storage_path is not null and char_length(btrim(storage_path)) > 0
      and file_name is not null and char_length(btrim(file_name)) > 0
      and mime_type is not null
    )
  ),
  /* A date-shaped fact needs its date and a money-shaped fact needs its
     amount. Anything else must carry neither, so a bare assertion cannot
     smuggle a number in beside it. */
  constraint escrow_evidence_fact_carries_what_it_needs check (
    kind <> 'fact' or (
      case
        when fact in ('viewing_attended', 'viewing_missed', 'contacted_on', 'no_reply_since')
          then happened_on is not null and amount_minor is null
        when fact = 'amount_agreed'
          then amount_minor is not null and happened_on is null
        else amount_minor is null
      end
    )
  ),
  /* One party may not file the same fact twice and pad the pile with it. */
  constraint escrow_evidence_one_fact_per_party
    unique nulls not distinct (escrow_id, author_id, fact)
);

comment on table public.escrow_evidence is
  'Append-only evidence on an escrow dispute. A row is a file or one of a closed list of facts. There is nowhere in it to put an opinion.';

create index escrow_evidence_escrow_idx on public.escrow_evidence (escrow_id, created_at);

alter table public.escrow_evidence enable row level security;

/*
 * Either party reads the whole file, including the other side's. A dispute
 * where one party cannot see what has been filed against them is not a
 * process, and a surprise at the ruling is how an operator ends up arguing
 * with somebody who feels ambushed. An admin reads it because an admin rules
 * on it. A third party reads nothing.
 */
create policy escrow_evidence_select_party
  on public.escrow_evidence
  for select
  using (
    exists (
      select 1 from public.escrows e
       where e.id = escrow_evidence.escrow_id
         and ((select auth.uid()) = e.payer_id or (select auth.uid()) = e.payee_id)
    )
  );

create policy escrow_evidence_select_admin
  on public.escrow_evidence
  for select
  using (
    private.has_role((select auth.uid()), 'admin')
    or private.has_role((select auth.uid()), 'super_admin')
  );

/* No insert, update or delete policy for any role. Writes go through the
   function below, as the service role, behind a server action. */

create or replace function private.escrow_evidence_is_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'Evidence cannot be changed or withdrawn once it is filed. File a correction instead.'
    using errcode = 'check_violation';
end;
$$;

create trigger escrow_evidence_no_update
  before update or delete on public.escrow_evidence
  for each row execute function private.escrow_evidence_is_append_only();

-- ---------------------------------------------------------------------------
-- The one door in.
-- ---------------------------------------------------------------------------

create or replace function public.escrow_file_evidence_as(
  p_actor uuid,
  p_escrow uuid,
  p_kind public.escrow_evidence_kind,
  p_fact public.escrow_fact default null,
  p_happened_on date default null,
  p_amount_minor bigint default null,
  p_storage_path text default null,
  p_file_name text default null,
  p_mime_type text default null,
  p_size_bytes integer default null,
  p_caption text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.escrows;
  new_id uuid;
begin
  if p_actor is null then
    return jsonb_build_object('status', 'signed_out');
  end if;
  if p_escrow is null or p_kind is null then
    return jsonb_build_object('status', 'bad_request');
  end if;

  select * into e from public.escrows where id = p_escrow;
  if e.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if p_actor <> e.payer_id and p_actor <> e.payee_id then
    return jsonb_build_object('status', 'not_a_party');
  end if;

  /*
   * EVIDENCE BELONGS TO A LIVE QUESTION. Once an agreement has settled the
   * question is answered and the file is closed; filing then would be filing
   * against a decision, which is an appeal and not evidence.
   */
  if e.state not in ('HELD', 'RELEASE_REQUESTED', 'DISPUTED') then
    return jsonb_build_object('status', 'not_open', 'state', e.state);
  end if;

  begin
    insert into public.escrow_evidence (
      escrow_id, author_id, kind, fact, happened_on, amount_minor,
      storage_path, file_name, mime_type, size_bytes, caption
    ) values (
      p_escrow, p_actor, p_kind, p_fact, p_happened_on, p_amount_minor,
      p_storage_path, p_file_name, p_mime_type, p_size_bytes,
      nullif(btrim(coalesce(p_caption, '')), '')
    )
    returning id into new_id;
  exception
    when unique_violation then
      /* The same party filing the same fact twice is a double tap, not a
         second piece of evidence. */
      return jsonb_build_object('status', 'duplicate');
    when check_violation then
      return jsonb_build_object('status', 'bad_request');
  end;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (p_actor, 'escrow.evidence.filed', 'escrow', p_escrow::text,
          jsonb_build_object('evidence_id', new_id, 'kind', p_kind, 'fact', p_fact));

  perform private.notify(
    case when p_actor = e.payer_id then e.payee_id else e.payer_id end,
    'wallet',
    'New evidence was filed',
    'The other side has added something to the held payment you are both part of.',
    '/escrow/' || e.id::text
  );

  return jsonb_build_object('status', 'ok', 'evidence_id', new_id, 'escrow_id', e.id);
end;
$$;

-- ---------------------------------------------------------------------------
-- The private bucket the files land in.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'escrow-evidence', 'escrow-evidence', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- RULE 21, read back.
-- ---------------------------------------------------------------------------

revoke all on function public.escrow_file_evidence_as(uuid, uuid, public.escrow_evidence_kind, public.escrow_fact, date, bigint, text, text, text, integer, text) from public, anon, authenticated;
revoke all on function private.escrow_evidence_is_append_only() from public, anon, authenticated;
grant execute on function public.escrow_file_evidence_as(uuid, uuid, public.escrow_evidence_kind, public.escrow_fact, date, bigint, text, text, text, integer, text) to service_role;
revoke all on table public.escrow_evidence from anon;

do $$
declare leak text;
begin
  select string_agg(p.oid::regprocedure::text || ' -> ' || r.rolname, ', ') into leak
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    cross join (values ('anon'), ('authenticated')) as r(rolname)
   where ((n.nspname = 'public' and p.proname = 'escrow_file_evidence_as')
       or (n.nspname = 'private' and p.proname = 'escrow_evidence_is_append_only'))
     and has_function_privilege(r.rolname, p.oid, 'EXECUTE');
  if leak is not null then
    raise exception 'RULE 21 VIOLATED: %', leak;
  end if;

  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname = 'escrow_evidence' and c.relrowsecurity
  ) then
    raise exception 'escrow_evidence shipped without row level security';
  end if;
end;
$$;
