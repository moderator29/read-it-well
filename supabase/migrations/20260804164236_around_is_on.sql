-- The owner turned Around on.
--
-- It shipped off two hours ago, deliberately: a switch that ships on is a
-- switch nobody has ever tested in the off position, and the layer had not been
-- exercised against a real database. It has been now, and the decision is the
-- owner's.
--
-- This row is the whole kill switch. Setting `enabled = false` here takes every
-- social surface and every social write path down at once, with no deploy, and
-- `apps/web/src/lib/social/flag.ts` is what reads it.
update public.feature_flags
   set enabled = true,
       note = 'Around: places, posts, stories, follows. ON. Set enabled = false here to take the whole layer down without a deploy.'
 where key = 'social';
