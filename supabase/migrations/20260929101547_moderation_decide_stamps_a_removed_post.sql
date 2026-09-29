-- moderation_decide is now the one path the Held lane decides through, for
-- admins and for staff holding the moderation scope alike (the console used to
-- write the rows itself, admins only, and never called this). The console's
-- own path stamped removed_at on a removed post; this function did so for a
-- story only. The post branch now stamps it too, so nothing is lost in the
-- switch. Nothing else in the body changes.
do $$
declare
  def text := pg_get_functiondef('public.moderation_decide(text,uuid,text,text)'::regprocedure);
  anchor text := 'hidden_by = case when p_decision = ''REMOVE'' then actor end
     where id = p_id and status = ''HELD''::public.social_status;';
begin
  if position(anchor in def) = 0 then
    raise exception 'moderation_decide: post branch not found';
  end if;
  execute overlay(def placing 'hidden_by = case when p_decision = ''REMOVE'' then actor end,
           removed_at = case when p_decision = ''REMOVE'' then now() else removed_at end
     where id = p_id and status = ''HELD''::public.social_status;'
    from position(anchor in def) for length(anchor));
  if (select count(*) from regexp_matches(pg_get_functiondef('public.moderation_decide(text,uuid,text,text)'::regprocedure),
       'removed_at = case when p_decision', 'g')) <> 2 then
    raise exception 'moderation_decide: expected removed_at on post and story';
  end if;
end $$;
