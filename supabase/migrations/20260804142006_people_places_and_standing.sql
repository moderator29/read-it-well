-- Who a person is, where they are, and what an agent has actually done.
--
-- Three things the product asks for on a profile and the schema could not
-- answer. An occupation chip with no occupation table behind it is a chip that
-- has to be typed by hand, which means four spellings of "Architect" and no way
-- to filter on any of them. A location that stops at the state cannot say Yaba.
-- And a trust score that is not derived from real bookings is a number we made
-- up about somebody else's business, which is worse than showing nothing.
--
-- OCCUPATIONS are a closed list, not free text, for the same reason states are.
-- 749 of them across 30 categories, so the picker groups rather than showing one
-- wall of names, and so "Architect" is one value the whole platform agrees on.
-- `prefer_not_to_say` is in the list on purpose: a required field with no way to
-- decline is a field people lie in.
--
-- LOCAL GOVERNMENTS are all 774, keyed to the 37 rows already in
-- `public.states`. Nigeria, then state, then local government, each level
-- filtering the next. Codes are derived from the state code and the name, so
-- they are stable and readable in a URL, and the generator asserts all 774 are
-- present and unique before the file is written.
--
-- TRUST is computed, never stored. A stored score is a score that drifts from
-- the thing it describes the moment somebody cancels a booking. It is four
-- public facts about an agent and the formula is written down here rather than
-- hidden in application code, because a number on somebody's profile that
-- nobody can explain is a number they cannot appeal.

-- ---------------------------------------------------------------------------
-- Occupations
-- ---------------------------------------------------------------------------

create table if not exists public.occupations (
  code       text primary key,
  name       text not null,
  category   text not null,
  sort_order integer not null default 0
);

comment on table public.occupations is
  'The closed list a person picks their occupation from. Grouped by category so the picker is searchable rather than a wall.';

create index if not exists occupations_category_idx on public.occupations (category, sort_order);

alter table public.occupations enable row level security;

drop policy if exists occupations_select on public.occupations;
create policy occupations_select on public.occupations for select using (true);

drop policy if exists occupations_admin_write on public.occupations;
create policy occupations_admin_write on public.occupations for all
  using (private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'))
  with check (private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'));

-- ---------------------------------------------------------------------------
-- Local governments
-- ---------------------------------------------------------------------------

create table if not exists public.local_governments (
  code       text primary key,
  state_code text not null references public.states (code) on delete cascade,
  name       text not null,
  unique (state_code, name)
);

comment on table public.local_governments is
  'All 774 local government areas, keyed to public.states. The third level of a Nigerian address: country, state, local government.';

create index if not exists local_governments_state_idx on public.local_governments (state_code, name);

alter table public.local_governments enable row level security;

drop policy if exists local_governments_select on public.local_governments;
create policy local_governments_select on public.local_governments for select using (true);

drop policy if exists local_governments_admin_write on public.local_governments;
create policy local_governments_admin_write on public.local_governments for all
  using (private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'))
  with check (private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'));

-- ---------------------------------------------------------------------------
-- What a profile now carries
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists occupation_code text references public.occupations (code) on delete set null,
  add column if not exists lga_code        text references public.local_governments (code) on delete set null;

comment on column public.profiles.occupation_code is
  'Chosen at signup from public.occupations and changeable in settings. Null is a real answer, not a missing one.';
comment on column public.profiles.lga_code is
  'The local government. Always inside profiles.state_code; the two are validated together on write.';

create index if not exists profiles_occupation_idx on public.profiles (occupation_code);
create index if not exists profiles_lga_idx        on public.profiles (lga_code);

/*
 * A local government belongs to exactly one state, so a profile claiming Ikeja
 * in Kano is not a preference, it is a contradiction. The check lives here
 * rather than in a form, because a form is not a security boundary.
 */
create or replace function private.guard_profile_place()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  owning_state text;
begin
  if new.lga_code is null then return new; end if;

  select state_code into owning_state from public.local_governments where code = new.lga_code;

  if owning_state is null then
    new.lga_code := null;
  elsif new.state_code is null then
    new.state_code := owning_state;
  elsif new.state_code <> owning_state then
    raise exception 'That local government is not in that state.'
      using errcode = 'RM020';
  end if;

  return new;
end;
$fn$;

revoke execute on function private.guard_profile_place() from public, anon, authenticated;

drop trigger if exists profiles_guard_place on public.profiles;
create trigger profiles_guard_place
  before insert or update of state_code, lga_code on public.profiles
  for each row execute function private.guard_profile_place();

-- ---------------------------------------------------------------------------
-- Standing the platform grants by hand
-- ---------------------------------------------------------------------------

insert into public.badges (code, name, description, audience, object_name, tier, manual_only) values
  ('top_contributor', 'Top Contributor',
   'Given by RentMe to somebody whose answers have made a place better. Never earned automatically.',
   'MEMBER', 'gift-star', 4, true)
on conflict (code) do update
  set name = excluded.name, description = excluded.description, manual_only = true;

/*
 * `manual_only` is a promise, and until now it was only a column. Nothing
 * stopped a future trigger awarding one, and `private.award_badge` sets
 * `granted_by` null, which the table's own comment defines as earned. So the
 * database now refuses it: a manual badge must name the admin who granted it.
 */
create or replace function private.guard_manual_badge()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if new.granted_by is null
     and exists (select 1 from public.badges where code = new.badge_code and manual_only) then
    raise exception 'That badge is granted by hand and must name who granted it.'
      using errcode = 'RM021';
  end if;
  return new;
end;
$fn$;

revoke execute on function private.guard_manual_badge() from public, anon, authenticated;

drop trigger if exists user_badges_guard_manual on public.user_badges;
create trigger user_badges_guard_manual
  before insert or update on public.user_badges
  for each row execute function private.guard_manual_badge();

-- ---------------------------------------------------------------------------
-- Trust, computed from four public facts
-- ---------------------------------------------------------------------------

/*
 * Deliberately a function rather than a column.
 *
 * A stored score drifts from the thing it describes the moment a booking is
 * cancelled, and reconciling it needs a scheduler this project does not have.
 * At this size the live computation is four small aggregates and it is always
 * right, which matters more than being fast on a number that appears once per
 * profile.
 *
 * The formula, out loud, because a number on somebody's profile that nobody can
 * explain is a number they cannot appeal:
 *
 *   30  verified and approved as an agent
 *   30  completed stays, one and a half points each, capped at twenty stays
 *   20  how fast they answer: under an hour 20, under six hours 14,
 *       under a day 8, otherwise 3, and 0 with nothing to judge
 *   20  their average review, as a share of five stars
 *
 * A stay is "completed" when the booking is CONFIRMED and its checkout date has
 * passed. `booking_status` has no COMPLETED value, so this is the honest
 * reading of the data that exists rather than a status nobody writes.
 */
create or replace function public.agent_trust(p_user uuid)
returns table (
  trust_score      integer,
  completed_deals  integer,
  response_minutes integer,
  review_count     integer,
  average_rating   numeric
)
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  with me as (
    select a.id, a.verified, a.status from public.agents a where a.user_id = p_user
  ),
  deals as (
    select count(*)::int as n
      from public.bookings b
      join public.listings l on l.id = b.listing_id
      join me on me.id = l.agent_id
     where b.status = 'CONFIRMED'
       and b.check_out <= (now() at time zone 'Africa/Lagos')::date
  ),
  replies as (
    select percentile_cont(0.5) within group (
             order by extract(epoch from (m.first_reply - c.created_at)) / 60
           ) as minutes
      from public.conversations c
      join lateral (
        select min(created_at) as first_reply
          from public.messages
         where conversation_id = c.id and sender_id = p_user
      ) m on true
     where c.agent_id = p_user and m.first_reply is not null
  ),
  stars as (
    select count(*)::int as n, avg(r.rating)::numeric as avg
      from public.reviews r
      join public.listings l on l.id = r.listing_id
      join me on me.id = l.agent_id
  )
  select
    least(100, greatest(0,
        (case when (select verified from me) and (select status from me) = 'APPROVED' then 30 else 0 end)
      + least(30, (select n from deals) * 1.5)::int
      + (case
           when (select minutes from replies) is null then 0
           when (select minutes from replies) <= 60      then 20
           when (select minutes from replies) <= 360     then 14
           when (select minutes from replies) <= 1440    then 8
           else 3
         end)
      + coalesce(round(((select avg from stars) / 5.0) * 20)::int, 0)
    ))::integer,
    (select n from deals),
    round((select minutes from replies))::integer,
    (select n from stars),
    round((select avg from stars), 2)
  where exists (select 1 from me);
$fn$;

comment on function public.agent_trust(uuid) is
  'Trust score, completed stays, median response minutes, review count and average rating for one agent. Returns no row for somebody who is not an agent. Every input is already public.';

revoke execute on function public.agent_trust(uuid) from public;
grant  execute on function public.agent_trust(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Seeds
-- ---------------------------------------------------------------------------

-- Occupations. One row per category, names semicolon separated, codes derived
-- in SQL by the same rule the generator used, so the seed reads as a list of
-- names rather than 749 lines of quoting. `on conflict do nothing` keeps the
-- first category a repeated name appears in, which is why the order matters.
insert into public.occupations (code, name, category, sort_order)
select lower(regexp_replace(regexp_replace(nm, '[^A-Za-z0-9]+', '_', 'g'), '^_|_$', '', 'g')), nm, cat, (row_number() over ())::int
from (values
  ('Architecture and the built environment', 'Architect;Landscape Architect;Interior Architect;Interior Designer;Urban Planner;Town Planner;Architectural Technologist;Draughtsperson;Building Information Modeller;Set Designer;Exhibition Designer;Lighting Designer;Acoustic Consultant;Conservation Architect;Space Planner;Facade Engineer'),
  ('Real estate and property', 'Estate Agent;Letting Agent;Property Manager;Facility Manager;Estate Surveyor;Valuer;Property Developer;Land Surveyor;Real Estate Investor;Mortgage Broker;Property Lawyer;Home Stager;Property Photographer;Serviced Apartment Manager;Shortlet Host;Caretaker;Estate Supervisor;Real Estate Analyst;Land Administrator;Housing Officer'),
  ('Construction and trades', 'Builder;Site Manager;Foreman;Bricklayer;Mason;Carpenter;Joiner;Roofer;Plasterer;Tiler;Painter and Decorator;Plumber;Electrician;Welder;Steel Fixer;Scaffolder;Glazier;Flooring Installer;Ceiling Installer;Aluminium Fabricator;Concrete Technician;Crane Operator;Excavator Operator;Quantity Surveyor;Clerk of Works;Construction Estimator;Demolition Operative;Insulation Installer;Solar Panel Installer;Borehole Driller'),
  ('Engineering', 'Civil Engineer;Structural Engineer;Mechanical Engineer;Electrical Engineer;Electronics Engineer;Chemical Engineer;Petroleum Engineer;Mining Engineer;Marine Engineer;Aeronautical Engineer;Automotive Engineer;Agricultural Engineer;Biomedical Engineer;Environmental Engineer;Geotechnical Engineer;Water Engineer;Telecommunications Engineer;Control Systems Engineer;Manufacturing Engineer;Industrial Engineer;Materials Engineer;Metallurgist;Robotics Engineer;Maintenance Engineer;Fire Safety Engineer;HVAC Engineer;Nuclear Engineer;Systems Engineer'),
  ('Technology', 'Software Engineer;Frontend Developer;Backend Developer;Full Stack Developer;Mobile Developer;Game Developer;Embedded Systems Developer;Data Engineer;Data Scientist;Data Analyst;Machine Learning Engineer;AI Researcher;DevOps Engineer;Site Reliability Engineer;Cloud Architect;Solutions Architect;Database Administrator;Systems Administrator;Network Engineer;Network Administrator;Cybersecurity Analyst;Penetration Tester;Security Engineer;IT Support Specialist;Help Desk Technician;QA Engineer;Test Automation Engineer;Product Manager;Technical Product Manager;Scrum Master;Business Analyst;UX Designer;UI Designer;UX Researcher;Product Designer;Design Systems Engineer;Technical Writer;Developer Advocate;Blockchain Developer;Smart Contract Engineer;Crypto Trader;Computer Hardware Technician;Phone Repair Technician;CCTV Installer;Web Designer;SEO Specialist;Growth Engineer;Platform Engineer;Computer Vision Engineer;Prompt Engineer'),
  ('Health and medicine', 'Doctor;General Practitioner;Surgeon;Anaesthetist;Cardiologist;Dermatologist;Endocrinologist;Gastroenterologist;Neurologist;Obstetrician;Gynaecologist;Oncologist;Ophthalmologist;Orthopaedic Surgeon;Paediatrician;Pathologist;Psychiatrist;Radiologist;Urologist;Nurse;Midwife;Nurse Practitioner;Theatre Nurse;Community Health Worker;Paramedic;Pharmacist;Pharmacy Technician;Dentist;Dental Hygienist;Optometrist;Optician;Physiotherapist;Occupational Therapist;Speech Therapist;Dietitian;Nutritionist;Medical Laboratory Scientist;Radiographer;Sonographer;Health Records Officer;Public Health Officer;Epidemiologist;Clinical Psychologist;Counsellor;Therapist;Veterinarian;Veterinary Nurse;Care Worker;Health Assistant;Traditional Medicine Practitioner;Medical Sales Representative'),
  ('Education', 'Teacher;Primary School Teacher;Secondary School Teacher;Nursery Teacher;Head Teacher;School Principal;University Lecturer;Professor;Research Fellow;Teaching Assistant;Special Needs Educator;Education Consultant;Curriculum Developer;School Administrator;Examinations Officer;Librarian;Archivist;Tutor;Driving Instructor;Vocational Trainer;Corporate Trainer;Language Teacher;Music Teacher;Sports Coach;Education Researcher'),
  ('Law and governance', 'Lawyer;Barrister;Solicitor;Corporate Counsel;Legal Adviser;Paralegal;Legal Secretary;Judge;Magistrate;Court Registrar;Notary Public;Legal Researcher;Compliance Officer;Company Secretary;Arbitrator;Mediator;Human Rights Advocate;Immigration Consultant;Intellectual Property Attorney;Tax Consultant;Policy Analyst;Legislative Aide;Diplomat'),
  ('Finance and accounting', 'Accountant;Chartered Accountant;Auditor;Internal Auditor;Bookkeeper;Payroll Officer;Financial Analyst;Investment Analyst;Investment Banker;Portfolio Manager;Fund Manager;Stockbroker;Trader;Actuary;Insurance Broker;Underwriter;Claims Adjuster;Loss Adjuster;Bank Manager;Bank Teller;Relationship Manager;Credit Analyst;Risk Analyst;Treasury Officer;Financial Adviser;Wealth Manager;Venture Capitalist;Private Equity Analyst;Microfinance Officer;Debt Collector;Forensic Accountant;Cost Accountant;Budget Analyst;Fintech Specialist'),
  ('Business and management', 'Entrepreneur;Founder;Chief Executive;Chief Operating Officer;Chief Financial Officer;Chief Technology Officer;Chief Marketing Officer;General Manager;Operations Manager;Project Manager;Programme Manager;Management Consultant;Strategy Consultant;Business Developer;Human Resources Manager;Recruiter;Talent Acquisition Specialist;Training Manager;Office Manager;Executive Assistant;Personal Assistant;Administrator;Receptionist;Procurement Officer;Contracts Manager;Supply Chain Manager;Quality Manager;Change Manager;Franchise Owner;Small Business Owner;Trader'),
  ('Sales and marketing', 'Sales Executive;Sales Manager;Account Manager;Key Account Manager;Field Sales Representative;Retail Sales Assistant;Telesales Agent;Marketing Manager;Brand Manager;Digital Marketer;Social Media Manager;Content Marketer;Email Marketer;Performance Marketer;Market Researcher;Public Relations Officer;Communications Manager;Copywriter;Advertising Executive;Media Buyer;Event Marketer;Affiliate Marketer;Influencer;Community Manager;Customer Success Manager;Customer Service Representative;Call Centre Agent;Merchandiser;Brand Ambassador'),
  ('Media and communications', 'Journalist;Reporter;News Anchor;Broadcaster;Radio Presenter;Television Presenter;Editor;Sub Editor;Publisher;Author;Writer;Scriptwriter;Blogger;Podcaster;Translator;Interpreter;Proofreader;Press Officer;Speechwriter;Media Analyst;Documentary Maker;Correspondent;Photojournalist;Content Creator;YouTuber;Streamer'),
  ('Creative and design', 'Graphic Designer;Brand Designer;Illustrator;Animator;Motion Designer;3D Artist;Concept Artist;Visual Artist;Painter;Sculptor;Printmaker;Ceramicist;Textile Designer;Jewellery Designer;Furniture Designer;Industrial Designer;Product Illustrator;Art Director;Creative Director;Curator;Gallery Manager;Art Dealer;Calligrapher;Tattoo Artist;Signwriter;Craftsperson;Woodworker;Glassblower;Leatherworker'),
  ('Music and performing arts', 'Musician;Singer;Songwriter;Composer;Music Producer;Sound Engineer;Mixing Engineer;Mastering Engineer;DJ;Instrumentalist;Drummer;Guitarist;Pianist;Saxophonist;Choir Director;Music Director;Actor;Theatre Director;Stage Manager;Dancer;Choreographer;Comedian;Voice Artist;Talent Manager;Booking Agent;Event Performer'),
  ('Film and photography', 'Photographer;Wedding Photographer;Fashion Photographer;Product Photographer;Videographer;Cinematographer;Film Director;Film Producer;Film Editor;Colourist;Camera Operator;Drone Pilot;Gaffer;Boom Operator;Casting Director;Costume Designer;Make Up Artist;Visual Effects Artist;Storyboard Artist;Location Scout;Photo Editor;Retoucher'),
  ('Fashion and beauty', 'Fashion Designer;Tailor;Seamstress;Pattern Cutter;Fashion Stylist;Personal Shopper;Model;Fashion Buyer;Textile Merchant;Shoemaker;Milliner;Hairdresser;Barber;Hair Stylist;Braider;Beautician;Nail Technician;Aesthetician;Spa Therapist;Masseur;Cosmetologist;Skincare Specialist;Perfumer'),
  ('Food and hospitality', 'Chef;Head Chef;Sous Chef;Pastry Chef;Baker;Caterer;Cook;Kitchen Assistant;Restaurant Manager;Restaurateur;Waiter;Bartender;Barista;Sommelier;Food Scientist;Food Safety Officer;Nutrition Consultant;Hotel Manager;Front Desk Officer;Concierge;Housekeeper;Housekeeping Supervisor;Event Planner;Wedding Planner;Banquet Manager;Butcher;Fishmonger;Grocer;Food Vendor;Bar Manager;Nightclub Manager'),
  ('Travel and aviation', 'Pilot;Commercial Pilot;Co Pilot;Flight Instructor;Cabin Crew;Flight Attendant;Air Traffic Controller;Aircraft Engineer;Aircraft Dispatcher;Airport Manager;Ground Handler;Travel Agent;Tour Operator;Tour Guide;Travel Consultant;Cruise Staff;Immigration Officer;Customs Officer;Baggage Handler;Airline Operations Officer'),
  ('Transport and logistics', 'Driver;Taxi Driver;Ride Hailing Driver;Bus Driver;Truck Driver;Delivery Rider;Dispatch Rider;Courier;Logistics Manager;Fleet Manager;Warehouse Manager;Warehouse Operative;Forklift Operator;Freight Forwarder;Customs Broker;Shipping Agent;Ship Captain;Sailor;Train Driver;Railway Engineer;Traffic Warden;Haulage Operator;Last Mile Coordinator;Inventory Controller;Route Planner'),
  ('Agriculture and environment', 'Farmer;Crop Farmer;Livestock Farmer;Poultry Farmer;Fish Farmer;Agronomist;Agricultural Extension Officer;Horticulturist;Landscaper;Gardener;Forester;Beekeeper;Veterinary Technician;Soil Scientist;Irrigation Specialist;Food Processor;Agribusiness Manager;Environmental Scientist;Conservationist;Ecologist;Waste Management Officer;Recycling Coordinator;Climate Analyst;Water Resource Manager;Park Ranger'),
  ('Energy and extractives', 'Petroleum Geologist;Drilling Engineer;Rig Operator;Production Operator;Refinery Technician;Pipeline Engineer;Oil and Gas Analyst;Renewable Energy Consultant;Solar Technician;Wind Turbine Technician;Power Plant Operator;Grid Operator;Energy Auditor;Electrical Lineman;Mining Technician;Quarry Manager;Geophysicist;Surveying Technician;HSE Officer'),
  ('Science and research', 'Research Scientist;Biologist;Microbiologist;Biochemist;Chemist;Physicist;Geologist;Astronomer;Statistician;Mathematician;Laboratory Technician;Clinical Researcher;Pharmacologist;Botanist;Zoologist;Marine Biologist;Meteorologist;Anthropologist;Archaeologist;Sociologist;Economist;Historian;Political Scientist;Linguist'),
  ('Sports and fitness', 'Professional Footballer;Athlete;Basketball Player;Boxer;Wrestler;Swimmer;Runner;Cyclist;Sports Coach;Football Coach;Fitness Trainer;Personal Trainer;Gym Manager;Yoga Instructor;Pilates Instructor;Sports Physiotherapist;Sports Agent;Referee;Umpire;Sports Analyst;Sports Journalist;Esports Player;Martial Arts Instructor;Lifeguard'),
  ('Security and emergency', 'Police Officer;Detective;Soldier;Naval Officer;Air Force Officer;Security Guard;Security Manager;Bodyguard;Firefighter;Emergency Medical Technician;Disaster Response Officer;Prison Officer;Customs Enforcement Officer;Private Investigator;Risk Consultant;Occupational Safety Officer;Coast Guard;Civil Defence Officer'),
  ('Public service', 'Civil Servant;Local Government Officer;Town Clerk;Public Administrator;Urban Development Officer;Tax Officer;Electoral Officer;Statistician Officer;Social Worker;Probation Officer;Youth Development Officer;Community Development Officer;Housing Inspector;Health Inspector;Licensing Officer;Records Officer;Politician;Councillor;Legislator;Special Adviser'),
  ('Religion and community', 'Pastor;Imam;Priest;Reverend;Evangelist;Chaplain;Religious Teacher;Choir Master;Community Organiser;Non Profit Manager;Charity Worker;Volunteer Coordinator;Fundraiser;Programme Officer;Development Worker;Humanitarian Worker;Advocacy Officer'),
  ('Skilled manual and services', 'Mechanic;Auto Electrician;Panel Beater;Vulcaniser;Generator Technician;Refrigeration Technician;Air Conditioning Technician;Appliance Repairer;Locksmith;Upholsterer;Cobbler;Tailor Apprentice;Cleaner;Industrial Cleaner;Laundry Operator;Dry Cleaner;Pest Controller;Gardener Assistant;Handyman;Machine Operator;Factory Worker;Production Supervisor;Packaging Operative;Printer;Bookbinder;Signage Installer;Furniture Maker'),
  ('Retail and commerce', 'Shop Owner;Shopkeeper;Market Trader;Wholesaler;Distributor;Importer;Exporter;Store Manager;Visual Merchandiser;Cashier;Stock Controller;E Commerce Manager;Dropshipper;Online Seller;Auctioneer;Pharmacy Retailer;Supermarket Manager'),
  ('Students and early career', 'Student;Secondary School Student;Undergraduate Student;Postgraduate Student;Doctoral Researcher;Apprentice;Intern;Graduate Trainee;National Youth Service Member;Job Seeker;Career Changer'),
  ('Other', 'Retired;Homemaker;Freelancer;Consultant;Self Employed;Investor;Landlord;Tenant;Prefer not to say;Other')
) as src(cat, list),
lateral unnest(string_to_array(list, ';')) with ordinality as u(nm, ord)
on conflict (code) do nothing;

-- All 774 local governments. One row per state, same derivation, prefixed with
-- the state code so `la_ikeja` is readable in a URL and cannot collide with
-- `og_ikeja` if a name repeats across states.
insert into public.local_governments (code, state_code, name)
select lower(st) || '_' || lower(regexp_replace(regexp_replace(nm, '[^A-Za-z0-9]+', '_', 'g'), '^_|_$', '', 'g')), st, nm
from (values
  ('AB', 'Aba North;Aba South;Arochukwu;Bende;Ikwuano;Isiala Ngwa North;Isiala Ngwa South;Isuikwuato;Obi Ngwa;Ohafia;Osisioma;Ugwunagbo;Ukwa East;Ukwa West;Umu Nneochi;Umuahia North;Umuahia South'),
  ('AD', 'Demsa;Fufore;Ganye;Girei;Gombi;Guyuk;Hong;Jada;Lamurde;Madagali;Maiha;Mayo-Belwa;Michika;Mubi North;Mubi South;Numan;Shelleng;Song;Toungo;Yola North;Yola South'),
  ('AK', 'Abak;Eastern Obolo;Eket;Esit Eket;Essien Udim;Etim Ekpo;Etinan;Ibeno;Ibesikpo Asutan;Ibiono-Ibom;Ika;Ikono;Ikot Abasi;Ikot Ekpene;Ini;Itu;Mbo;Mkpat-Enin;Nsit-Atai;Nsit-Ibom;Nsit-Ubium;Obot Akara;Okobo;Onna;Oron;Oruk Anam;Udung-Uko;Ukanafun;Uruan;Urue-Offong/Oruko;Uyo'),
  ('AN', 'Aguata;Anambra East;Anambra West;Anaocha;Awka North;Awka South;Ayamelum;Dunukofia;Ekwusigo;Idemili North;Idemili South;Ihiala;Njikoka;Nnewi North;Nnewi South;Ogbaru;Onitsha North;Onitsha South;Orumba North;Orumba South;Oyi'),
  ('BA', 'Alkaleri;Bauchi;Bogoro;Damban;Darazo;Dass;Gamawa;Ganjuwa;Giade;Itas/Gadau;Jama''are;Katagum;Kirfi;Misau;Ningi;Shira;Tafawa Balewa;Toro;Warji;Zaki'),
  ('BE', 'Ado;Agatu;Apa;Buruku;Gboko;Guma;Gwer East;Gwer West;Katsina-Ala;Konshisha;Kwande;Logo;Makurdi;Obi;Ogbadibo;Ohimini;Oju;Okpokwu;Otukpo;Tarka;Ukum;Ushongo;Vandeikya'),
  ('BO', 'Abadam;Askira/Uba;Bama;Bayo;Biu;Chibok;Damboa;Dikwa;Gubio;Guzamala;Gwoza;Hawul;Jere;Kaga;Kala/Balge;Konduga;Kukawa;Kwaya Kusar;Mafa;Magumeri;Maiduguri;Marte;Mobbar;Monguno;Ngala;Nganzai;Shani'),
  ('BY', 'Brass;Ekeremor;Kolokuma/Opokuma;Nembe;Ogbia;Sagbama;Southern Ijaw;Yenagoa'),
  ('CR', 'Abi;Akamkpa;Akpabuyo;Bakassi;Bekwarra;Biase;Boki;Calabar Municipal;Calabar South;Etung;Ikom;Obanliku;Obubra;Obudu;Odukpani;Ogoja;Yakuur;Yala'),
  ('DE', 'Aniocha North;Aniocha South;Bomadi;Burutu;Ethiope East;Ethiope West;Ika North East;Ika South;Isoko North;Isoko South;Ndokwa East;Ndokwa West;Okpe;Oshimili North;Oshimili South;Patani;Sapele;Udu;Ughelli North;Ughelli South;Ukwuani;Uvwie;Warri North;Warri South;Warri South West'),
  ('EB', 'Abakaliki;Afikpo North;Afikpo South;Ebonyi;Ezza North;Ezza South;Ikwo;Ishielu;Ivo;Izzi;Ohaozara;Ohaukwu;Onicha'),
  ('ED', 'Akoko-Edo;Egor;Esan Central;Esan North-East;Esan South-East;Esan West;Etsako Central;Etsako East;Etsako West;Igueben;Ikpoba-Okha;Oredo;Orhionmwon;Ovia North-East;Ovia South-West;Owan East;Owan West;Uhunmwonde'),
  ('EK', 'Ado-Ekiti;Efon;Ekiti East;Ekiti South-West;Ekiti West;Emure;Gbonyin;Ido-Osi;Ijero;Ikere;Ikole;Ilejemeje;Irepodun/Ifelodun;Ise/Orun;Moba;Oye'),
  ('EN', 'Aninri;Awgu;Enugu East;Enugu North;Enugu South;Ezeagu;Igbo-Etiti;Igbo-Eze North;Igbo-Eze South;Isi-Uzo;Nkanu East;Nkanu West;Nsukka;Oji River;Udenu;Udi;Uzo-Uwani'),
  ('FC', 'Abaji;Bwari;Gwagwalada;Kuje;Kwali;Municipal Area Council'),
  ('GO', 'Akko;Balanga;Billiri;Dukku;Funakaye;Gombe;Kaltungo;Kwami;Nafada;Shongom;Yamaltu/Deba'),
  ('IM', 'Aboh Mbaise;Ahiazu Mbaise;Ehime Mbano;Ezinihitte;Ideato North;Ideato South;Ihitte/Uboma;Ikeduru;Isiala Mbano;Isu;Mbaitoli;Ngor Okpala;Njaba;Nkwerre;Nwangele;Obowo;Oguta;Ohaji/Egbema;Okigwe;Onuimo;Orlu;Orsu;Oru East;Oru West;Owerri Municipal;Owerri North;Owerri West'),
  ('JI', 'Auyo;Babura;Biriniwa;Birnin Kudu;Buji;Dutse;Gagarawa;Garki;Gumel;Guri;Gwaram;Gwiwa;Hadejia;Jahun;Kafin Hausa;Kaugama;Kazaure;Kiri Kasama;Kiyawa;Maigatari;Malam Madori;Miga;Ringim;Roni;Sule Tankarkar;Taura;Yankwashi'),
  ('KD', 'Birnin Gwari;Chikun;Giwa;Igabi;Ikara;Jaba;Jema''a;Kachia;Kaduna North;Kaduna South;Kagarko;Kajuru;Kaura;Kauru;Kubau;Kudan;Lere;Makarfi;Sabon Gari;Sanga;Soba;Zangon Kataf;Zaria'),
  ('KE', 'Aleiro;Arewa Dandi;Argungu;Augie;Bagudo;Birnin Kebbi;Bunza;Dandi;Fakai;Gwandu;Jega;Kalgo;Koko/Besse;Maiyama;Ngaski;Sakaba;Shanga;Suru;Wasagu/Danko;Yauri;Zuru'),
  ('KN', 'Ajingi;Albasu;Bagwai;Bebeji;Bichi;Bunkure;Dala;Dambatta;Dawakin Kudu;Dawakin Tofa;Doguwa;Fagge;Gabasawa;Garko;Garun Mallam;Gaya;Gezawa;Gwale;Gwarzo;Kabo;Kano Municipal;Karaye;Kibiya;Kiru;Kumbotso;Kunchi;Kura;Madobi;Makoda;Minjibir;Nasarawa;Rano;Rimin Gado;Rogo;Shanono;Sumaila;Takai;Tarauni;Tofa;Tsanyawa;Tudun Wada;Ungogo;Warawa;Wudil'),
  ('KO', 'Adavi;Ajaokuta;Ankpa;Bassa;Dekina;Ibaji;Idah;Igalamela-Odolu;Ijumu;Kabba/Bunu;Kogi;Lokoja;Mopa-Muro;Ofu;Ogori/Magongo;Okehi;Okene;Olamaboro;Omala;Yagba East;Yagba West'),
  ('KT', 'Bakori;Batagarawa;Batsari;Baure;Bindawa;Charanchi;Dan Musa;Dandume;Danja;Daura;Dutsi;Dutsin Ma;Faskari;Funtua;Ingawa;Jibia;Kafur;Kaita;Kankara;Kankia;Katsina;Kurfi;Kusada;Mai''Adua;Malumfashi;Mani;Mashi;Matazu;Musawa;Rimi;Sabuwa;Safana;Sandamu;Zango'),
  ('KW', 'Asa;Baruten;Edu;Ekiti;Ifelodun;Ilorin East;Ilorin South;Ilorin West;Irepodun;Isin;Kaiama;Moro;Offa;Oke Ero;Oyun;Pategi'),
  ('LA', 'Agege;Ajeromi-Ifelodun;Alimosho;Amuwo-Odofin;Apapa;Badagry;Epe;Eti-Osa;Ibeju-Lekki;Ifako-Ijaiye;Ikeja;Ikorodu;Kosofe;Lagos Island;Lagos Mainland;Mushin;Ojo;Oshodi-Isolo;Shomolu;Surulere'),
  ('NA', 'Akwanga;Awe;Doma;Karu;Keana;Keffi;Kokona;Lafia;Nasarawa;Nasarawa Egon;Obi;Toto;Wamba'),
  ('NI', 'Agaie;Agwara;Bida;Borgu;Bosso;Chanchaga;Edati;Gbako;Gurara;Katcha;Kontagora;Lapai;Lavun;Magama;Mariga;Mashegu;Mokwa;Munya;Paikoro;Rafi;Rijau;Shiroro;Suleja;Tafa;Wushishi'),
  ('OG', 'Abeokuta North;Abeokuta South;Ado-Odo/Ota;Ewekoro;Ifo;Ijebu East;Ijebu North;Ijebu North East;Ijebu Ode;Ikenne;Imeko Afon;Ipokia;Obafemi Owode;Odeda;Odogbolu;Ogun Waterside;Remo North;Sagamu;Yewa North;Yewa South'),
  ('ON', 'Akoko North-East;Akoko North-West;Akoko South-East;Akoko South-West;Akure North;Akure South;Ese Odo;Idanre;Ifedore;Ilaje;Ile Oluji/Okeigbo;Irele;Odigbo;Okitipupa;Ondo East;Ondo West;Ose;Owo'),
  ('OS', 'Aiyedaade;Aiyedire;Atakunmosa East;Atakunmosa West;Boluwaduro;Boripe;Ede North;Ede South;Egbedore;Ejigbo;Ife Central;Ife East;Ife North;Ife South;Ifedayo;Ifelodun;Ila;Ilesa East;Ilesa West;Irepodun;Irewole;Isokan;Iwo;Obokun;Odo Otin;Ola Oluwa;Olorunda;Oriade;Orolu;Osogbo'),
  ('OY', 'Afijio;Akinyele;Atiba;Atisbo;Egbeda;Ibadan North;Ibadan North-East;Ibadan North-West;Ibadan South-East;Ibadan South-West;Ibarapa Central;Ibarapa East;Ibarapa North;Ido;Irepo;Iseyin;Itesiwaju;Iwajowa;Kajola;Lagelu;Ogbomosho North;Ogbomosho South;Ogo Oluwa;Olorunsogo;Oluyole;Ona Ara;Orelope;Ori Ire;Oyo East;Oyo West;Saki East;Saki West;Surulere'),
  ('PL', 'Barkin Ladi;Bassa;Bokkos;Jos East;Jos North;Jos South;Kanam;Kanke;Langtang North;Langtang South;Mangu;Mikang;Pankshin;Qua''an Pan;Riyom;Shendam;Wase'),
  ('RI', 'Abua/Odual;Ahoada East;Ahoada West;Akuku-Toru;Andoni;Asari-Toru;Bonny;Degema;Eleme;Emohua;Etche;Gokana;Ikwerre;Khana;Obio/Akpor;Ogba/Egbema/Ndoni;Ogu/Bolo;Okrika;Omuma;Opobo/Nkoro;Oyigbo;Port Harcourt;Tai'),
  ('SO', 'Binji;Bodinga;Dange Shuni;Gada;Goronyo;Gudu;Gwadabawa;Illela;Isa;Kebbe;Kware;Rabah;Sabon Birni;Shagari;Silame;Sokoto North;Sokoto South;Tambuwal;Tangaza;Tureta;Wamako;Wurno;Yabo'),
  ('TA', 'Ardo Kola;Bali;Donga;Gashaka;Gassol;Ibi;Jalingo;Karim Lamido;Kumi;Lau;Sardauna;Takum;Ussa;Wukari;Yorro;Zing'),
  ('YO', 'Bade;Bursari;Damaturu;Fika;Fune;Geidam;Gujba;Gulani;Jakusko;Karasuwa;Machina;Nangere;Nguru;Potiskum;Tarmuwa;Yunusari;Yusufari'),
  ('ZA', 'Anka;Bakura;Birnin Magaji/Kiyaw;Bukkuyum;Bungudu;Gummi;Gusau;Kaura Namoda;Maradun;Maru;Shinkafi;Talata Mafara;Tsafe;Zurmi')
) as src(st, list),
lateral unnest(string_to_array(list, ';')) as u(nm)
on conflict (code) do nothing;

