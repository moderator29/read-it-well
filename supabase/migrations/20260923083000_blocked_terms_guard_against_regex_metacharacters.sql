-- A STRAY BRACKET IN ONE TERM WOULD SILENTLY DISABLE THE FILTER FOR EVERYTHING.
--
-- private.objectionable_pattern() builds its regular expression by joining
-- every row with `|` inside `\m(...)\M`. So a term containing ( ) | [ ] * + ?
-- or a backslash does not merely fail to match itself: it changes the meaning
-- of the WHOLE pattern, and an unbalanced bracket makes it invalid, at which
-- point `~*` raises and private.scan_post() throws on every post reaching the
-- abuse branch.
--
-- One careless paste into a moderation list, and either the filter quietly
-- matches nothing or every post errors, with nothing anywhere naming the cause.
--
-- Not a content decision, which is why it lands ahead of the term list itself.
-- Same class as rule 21: make the dangerous thing impossible rather than
-- remembering not to do it.
--
-- Allowed: letters in any script, digits, spaces, apostrophes, hyphens. That
-- covers English, Pidgin and the three Nigerian languages with their
-- diacritics, and the multi-word scam phrases that are the list's best half.
-- Proved by a rolled-back probe: `pay me|direct` and `(unbalanced` refused;
-- `pay into my personal account`, `omo onile` and `ile ti ko ni iwe` accepted.

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.blocked_terms'::regclass
      and conname  = 'blocked_terms_no_regex_metacharacters'
  ) then
    alter table public.blocked_terms
      add constraint blocked_terms_no_regex_metacharacters
      check (
        term = btrim(term)
        and length(term) between 2 and 100
        and term !~ '[(){}\[\]|*+?^$\\.]'
      );
  end if;
end
$$;

comment on constraint blocked_terms_no_regex_metacharacters on public.blocked_terms is
  'private.objectionable_pattern() joins every term into one regular expression, so a metacharacter in any single term changes or breaks the pattern for EVERY post. Letters, digits, spaces, apostrophes and hyphens only.';
