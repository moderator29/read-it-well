-- The security linter flags `platform_stats()` as executable by anon. It is,
-- and that is the design. A comment rather than a change, so the next person to
-- read the advisory finds the reasoning instead of assuming an oversight.
comment on function public.platform_stats() is
  'Publishable platform counts for the landing page: PUBLISHED listings, the distinct cities and states they sit in, and APPROVED agents. Executable by anon BY DESIGN, and flagged by the security linter for exactly that reason. It returns four integers and never a row, and every one of them aggregates rows an anonymous visitor can already read one at a time through the catalogue, so it discloses nothing the search page does not. Security definer so the counts do not require granting anon a read over anything.';
