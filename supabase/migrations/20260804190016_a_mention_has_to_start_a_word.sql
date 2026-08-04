-- An email address in a post was notifying a stranger and quoting the payment
-- ask at them.
--
-- `private.fan_out_post` and `private.notify_story_event` both matched
-- `@handle` with nothing in front of it, so `send it to ade@probestranger.example`
-- produced a notification to `@probestranger` titled "You were mentioned", with
-- the body quoted back at them. That is bad twice over. The person named never
-- had anything to do with the post, and an email address is the single most
-- likely place an `@` appears in a payment ask, which is exactly the text the
-- scanner exists to catch. We would have been delivering it.
--
-- The client already got this right. `findMentions` in `mentions-schema.ts`
-- refuses a match whose preceding character is a word character or a second
-- `@`, so the renderer would not have linked what the database was notifying
-- about. Client and database disagreeing on what a mention IS is worse than
-- either rule alone, because the surface looks correct while the notification
-- is wrong.
--
-- `(^|[^A-Za-z0-9_@])` is that rule as a Postgres character class, and it has to
-- be a captured alternation rather than a lookbehind, which Postgres does not
-- have. The handle is now group 2. A consumed leading character cannot swallow
-- an adjacent mention: `@one @two` still matches both, because the space
-- between them is what the second match consumes.
--
-- Proven on the live database against thirteen bodies, old pattern beside new:
--
--   send it to ade@probestranger.example   was {probestranger}   now {}
--   pay me at ade@bola_stores.com today    was {bola_stores}     now {}
--   email: one@two.com but also @real_person
--                                          was {two,real_person} now {real_person}
--   @one@two chained                       was {one,two}         now {one}
--   @aduke_from_yaba have you seen this    was {aduke_from_yaba} now {aduke_from_yaba}
--   thanks @aduke_from_yaba and @chidi_realty                    now both
--   (@bracketed_one) and [@bracketed_two]                        now both
--   email me at me@me.com                  was {}                now {}

create or replace function private.fan_out_post(p_post public.posts)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  parent_author uuid;
  who           text;
  named         text;
  named_id      uuid;
  sent          integer := 0;
  thread        uuid;
begin
  if p_post.author_id is null or p_post.status <> 'LIVE' then return; end if;

  who    := private.social_handle(p_post.author_id);
  thread := coalesce(p_post.root_id, p_post.id);

  if p_post.parent_id is not null then
    select author_id into parent_author from public.posts where id = p_post.parent_id;

    perform private.notify_social(
      parent_author,
      p_post.author_id,
      'New reply',
      coalesce('@' || who, 'Somebody') || ' replied: ' ||
        left(coalesce(nullif(btrim(p_post.body), ''), 'they answered you'), 120),
      '/post/' || thread
    );
  end if;

  /*
   * A mention has to START A WORD. The leading group is the same rule
   * `findMentions` applies on the client, and the handle is group 2.
   */
  for named in
    select distinct lower(tok[2])
      from regexp_matches(coalesce(p_post.body, ''),
                          '(^|[^A-Za-z0-9_@])@([a-z][a-z0-9_]{2,19})', 'gi') as m(tok)
  loop
    exit when sent >= 5;

    select user_id into named_id from public.social_profiles where handle = named;
    if named_id is null or named_id = parent_author then continue; end if;

    perform private.notify_social(
      named_id,
      p_post.author_id,
      'You were mentioned',
      coalesce('@' || who, 'Somebody') || ' mentioned you: ' ||
        left(coalesce(nullif(btrim(p_post.body), ''), 'in a post'), 120),
      '/post/' || thread
    );
    sent := sent + 1;
  end loop;
end;
$fn$;

revoke execute on function private.fan_out_post(public.posts) from public, anon, authenticated;

create or replace function private.notify_story_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  s        public.stories;
  who      text;
  parent   uuid;
  named    text;
  named_id uuid;
  sent     integer := 0;
begin
  if tg_table_name = 'story_reactions' then
    if new.mark <> 'LIKE' then return new; end if;
    select * into s from public.stories where id = new.story_id;
    if s.author_id is null or s.status <> 'LIVE' then return new; end if;
    who := private.social_handle(new.user_id);
    perform private.notify_social(s.author_id, new.user_id, 'Somebody liked your story',
      coalesce('@' || who, 'Somebody') || ' liked ' || left(s.headline, 100),
      '/stories/' || s.id);
    return new;
  end if;

  if new.status <> 'LIVE' then return new; end if;

  select * into s from public.stories where id = new.story_id;
  who := private.social_handle(new.author_id);

  perform private.notify_social(s.author_id, new.author_id, 'New comment on your story',
    coalesce('@' || who, 'Somebody') || ' said: ' || left(new.body, 120),
    '/stories/' || s.id);

  if new.parent_id is not null then
    select author_id into parent from public.story_comments where id = new.parent_id;
    /* Not the story's author twice for the same event. */
    if parent is distinct from s.author_id then
      perform private.notify_social(parent, new.author_id, 'New reply',
        coalesce('@' || who, 'Somebody') || ' replied: ' || left(new.body, 120),
        '/stories/' || s.id);
    end if;
  end if;

  /* Same rule as posts and as the client: a mention has to start a word. */
  for named in
    select distinct lower(tok[2])
      from regexp_matches(coalesce(new.body, ''),
                          '(^|[^A-Za-z0-9_@])@([a-z][a-z0-9_]{2,19})', 'gi') as m(tok)
  loop
    exit when sent >= 5;
    select user_id into named_id from public.social_profiles where handle = named;
    if named_id is null or named_id = parent or named_id = s.author_id then continue; end if;

    perform private.notify_social(named_id, new.author_id, 'You were mentioned',
      coalesce('@' || who, 'Somebody') || ' mentioned you: ' || left(new.body, 120),
      '/stories/' || s.id);
    sent := sent + 1;
  end loop;

  return new;
end;
$fn$;

revoke execute on function private.notify_story_event() from public, anon, authenticated;
