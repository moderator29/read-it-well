-- Location: Nigerian states.
--
-- The first layer of the canonical administrative hierarchy (State, then LGA,
-- then Ward in later migrations, per intake C-05 and MASTER_TODO B-07). A
-- separate settlement layer for City and Area, which the designed UI surfaces,
-- is added alongside once the location model is confirmed; the two are linked,
-- not conflated. All 36 states plus the FCT are seeded here so the product is
-- Nigeria-wide from day one (Master Rules 35 and 36).
--
-- Reference data: readable by everyone (including anonymous discovery), writable
-- only by the service layer. RLS is on with a public read policy and no write
-- policy, so writes require the service role.

create type public.geopolitical_zone as enum (
  'north_central',
  'north_east',
  'north_west',
  'south_east',
  'south_south',
  'south_west'
);

create table public.states (
  code       text primary key,           -- ISO 3166-2:NG, without the NG- prefix
  name       text not null unique,
  zone       public.geopolitical_zone not null,
  created_at timestamptz not null default now()
);

comment on table public.states is 'Nigerian states and the FCT. Canonical top of the location hierarchy.';

insert into public.states (code, name, zone) values
  ('AB', 'Abia',        'south_east'),
  ('AD', 'Adamawa',     'north_east'),
  ('AK', 'Akwa Ibom',   'south_south'),
  ('AN', 'Anambra',     'south_east'),
  ('BA', 'Bauchi',      'north_east'),
  ('BY', 'Bayelsa',     'south_south'),
  ('BE', 'Benue',       'north_central'),
  ('BO', 'Borno',       'north_east'),
  ('CR', 'Cross River', 'south_south'),
  ('DE', 'Delta',       'south_south'),
  ('EB', 'Ebonyi',      'south_east'),
  ('ED', 'Edo',         'south_south'),
  ('EK', 'Ekiti',       'south_west'),
  ('EN', 'Enugu',       'south_east'),
  ('GO', 'Gombe',       'north_east'),
  ('IM', 'Imo',         'south_east'),
  ('JI', 'Jigawa',      'north_west'),
  ('KD', 'Kaduna',      'north_west'),
  ('KN', 'Kano',        'north_west'),
  ('KT', 'Katsina',     'north_west'),
  ('KE', 'Kebbi',       'north_west'),
  ('KO', 'Kogi',        'north_central'),
  ('KW', 'Kwara',       'north_central'),
  ('LA', 'Lagos',       'south_west'),
  ('NA', 'Nasarawa',    'north_central'),
  ('NI', 'Niger',       'north_central'),
  ('OG', 'Ogun',        'south_west'),
  ('ON', 'Ondo',        'south_west'),
  ('OS', 'Osun',        'south_west'),
  ('OY', 'Oyo',         'south_west'),
  ('PL', 'Plateau',     'north_central'),
  ('RI', 'Rivers',      'south_south'),
  ('SO', 'Sokoto',      'north_west'),
  ('TA', 'Taraba',      'north_east'),
  ('YO', 'Yobe',        'north_east'),
  ('ZA', 'Zamfara',     'north_west'),
  ('FC', 'FCT (Abuja)', 'north_central');

alter table public.states enable row level security;

-- Anyone may read the states list, including anonymous visitors browsing
-- discovery. No write policy: inserts and updates require the service role.
create policy states_select_all
  on public.states for select
  using (true);
