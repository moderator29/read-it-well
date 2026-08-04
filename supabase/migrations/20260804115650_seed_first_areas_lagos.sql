-- The first places, so Around is not a directory of nothing.
--
-- The audit found zero rows in public.areas, which meant posts_insert_self
-- could never pass its ACTIVE-area test, so nobody could post anywhere. The
-- only route to an ACTIVE area is an admin decision, and there is no admin
-- until somebody signs up, so the product had a bootstrap deadlock.
--
-- Lagos only, and five areas inside it. The reasoning is in
-- docs/SOCIAL_DESIGN.md section 12: moderation is a staffing question, not an
-- engineering one, and a place nobody is watching becomes the platform's
-- reputation. Opening six cities on day one would be a decision to not watch
-- most of them.
--
-- Every one starts in slow_mode. created_by is null because nobody proposed
-- these: they are ours, and the column should say so rather than crediting an
-- arbitrary admin.

insert into public.areas (slug, kind, name, state_code, city, area, blurb, status, slow_mode, opened_at, created_at)
values
  ('yaba-lagos', 'AREA', 'Yaba', 'LA', 'Lagos', 'Yaba',
   'Sabo, Alagomeji, Herbert Macaulay, and the students who keep it awake.',
   'ACTIVE', true, now(), now()),
  ('lekki-phase-1-lagos', 'AREA', 'Lekki Phase 1', 'LA', 'Lagos', 'Lekki Phase 1',
   'Admiralty Way and the estates behind it.',
   'ACTIVE', true, now(), now()),
  ('surulere-lagos', 'AREA', 'Surulere', 'LA', 'Lagos', 'Surulere',
   'Bode Thomas, Adeniran Ogunsanya, and the National Stadium.',
   'ACTIVE', true, now(), now()),
  ('ikeja-gra-lagos', 'AREA', 'Ikeja GRA', 'LA', 'Lagos', 'Ikeja GRA',
   'Quiet streets, close to the airport and to the state secretariat.',
   'ACTIVE', true, now(), now()),
  ('yaba-unilag', 'CAMPUS', 'UNILAG', 'LA', 'Lagos', 'Akoka',
   'The university and the streets around Akoka that live off it.',
   'ACTIVE', true, now(), now())
on conflict (slug) do nothing;
