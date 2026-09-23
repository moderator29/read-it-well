-- ONE FACT PER PARTY WAS ALSO SAYING ONE FILE PER PARTY.
--
-- `escrow_evidence_one_fact_per_party` shipped as
--
--   unique nulls not distinct (escrow_id, author_id, fact)
--
-- and the name says what it was written for: a party may not file the same
-- fact twice, because that is a double tap and not a second piece of evidence.
--
-- A FILE ROW HAS `fact = null`. `nulls not distinct` makes two nulls EQUAL, so
-- the same constraint also said: a party may file exactly ONE FILE, ever, per
-- agreement. The second one came back `duplicate`, which the product renders
-- as "You have already filed that, so nothing was added twice." to somebody
-- who has just uploaded a different photograph.
--
-- Nothing could see this before now. The server action, the bucket, the check
-- constraints and the append-only trigger all shipped on 22 September with no
-- client that could pick a file, so no second file was ever filed. It was
-- proved on this database by `scripts/probes/escrow_evidence_two_files.sql`,
-- in a transaction that rolled back, before this migration was written.
--
-- THE FIX IS TO SAY WHAT WAS MEANT: the uniqueness applies to FACTS. A partial
-- unique index carries the `where`, and inside it `fact` is already `not null`
-- by the `escrow_evidence_fact_is_a_fact` check constraint, so null semantics
-- stop mattering entirely rather than being relied on in the other direction.
--
-- FILES ARE DELIBERATELY NOT UNIQUE ON ANYTHING. Two photographs of the same
-- door on two days are two pieces of evidence, and a person who uploads the
-- same receipt twice has made a tidy mistake, not filed a false claim. The
-- append-only trigger means neither can be taken back, which is the property
-- that matters on a dispute.

alter table public.escrow_evidence
  drop constraint if exists escrow_evidence_one_fact_per_party;

create unique index if not exists escrow_evidence_one_fact_per_party
  on public.escrow_evidence (escrow_id, author_id, fact)
  where kind = 'fact';

comment on index public.escrow_evidence_one_fact_per_party is
  'A party may state a given fact once. Files are not unique on anything: two photographs are two pieces of evidence.';

-- READ BACK, INSIDE THE MIGRATION, because a migration that asserts nothing is
-- a migration that can be quietly reverted by the next one.
do $readback$
declare
  is_unique boolean;
  is_partial boolean;
  still_a_constraint boolean;
begin
  select i.indisunique, i.indpred is not null
    into is_unique, is_partial
  from pg_index i
  where i.indexrelid = 'public.escrow_evidence_one_fact_per_party'::regclass;

  if is_unique is null then
    raise exception 'READ BACK FAILED: the index does not exist';
  end if;
  if not is_unique then
    raise exception 'READ BACK FAILED: the index is not unique, so a party could state one fact twice';
  end if;
  if not is_partial then
    raise exception 'READ BACK FAILED: the index is not partial, so it still speaks for files as well as facts';
  end if;

  select exists (
    select 1 from pg_constraint
    where conrelid = 'public.escrow_evidence'::regclass
      and conname = 'escrow_evidence_one_fact_per_party'
  ) into still_a_constraint;
  if still_a_constraint then
    raise exception 'READ BACK FAILED: the old table constraint survived and still equates two nulls';
  end if;
end
$readback$;
