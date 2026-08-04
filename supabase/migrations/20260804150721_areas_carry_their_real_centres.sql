-- A place on the home screen has to be somewhere.
--
-- The home overview draws the city as a dark card with a lit pin for every
-- open place inside it. A pin needs a position, and every seeded area had
-- centre_lat and centre_lng null, which left two choices: scatter the pins by
-- a hash of the slug and hope nobody notices that Lekki is north of Ikeja, or
-- put the real coordinates in. Inventing a position for a real place is the
-- kind of small lie that gets believed, so these are the real ones, to four
-- decimal places, which is roughly eleven metres and far more precision than a
-- 340 pixel card can use.
--
-- Areas with no centre are not placed falsely: the home card lists them beside
-- the map instead, so an area an admin opens tomorrow appears immediately and
-- gains its pin when somebody sets its coordinates.

update public.areas set centre_lat = 6.5095, centre_lng = 3.3711 where slug = 'yaba-lagos';
update public.areas set centre_lat = 6.4459, centre_lng = 3.4736 where slug = 'lekki-phase-1-lagos';
update public.areas set centre_lat = 6.4931, centre_lng = 3.3554 where slug = 'surulere-lagos';
update public.areas set centre_lat = 6.5833, centre_lng = 3.3500 where slug = 'ikeja-gra-lagos';
update public.areas set centre_lat = 6.5158, centre_lng = 3.3966 where slug = 'yaba-unilag';

comment on column public.areas.centre_lat is
  'Decimal degrees north. Optional: an area with no centre is listed rather than pinned, never placed at a guess.';
comment on column public.areas.centre_lng is
  'Decimal degrees east. Optional, and read together with centre_lat or not at all.';
