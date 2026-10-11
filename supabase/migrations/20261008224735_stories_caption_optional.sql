-- STORIES: THE CAPTION IS OPTIONAL (founder, 8 October 2026: "make it able to
-- post without even caption ... no matter how short even if it's just T").
-- The picture is the story. A headline of any length from none to 120
-- characters is accepted; the 120 ceiling stays. Applied live 8 October 2026.
set local lock_timeout = '5s';
alter table public.stories drop constraint if exists stories_headline_check;
alter table public.stories add constraint stories_headline_check
  check (length(btrim(headline)) <= 120);
