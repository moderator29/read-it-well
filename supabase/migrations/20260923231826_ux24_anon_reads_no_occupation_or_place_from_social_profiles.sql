-- UX-24: a member's occupation, local government, state and home area are
-- not for a signed-out caller. Every app read of social_profiles runs signed
-- in (the proxy gates every product route), so anon keeps only the display
-- columns. Postgres cannot subtract columns from a table-level grant, so the
-- table SELECT is replaced by a column list. A column added to the table later
-- is not readable by anon until it is granted here.
revoke select on public.social_profiles from anon;
grant select (user_id, handle, bio, bio_status, pronouns, link, banner_path,
  contact_policy, pidgin_ok, handle_claimed_at, created_at, updated_at,
  follower_count, following_count, post_count, cover_path, display_label,
  avatar_path, is_agent, agent_id)
  on public.social_profiles to anon;
