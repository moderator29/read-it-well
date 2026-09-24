# Valuation engine research: what Vallo can honestly estimate, and when

Written 22 September 2026, against the working tree and the live-project counts
recorded in `docs/archive/PLATFORM_SURVEY_2026-09-22.md`. Every claim about this
codebase carries a `path:line`. Every claim about Nigerian law, data sources or
market practice carries a citation. Everything this research could not verify is
listed in the honesty log at the end, with the reason.

**The verdict in one paragraph.** The co-founder's proposal is a good product
and an impossible data project in the order he proposed it. An automated
valuation model is a comparable-sales machine, and Nigeria has no sold-price
feed: over 90 per cent of Nigerian land is unregistered, formal transactions are
under 10 per cent of all transactions, and the Federal Government is currently
partnering with the World Bank to try to lift that to 50 per cent over a decade
([TheCable](https://www.thecable.ng/over-90-of-lands-in-nigeria-unregistered-says-minister/),
[Businessday](https://businessday.ng/news/article/fg-explains-why-in-fresh-push-for-national-land-registration-titling/)).
Our own catalogue holds 64 listings, all 64 flagged as examples, and zero
bookings (`docs/archive/PLATFORM_SURVEY_2026-09-22.md:26`). A per-property figure built
on that today is a random number with a confidence interval painted on it. The
three-stage hypothesis is right in shape and wrong in two details, and both
corrections are in section 3.

---

# PART 1. WHAT DATA WE ACTUALLY HAVE

## 1.1 The listings table, column by column, and which columns carry money

`public.listings` is created at `supabase/migrations/20260728152229_listings_core.sql:30-64`
and has been extended eight times since. The money-bearing columns, as they
stand today, are these.

| Column | Type | Added at | What it means |
| --- | --- | --- | --- |
| `rate_minor` | `bigint not null default 0` | `20260728152229_listings_core.sql:51` as `price_per_night_minor`, renamed at `20260809044725_a_column_called_price_per_night_that_held_annual_rent.sql:66` | What one unit of `rate_period` costs. A night for a shortlet or hotel room, a cover for a restaurant. |
| `rate_period` | `public.rate_period` (`night`, `guest`) | `20260809044725...:87` | The unit `rate_minor` is quoted in. Deliberately has no annual value. |
| `rent_amount_minor` | `bigint` nullable | `20260809044514_what_it_actually_costs_to_move_in.sql:76` | Rent in kobo for one `rent_period`. Null on a sale listing. |
| `rent_period` | `public.rent_period` (`month`, `quarter`, `year`) | `20260809044514...:61,77` | The cycle the rent is quoted on. |
| `caution_deposit_minor` | `bigint` nullable | `20260809044514...:82` | Refundable damage deposit. |
| `service_charge_minor` / `service_charge_period` | `bigint` / `rent_period` | `20260809044514...:86-87` | Estate bill and its own cycle. |
| `agency_fee_minor` | `bigint` nullable | `20260809044514...:92` | Agent commission paid by the incoming tenant. |
| `legal_fee_minor` | `bigint` nullable | `20260809044514...:93` | Tenancy agreement preparation. |
| `agreement_fee_minor` | `bigint` nullable | `20260809044514...:94` | Flat agreement charge where billed separately. |
| `total_move_in_cost_minor` | `bigint` nullable | `20260809044514...:97` | Everything to be found before keys change hands. Stored, never derived. |
| `sale_price_minor` | `bigint` nullable | `20260809044600_a_sale_has_a_price_and_a_title.sql:89` | **Asking price** in kobo. The column comment at `:95-96` says so in terms: "The asking price only". |
| `cleaning_fee_minor`, `service_fee_minor` | `bigint not null default 0` | `20260728152229_listings_core.sql:52-53` | Stay-side add-ons. |

Three separate money stories on one row, and `apps/web/src/lib/listings/pricing.ts`
exists to resolve which one applies. `headlinePrice` at
`apps/web/src/lib/listings/pricing.ts:101-117` picks sale price first, then
`rate_minor`, then `rent_amount_minor`, and never returns null: a listing with
nothing set answers zero, which the UI renders as "price on request"
(`pricing.ts:113-116`). `moveInTotal` at `pricing.ts:264-270` returns the
lister's stated total when there is one, and otherwise the sum of the stated
parts with a `stated: false` flag so the caller says "from" rather than a flat
figure.

**The single most important fact in this entire document is in a column
comment.** `sale_price_minor` is an ASKING price
(`20260809044600_a_sale_has_a_price_and_a_title.sql:95-96`). `rent_amount_minor`
is an ADVERTISED rent, and its own comment says it "is almost never what
somebody pays to move in" (`20260809044514_what_it_actually_costs_to_move_in.sql:104`).
There is no sold price, no achieved rent, no agreed figure and no transaction
price column anywhere on this table. There is a `sale_status` enum with a `sold`
value (`20260809044600...:64-70`), but nothing records what the sold price was,
and nothing records when it sold: `sale_status` is a current-state enum with no
timestamp beside it.

## 1.2 Location: what granularity we actually hold

PostGIS is installed into the `extensions` schema at
`supabase/migrations/20260809044814_the_map_stops_being_impossible.sql:66`.
`listings.location` is `extensions.geography(Point, 4326)` at `:71`, derived by
trigger from `latitude` and `longitude` and never written directly (the trigger
is `private.sync_listing_location`, created in the same file and re-used for
other tables as `private.sync_row_location` at
`20260918080928_m02_businesses.sql:46-56`).

The index that makes it useful is at `20260809044814...:126-128`:

```sql
create index if not exists listings_location_gist
  on public.listings using gist (location extensions.gist_geography_ops)
  where status = 'PUBLISHED' and location is not null;
```

Partial on published-with-a-pin. That is exactly the index a comparables radius
query wants, and it already exists. `public.listings_in_bounds` at
`20260809044814...:180-245` is the only geographic RPC on listings today; it is
a viewport rectangle using `&&` against `ST_MakeEnvelope`, not a radius, and it
returns at most 1000 rows.

The location columns themselves:

- `state_code` references `public.states` (`20260728152229_listings_core.sql:38`). Controlled. 37 rows seeded at `20260728151150_location_states.sql:23-28` and following.
- `city`, `area`, `address`, `landmark` are all bare `text` (`20260728152229_listings_core.sql:39-42`). **Uncontrolled free text.** There is no foreign key from `listings.area` to anything.
- `latitude`, `longitude` are nullable `double precision` (`:43-44`).
- `listings_location_idx` is a plain btree on `(state_code, city)` (`:70`).

`public.local_governments` holds all 774 LGAs keyed to states
(`20260804142006_people_places_and_standing.sql:58-66`). `public.areas` is the
social layer's place directory (`20260804100526_social_foundations.sql:54-79`),
with `centre_lat` and `centre_lng` both nullable, and exactly five of them have
real coordinates, set by hand at
`20260804150721_areas_carry_their_real_centres.sql:16-20`. The comment there is
the house rule restated: "Inventing a position for a real place is the kind of
small lie that gets believed".

`public.landmarks` exists with a geography column and a GiST index
(`20260918082305_m08_landmarks.sql:25-38, 68-69`) and the migration header at
`:14-15` says in terms that it "ships the table empty". The curated seed is
`supabase/migrations/pending/m08_landmarks_seed.sql`, drafted and not applied.
`docs/research/UNFINISHED_WORK_AUDIT.md:391` confirms landmark-aware search
resolves nothing today.

**The granularity ladder we actually hold: state (controlled, complete), LGA
(controlled, complete, and not on the listings table), city and area (free text
on the listing, uncontrolled), point (nullable, present on the 42 seed rows).**
The free-text `area` is a real problem for an area report: `public.search_stays`
matches with `lower(ce.area) = lower(p_area)`
(`20260918130452_m09_catalogue_entries_and_stays_search.sql:630`), so case is
handled and spelling and abbreviation are not.

## 1.3 Size in square metres: captured, optional, and unenforced

`size_sqm numeric(10,2)` is added at
`20260809044629_the_facts_a_nigerian_listing_states.sql:38`, with a check that
it is positive at `:59-60` and a partial index at `:77-79`:

```sql
create index if not exists listings_size_sqm_idx
  on public.listings (size_sqm)
  where status = 'PUBLISHED' and size_sqm is not null;
```

The comment at `:45-46` calls it "THE ONLY SIZE COLUMN ON THIS TABLE" and
explains why it is numeric rather than integer: plots are quoted in fractions.
Good column, correctly reasoned.

**It is optional and the publish gate does not ask for it.** The wizard schema
declares `sizeSqm: optionalDecimal(...)` at
`apps/web/src/lib/agent/listings-schema.ts:595`, and the canonical submit gate
`submitRequirements` at `listings-schema.ts:820-930` never mentions it. The gate
requires title, description word count, property type, photo count and cover,
state, city, area, at least one amenity, a complete money block for the
listing's shape, bedrooms, and bathrooms on anything that is not land
(`listings-schema.ts:823-928`). It does not require size, address, or a map pin.

Consequence: **price per square metre is only computable on the subset of rows
where the lister volunteered a size**, and nothing in the product makes that
subset large. All 42 seeded example rows carry a size
(`20260809081618_forty_two_example_properties_across_four_cities.sql:69-92` and
throughout), which makes the seed data unrepresentative of what real supply
will look like the moment real agents start listing.

## 1.4 Bedrooms and bathrooms: reliable in shape, weak in meaning

- `bedrooms integer not null default 0 check (bedrooms >= 0)` (`20260728152229_listings_core.sql:47`)
- `beds integer not null default 1` (`:48`)
- `bathrooms integer not null default 1 check (bathrooms >= 0)` (`:49`)
- `max_guests integer not null default 1 check (max_guests > 0)` (`:46`)
- `toilets smallint` nullable (`20260809044629...:39`)

The gate requires `bedrooms >= 0` and `bathrooms >= 1` on anything that is not
land (`listings-schema.ts:920-927`). So bedrooms and bathrooms are always
present as integers. That is reliability of SHAPE.

Reliability of MEANING is weaker in two ways. First, `bedrooms` is `not null
default 0`, so a shop, an office and a restaurant carry zero, which is a real
answer for them and a missing answer for a flat (the seed shows a Yaba shop at
zero, `20260809081618...:78`, and an Ikeja GRA office at zero, `:82`). A
comparables query must filter on `property_type` before it reads `bedrooms`, or
it will put a shop in a flat's set. Second, Nigerian listings count toilets
separately from bathrooms on purpose (`20260809044629...:14-19, 47-48`) and
`toilets` is nullable, so bathroom count alone understates what is priced.

## 1.5 The search and filter layer, and what it can already do

`apps/web/src/lib/listings/filter.ts:30-74` defines `ListingFacts`, the subset
of a listing the structured filters read, and the module header at `:4-17`
states the invariant: the browser filter drawer and the server repository import
the same predicate so a count and a result set cannot disagree. `factsOf` is at
`:76`, `matchesFacts` at `:146`, `matchesFilter` at `:218`.

`apps/web/src/lib/listings/supabase-repository.ts:157-209` holds `LISTING_SELECT`,
the column list every list surface reads. It already selects `size_sqm`,
`bedrooms`, `bathrooms`, `toilets`, `latitude`, `longitude`, `published_at`,
`is_demo`, every money column, and the utilities block. A comparables engine
needs no new columns from the listings table. `LISTING_SELECTS` at `:280`
exposes the two literals; `selects.test.ts` holds them to each other.

`apps/web/src/lib/listings/types.ts:63-259` is the domain `Listing`, with
`sizeSqm` optional at `:156` and `ListingSearchFilter` at `:271-360` carrying
price bounds, bedrooms, bathrooms, amenities, `verifiedOnly`, the utilities
filters at `:335-343`, and `excludeDemo` at `:319`. That last flag matters most
here: `apps/web/src/lib/saved/search-alerts.ts:24-32` explains why alerts set it
and the results page does not, and an estimator must set it for the same
reason.

The stays side has its own search projection. `public.catalogue_entries`
(`20260918130452_m09_catalogue_entries_and_stays_search.sql:68-105`) is a thin
row per listing, accommodation or restaurant, maintained by trigger, carrying
`headline_price_minor`, `headline_price_period`, `latitude`, `longitude`,
`location geography`, `amenity_codes`, `is_demo` and a generated `tsvector`. It
has a partial GiST index at `:110-112` and a price btree at `:126`. The refresh
function for a listing is `private.catalogue_refresh_listing` at `:129-186`, and
its price resolution at `:155-167` mirrors `pricing.ts` exactly. `search_stays`
at `:560-720` is the one RPC that already does distance: it builds an origin
point from `p_lat`/`p_lng` at `:615`, computes `ST_Distance` at `:624` and gates
on `ST_DWithin` at `:640`.

`apps/web/src/lib/stays/search.ts` and `filters.ts` are the client of that RPC.
`apps/web/src/lib/stays/types.ts:145` carries `size_sqm` on a room type, which
comes from `room_types.size_sqm numeric(7,2)` at
`20260918081453_m04_room_types_units_rate_plans_rate_calendar.sql:46`. Room size
is not property size and must never be mixed into a property estimate.

**Conclusion for the search layer: the machinery a comparables query needs is
already built.** A geography column, a partial GiST index, an `ST_DWithin`
pattern in production SQL, a price projection that resolves the three money
shapes identically on both sides, and a demo-exclusion flag that every honest
read already sets.

## 1.6 How many price points are countable today

`docs/archive/PLATFORM_SURVEY_2026-09-22.md:26`, measured against the live project on
22 September 2026:

> 64 listings, 64 published, **64 of 64 are `is_demo`**. 0 bookings. 0 escrows.
> 1 wallet. 2 wallet entries. 8 conversations, 18 messages, 74 posts, 6
> profiles, 1 agent, 8 businesses.

The repository accounts for 42 of those 64. They are seeded at
`20260809081618_forty_two_example_properties_across_four_cities.sql:41-113`,
across Lagos, Abuja, Ibadan and Port Harcourt, all with `is_demo = true`,
all with a latitude and longitude, all with a `size_sqm`, and all with
`address` set to null. The `is_demo` column itself is added at
`20260809080524_an_example_listing_may_never_wear_the_trust_mark.sql:18`. The
remaining 22 rows are not created by any migration in this tree, which is
recorded in the honesty log.

So the countable, non-example price points available to an estimator today are:

- **Sold prices: zero.** No column holds one.
- **Completed transactions of any kind: zero.** `public.bookings` (`20260728152358_bookings_payments.sql:28-60`) holds zero rows; `public.rent_payments` (`20260918140000_b3_no_table_at_an_example_a_thread_per_table_and_the_rent_charge.sql:227-257`) is the tenancy charge record and is empty because bookings is empty.
- **Real asking prices: zero.** All 64 listings are examples, and `20260919103000_b1_the_example_refusal_covers_every_remaining_door.sql` makes a transaction against one impossible by trigger.
- **Example asking prices: 64**, of which 42 are in this tree, every one of which is a figure a person typed to illustrate a catalogue rather than an offer anybody made.

## 1.7 What the product already refuses to say, and why that is the precedent

Three modules already hold the line this feature will have to hold.

`apps/web/src/lib/agent/analytics-queries.ts:5-57` is the strongest precedent.
It states the rule at `:9-17`: "if the data cannot answer the question, the
question is not asked. Nothing here estimates, projects, annualises,
extrapolates or fills a gap with a representative figure." It then names three
questions it refuses, with reasons: views, because nothing counts a view of a
listing and there is no numerator (`:29-35`); saves, because signed-out saves
live in `localStorage` and a database count would undercount by an unmeasurable
margin (`:36-46`); historical occupancy percentage, because the denominator is
unknowable from a table holding one `published_at` and one current status
(`:47-55`). `UNREADABLE_EARNINGS` at `:837-851` carries `readable: false`, the
flag that says "no figure rather than a wrong one".
`apps/web/src/lib/platform-stats.ts:7-32` makes the same argument about the
landing page's numbers band, where `null` means "we do not know".
`apps/web/src/components/app/Unreachable.tsx:5-56` is the shape a refusal takes
on screen: the situation rather than a schedule, the fault named as ours, and
somewhere to go. Its header at `:9-32` is a ruling against "coming soon" copy.

**The honest refusal state this feature needs is not a new pattern. It is the
house pattern, and there are three implementations of it to copy.**

## 1.8 The gaps, stated brutally

1. **No sold prices. None. Anywhere.** Not a gap in coverage, a gap in the schema and in the country. Section 2 establishes that no lawful external feed closes it either.
2. **No transaction history of any kind.** Zero bookings, zero rent payments, zero escrows. Stage three of the hypothesis has not started.
3. **Every price we hold is an example.** 64 of 64. An estimator trained, calibrated or even sanity-checked on these rows is being sanity-checked against fiction.
4. **`area` is free text.** No canonical neighbourhood vocabulary exists. An area report keyed on `lower(area)` will fragment the moment two agents spell the same estate differently.
5. **`size_sqm` is optional and ungated.** Price per square metre is available only on a self-selected subset, and that subset will skew towards larger and more professionally marketed property.
6. **`address` is optional, ungated, free text, and null on every seed row.** There is no address parser, no geocoder and no address normaliser in the tree. `apps/web/src/lib/maps/tiles.ts:1-24` is the entire maps layer and it is a tile-licensing module, not a geocoder.
7. **A map pin is optional.** `latitude` and `longitude` are nullable and the gate does not ask. The GiST index is partial on `location is not null` precisely because a real fraction of listings will have no pin (`20260809044814...:118-125`).
8. **Landmarks table is empty.** "Near Eko Hotel" resolves to nothing.
9. **`sale_status = 'sold'` has no date and no price.** Even when we start selling, marking a listing sold records neither when nor for how much unless a migration adds those columns.
10. **Nothing counts a view.** `analytics-queries.ts:29-35`. Every funnel metric in section 6 needs instrumentation that does not exist yet.

---

# PART 2. THE REAL DATA SOURCES

The standing rule first, because it disposes of several options immediately.

> **No scraping, ever. Licensed data only, attribution where owed.**
> `docs/API_INVENTORY.md:86`

Restated in the research that produced that inventory at
`docs/research/API_INVENTORY_RESEARCH.md:21`, applied to the CAC portal at
`docs/research/HOST_ONBOARDING_RESEARCH.md:410-411`, and applied to the whole
stays supply chain at `docs/PRODUCT.md:31` and
`ARCHITECTURE_DECISIONS.md:332`. **Every source below that would require
scraping is marked FORBIDDEN and is not costed, not timetabled and not
conditionally allowed.**

## 2.1 State land registries

**What exists.** Land administration is state by state, because the Land Use
Act 1978 vests all land in each state's Governor
([Mondaq](https://www.mondaq.com/nigeria/landlord--tenant---leases/1248284/federal-government-land-ground-rent-and-perfection-of-land-title-in-nigeria)).
Lagos runs the Lands Bureau and its Directorate of Land Registry, which has
digitised over 10.5 million pages of title documents and runs an eGIS portal
([Lands Bureau](https://landsbureau.lagosstate.gov.ng/directorate-of-land-registry/),
[Lagos eGIS](https://landonline.lagosstate.gov.ng/index.html)). Abuja runs AGIS,
computerising the FCT cadastre since 2003
([AGIS](https://agis.fcta.gov.ng/agis-at-a-glance/)); Kaduna runs KADGIS, and
the model has been adopted by Ogun, Plateau and Kwara.

**Do they publish prices? No.** A search returns title status, encumbrances, the
registered instrument and the parties. A Deed of Assignment does state a
consideration and is registered, but access is by application on a named parcel
for roughly twenty to thirty thousand naira a search
([Bektu](https://bektu.com/blog/how-to-conduct-land-title-search-lagos-lands-registry-2026)),
and nothing publishes those considerations in aggregate. No price-paid dataset,
no bulk export, no API.

**Coverage is the deeper problem.** Over 90 per cent of Nigerian land is
unregistered and formal transactions are under 10 per cent of the total
([TheCable](https://www.thecable.ng/over-90-of-lands-in-nigeria-unregistered-says-minister/),
[The Sun](https://thesun.ng/140-years-on-nigerias-land-registration-remains-below-10-fg/)).
A perfect price-paid feed from every state registry would still describe under a
tenth of the market, and a biased tenth: the formal, titled, lawyered end.

**Lawful for us?** A search on one parcel is lawful and is what a buyer's
solicitor does. Searching thousands to build a price database is a different
act, is not what the fee schedule contemplates, and would need a data-sharing
agreement with each state. **Verdict: not a source for an estimator. Possibly a
per-property title check product later, one parcel at a time, at the user's
request and expense.**

## 2.2 The one genuinely published, lawful, government price dataset

**The Lagos State gazetted fair market values used to assess Governor's Consent
and land registration fees.** Consent fees in Lagos are assessed against a
published fair market value schedule, contained in the Lagos State of Nigeria
Official Gazette No. 9, Volume 54 of 15 March 2021, with per-square-metre rates
by neighbourhood: Old Ikoyi at N60,000 per square metre, Victoria Island at
N50,000, South West Ikoyi and Parkview/Osborne 1 and Victoria Island Annex at
N40,000
([Estate Intel, Requirements for processing Governor's Consent](https://estateintel.com/insights/requirements-for-processing-governors-consent),
[Lagos Lands Bureau schedule of fees](https://landsbureau.lagosstate.gov.ng/schdule-of-fees/)).

**Gives:** government-assessed land value per square metre, by named
neighbourhood, for a whole state. **Lawful:** yes, a gazette is published law
and reproducing it with attribution is the use a gazette exists for.
**Currency:** poor. The 2021 gazette is five years old against naira
depreciation that makes a 2021 figure close to meaningless as a market price,
and it is a tax base rather than a market value.

**Verdict: a FLOOR and a sanity bound, never an estimate.** A comparables figure
below the gazetted assessment means the comparables are wrong or the property is
distressed. It also gives one honest, citable, day-one sentence: "The Lagos
State gazetted assessment for this neighbourhood is X naira per square metre
(Gazette No. 9, Vol. 54, 15 March 2021). That is a tax assessment, not a market
price." True, sourced, and more than any competitor puts on a page.

## 2.3 Federal Ministry of Lands, Housing and Urban Development

The Federal Ministry of Housing and Urban Development formulates national
housing, urban development and land administration policy
([FMHUD](https://fmhud.gov.ng/read/3503)). It signed an agreement with the World
Bank in September 2024 to raise formal land transactions from 10 per cent to 50
per cent over a decade, to register and title all land parcels within five
years, and to develop a National Digital Land Information System
([Businessday](https://businessday.ng/news/article/fg-explains-why-in-fresh-push-for-national-land-registration-titling/),
[Leadership](https://leadership.ng/federal-govt-partners-world-bank-to-tackle-land-registration-issues/)).

**What it gives today: nothing usable.** No price feed exists. **What it might
give: the NDLIS, if it ships, if it carries considerations, and if it publishes.
Three ifs and a decade.** Track it. Do not plan on it.

## 2.4 Tenement rates, ground rent and the Land Use Charge

Tenement rate is a local-government charge on developed, occupied property, and
only a local government or an FCT Area Council may demand it
([Veraz Advocates](https://www.verazadvocates.com.ng/2024/10/02/tenement-rate-in-nigeria/)).
Ground rent is payable to the state or the Federal Government on its own land.

Lagos consolidated tenement rate, ground rent and neighbourhood improvement
charge into the Land Use Charge under the Land Use Charge Law 2018, whose
formula is `LUC = (Market Value of Property) x (Relief Rate) x (Charge Rate)`,
with market values assessed by professional Estate Valuers appointed by the
State and updated on a five-yearly basis
([Aluko & Oyebode](http://www.aluko-oyebode.com/resources/land-use-charge-law-of-lagos-state-2018/),
[Banwo & Ighodalo critique](https://www.banwo-ighodalo.com/grey-matter/a-critique-of-the-land-use-charge-law-of-lagos-state-2018/)).

**So an assessed market value per property exists in Lagos, held by the Land Use
Charge Office.** It is not published as a register, it is a tax assessment
rather than a market price, and this research could not find any provision
making the assessment roll public (recorded in the honesty log).

**Verdict: not obtainable, and would not be a sold price if it were.** The only
usable artefact is the published rate schedule, which we can cite.

## 2.5 NIESV and ESVARBON

The Nigerian Institution of Estate Surveyors and Valuers is the professional
body; the Estate Surveyors and Valuers Registration Board of Nigeria is the
statutory regulator, established under Decree 24 of 1975, now Cap E13 LFN 2004
([NIESV on ESVARBON](https://www.niesv.org.ng/esvarbon.php),
[ESVARBON](https://www.esvarbon.gov.ng/about-esvarbon/)). NIESV publishes the
Nigerian Valuation Standards, the Green Book, which adopts the International
Valuation Standards and adds Nigerian implementation guidance
([NIESV Green Book](https://www.niesv.org.ng/blog_details.php?articlenumber=The+Nigerian+Valuation+Standards+(The+Green+Book))).

**Do they publish price data? No.** They publish standards and hold a register
of registered practitioners. Individual firms publish market commentary.

**What they are actually for, to us:** section 4 below. They define the word we
may not use, and they are the correct partner for any surface where a real
valuation is wanted. A "get a registered valuer" hand-off from our estimate
screen is both good product and good regulatory hygiene.

## 2.6 Published market reports from the large firms

| Source | What it gives | Lawful to use | Cost | Currency |
| --- | --- | --- | --- | --- |
| Knight Frank Nigeria, Lagos Market Update and the Africa Report | Prime rents and yields by sector and district, quoted in dollars per square metre; H1 2025 update quotes prime Ikoyi rents at US$55 per square metre ([Lagos Market Update H1 2025](https://content.knightfrank.com/research/1859/documents/en/lagos-market-update-h1-2025-12396.pdf), [Africa Report](https://www.knightfrank.com/africareport)) | Published free, citation and attribution expected | Free | Half-yearly |
| Northcourt Real Estate, Nigeria Real Estate Market Review | Sector-level review, rents and prices by district, half-yearly since at least 2020 ([H1 2023](https://www.northcourtrealestate.com/download/Nigeria%20Real%20Estate%20Market%20Review%20H1%202023.pdf)) | Published free | Free | Half-yearly |
| Estate Intel | Market dashboards covering rent and sale prices for residential, office and retail across 44+ areas in African cities, with a documented API requiring a key ([Estate Intel services and APIs](https://estateintel.com/news/services-apis), [Postman collection](https://documenter.getpostman.com/view/21001708/2s93z3h6Xw)) | **Licensed. This is the one commercial licence worth buying.** | Reported at US$100 to US$700 a month by tier, with an ei Pro tier at around US$100 or N50,000 a year ([TechCabal](https://techcabal.com/2020/08/20/the-backend-estate-intel/), [Thinkmint](https://www.thinkmint.ng/buyrealestate/estate-intel-has-launched-ei-pro-a-more-affordable-way-to-access-real-estate-data/)) | Continuous |
| Global Property Guide, Nigeria | Rental yields by city and size band, price per square metre estimates ([Nigeria rental yields](https://www.globalpropertyguide.com/africa/nigeria/rental-yields)) | Published, attribution required | Free tier | Annual-ish |

**What all four have in common: they are area-level and asking-or-surveyed, not
transaction-level and not sold.** Knight Frank's US$55 per square metre for
prime Ikoyi is a prime-rent benchmark derived from that firm's own agency book.
It is excellent context for an area report. It cannot price a specific flat.

**Recommendation: license Estate Intel at the cheapest tier that carries
residential area pricing, before stage two, not for the estimate but for the
CALIBRATION.** If our own asking-price medians for Lekki Phase 1 diverge
materially from a second independent source, we have a data quality problem and
we need to know before a user does.

## 2.7 Listing portals

Nigeria Property Centre is the largest classifieds site and publishes an average
prices page by area
([NPC average prices](https://nigeriapropertycentre.com/market-trends/average-prices)).
PropertyPro.ng publishes a price index
([PropertyPro index](https://propertypro.ng/index)). Both are asking-price
aggregations of user-generated listings, with all the well-documented problems
of that category: prices are as published by the lister, and a fraction contain
data-entry errors.

**Scraping either is FORBIDDEN.** `docs/API_INVENTORY.md:86` is absolute, and
the legal position in Nigeria is not a defence for us anyway: contractual
liability arises where a site's terms expressly prohibit scraping and commercial
re-use
([Balogun Harold](https://balogunharold.com/is-web-scraping-illegal-in-nigeria/)),
and a whole market of off-the-shelf NPC and PropertyPro scrapers exists on Apify
and GitHub, which is evidence that the practice is widespread and not that it is
permitted. We do not do it. We do not do it behind a proxy, through a vendor,
via a third-party dataset that was itself scraped, or "just for calibration".
Any vendor offering Nigerian portal listing data should be asked in writing how
it was obtained, and refused if the answer is a crawl.

**What IS available lawfully:** a commercial data licence, negotiated. Neither
portal publishes one. **Verdict: approach both for a licence, expect no, and
build without them.**

## 2.8 Open data

- **GRID3 Nigeria** publishes settlement extents, settlement names, building footprints and block-level building counts and heights derived from Google Open Buildings, country-wide ([GRID3 Nigeria geospatial data](https://grid3.org/geospatial-data-nigeria), [Settlement Extents v4.0](https://data.grid3.org/datasets/GRID3::grid3-nga-settlement-extents-v4-0/about)). **No prices.** Genuinely useful for a neighbourhood-density and built-form context layer, and for sanity-checking whether a pin is in a settled area at all.
- **OpenStreetMap** is already in our attribution chain via the tile providers (`apps/web/src/lib/maps/tiles.ts:76-79`). ODbL, share-alike. **No prices.** Useful for points of interest, which is a lawful and free alternative to leaving `landmarks` empty.
- **National Bureau of Statistics** publishes real estate sector GDP quarterly and has published a Nigerian Real Estate Sector summary report ([NBS](https://www.nigerianstat.gov.ng/)), but **does not publish a house price index**.
- **Central Bank of Nigeria** research: Olorunsola, Bada and Bamanga, "On the Development of Residential Property Price Indices for Nigeria", CBN Journal of Applied Statistics Vol 3 Iss 2 (2012) ([CBN JAS](https://dc.cbn.gov.ng/jas/vol3/iss2/2/)). The paper's own finding is the point: hedonic and repeat-sales methods were "constrained by the nature of data available", so the authors fell back to central price tendency and stratification over a survey of selected urban cities. **The Central Bank of Nigeria could not build a repeat-sales index for Nigeria. Neither can we.**

## 2.9 Everything else credible

- **LASRERA**, the Lagos State Real Estate Regulatory Authority, maintains a register of real estate transactions, practitioners, brokers and agents under the LASRERA Law 2022, and requires licensed practitioners to keep records of business transactions ([S.P.A. Ajibade overview](https://spaajibade.com/an-overview-of-the-lagos-state-real-estate-regulatory-authority-law-2022/), [LASRERA](https://lasrera.lagosstate.gov.ng/about.jsp)). A register of transactions is precisely the thing an AVM wants. It is not public. **Worth a formal approach as a regulated-platform data partnership, and worth nothing without one.**
- **Nigerian Mortgage Refinance Company and the Federal Mortgage Bank** hold valuation data on mortgaged properties. Not public, and mortgage penetration in Nigeria is tiny.
- **A valuer panel.** The honest, buildable version of a transaction feed: pay a small panel of ESVARBON-registered firms for periodic, licensed, anonymised transaction evidence in named areas. This is what the CBN paper did with a survey, and it is the only route this research found to genuine achieved prices that is lawful, current and ours.

## 2.10 The one source nobody else has

Our own rails. Every completed booking writes a `bookings` row with a priced
snapshot captured at booking time so later listing edits cannot rewrite history
(`20260728152358_bookings_payments.sql:38-41`). Every accepted inspection that
turns into a tenancy writes a `rent_payments` row with the six move-in parts as
the listing stated them and the total actually charged
(`20260918140000_b3...:227-257`). Those are ACHIEVED figures, and nothing else
in this section produces one.

Today there are zero of them. That is the whole argument for section 6.

---

# PART 3. THE METHOD

## 3.1 What a comparables model actually needs

A comparable-sales model is four decisions and one honest statement of spread.

1. **Selection.** Which observations are comparable to the subject.
2. **Adjustment.** How each observation is adjusted towards the subject.
3. **Weighting.** How much each adjusted observation counts.
4. **Aggregation.** How the weighted set becomes a central figure and a range.
5. **Refusal.** When the set is too thin, too stale or too scattered for any of the above to mean anything, and the model says so.

Item five is the one every commercial AVM treats as an edge case and the one
this product treats as a first-class output.

**The unit of comparison.** Do not compare total prices. Compare price per
square metre where size is known, and price per bedroom where it is not, and
never mix the two in one estimate. This is the single most important modelling
decision, because it is what lets a 110 square metre two-bed inform an estimate
for a 130 square metre two-bed. It also means **the data gate must be evaluated
separately per unit**: a set of six comparables of which two state a size is a
set of two for the per-square-metre model.

**The correction to the hypothesis, first of two.** The hypothesis says stage
one ships an area report from asking prices and stage two adds a per-property
estimate behind a data gate. The gate is right. The staging is wrong in one
respect: **stage two must not ship for SALE prices at all until stage three has
run, and it may ship for RENT much earlier.** Rent is the market where a
Nigerian platform can reach honest ground fastest, because annual rent is
published far more completely than sale evidence, because rent has a much
tighter dispersion within a building type and area than capital value does, and
because our own rails produce an achieved rent figure the moment one tenancy
completes, while an achieved sale price needs a whole sale flow that this
platform does not yet have. Rent first, sale later, is the honest order.

## 3.2 Selecting the comparable set with PostGIS

Four axes, all of them already indexed or cheaply indexable.

**Radius.** `ST_DWithin` against `listings.location`, which is `geography` so
the distance argument is metres with no projection choice
(`20260809044814_the_map_stops_being_impossible.sql:74` explains exactly this).
The partial GiST index at `:126-128` is the index that serves it.

Expanding radius ladder, evaluated in order, stopping at the first rung that
satisfies the gate:

| Rung | Radius | Rationale |
| --- | --- | --- |
| 1 | 750 m | Within a Nigerian estate or a coherent neighbourhood. |
| 2 | 1,500 m | Same district; crosses a main road but not a class boundary. |
| 3 | 3,000 m | Same broad market. This is the last rung for a per-property figure. |
| 4 | same `area` text, any distance | Only for the AREA report, never for a per-property estimate. |
| 5 | same `city` | Only for the AREA report. |

Do not expand past 3 km for a per-property figure. Lagos price gradients are
brutal over short distances: the seed data alone puts Ikoyi at N1.8m a year for
a three-bed (`20260809081618...:73`) and Surulere at N260k a year for a
three-bed (`:80`), roughly 12 km apart. A 5 km radius in Lagos crosses several
markets and a 10 km radius crosses all of them.

**Property type.** Exact match on `property_type`. No fuzzing. `apartment` does
not inform `home`, `land` informs nothing but `land`, and `shop`, `office` and
`restaurant` are their own worlds. `property_type` is indexed at
`20260728152229_listings_core.sql:71` and again as a leading column of
`listings_intent_type_published_idx` at
`20260809044441_a_listing_says_whether_it_is_to_let_or_for_sale.sql:66-68`.

**Listing intent.** Exact match. A sale price never informs a rent estimate and
a rent never informs a sale estimate. Same index.

**Bedroom band.** Plus or minus one bedroom, with a penalty in the weight, and
never crossing the zero boundary: a zero-bedroom row is a shop, an office or a
studio classified oddly, and must not enter a one-bedroom set.

**Recency window.** `published_at` within 365 days, with a decay. Nigerian rents
reset annually and the naira has moved enough that a 2024 asking price is not a
2026 asking price. Rows older than 730 days are excluded outright, not
down-weighted.

**Always excluded.** `is_demo = true`. `status <> 'PUBLISHED'`. `sale_status =
'sold'` where intent is sale, because a sold listing's asking price is the one
figure we know was not accepted at, or was, and we cannot tell which. The
subject property itself, when the subject is an existing listing.

## 3.3 The SQL

This is written to be implementable without invention. It adds one RPC and one
index. It writes nothing.

### 3.3.1 The one new index

```sql
-- Comparables read published, non-demo rows by type and intent and recency.
-- listings_intent_type_published_idx already leads on (listing_intent,
-- property_type, state_code, city) but carries no recency and no demo
-- predicate, so a comparables query on it still filters a whole city's back
-- catalogue in the heap. This one is partial on exactly the set a comparable
-- may come from, which is small by construction and stays small.
create index if not exists listings_comparables_idx
  on public.listings (property_type, listing_intent, bedrooms, published_at desc)
  where status = 'PUBLISHED'
    and is_demo = false
    and location is not null;
```

The GiST index at `20260809044814...:126-128` is unchanged and still does the
radius work. Postgres will use the GiST for the `ST_DWithin` and this one for
the equality and range predicates; on a catalogue of a few hundred thousand rows
either plan is fast, and the partial predicate keeps both indexes small.

### 3.3.2 The comparable set

```sql
create or replace function public.comparable_listings(
  p_lat            double precision,
  p_lng            double precision,
  p_property_type  public.property_type,
  p_intent         public.listing_intent,
  p_bedrooms       integer,
  p_radius_m       integer default 750,
  p_max_age_days   integer default 365,
  p_exclude_id     uuid default null,
  p_limit          integer default 60
)
returns table (
  id              uuid,
  title           text,
  area            text,
  city            text,
  state_code      text,
  property_type   public.property_type,
  listing_intent  public.listing_intent,
  bedrooms        integer,
  bathrooms       integer,
  toilets         smallint,
  size_sqm        numeric,
  furnished       public.furnishing,
  condition       public.build_condition,
  published_at    timestamptz,
  age_days        integer,
  distance_m      double precision,
  -- One money column, resolved exactly as pricing.ts resolves it.
  price_minor     bigint,
  price_basis     text,
  -- Null whenever size is unstated. NEVER zero, never inferred.
  price_per_sqm_minor numeric
)
language sql
stable
set search_path = ''
as $$
  with subject as (
    select extensions.st_setsrid(
             extensions.st_makepoint(p_lng, p_lat), 4326
           )::extensions.geography as origin
  )
  select
    l.id, l.title, l.area, l.city, l.state_code,
    l.property_type, l.listing_intent, l.bedrooms, l.bathrooms, l.toilets,
    l.size_sqm, l.furnished, l.condition, l.published_at,
    (extract(epoch from (now() - l.published_at)) / 86400)::integer as age_days,
    extensions.st_distance(l.location, s.origin) as distance_m,
    case
      when l.listing_intent = 'sale' then l.sale_price_minor
      -- For rent the ADVERTISED rent is the comparable, not the move-in
      -- total: the move-in total folds in agency and legal fees that vary by
      -- agent rather than by property, so comparing totals compares agents.
      else l.rent_amount_minor
    end as price_minor,
    case
      when l.listing_intent = 'sale' then 'asking_sale'
      else 'advertised_rent_' || coalesce(l.rent_period::text, 'year')
    end as price_basis,
    case
      when l.size_sqm is null or l.size_sqm <= 0 then null
      else (
        case when l.listing_intent = 'sale'
             then l.sale_price_minor else l.rent_amount_minor end
      )::numeric / l.size_sqm
    end as price_per_sqm_minor
  from public.listings l
  cross join subject s
  where l.status = 'PUBLISHED'
    and l.is_demo = false
    and l.location is not null
    and (p_exclude_id is null or l.id <> p_exclude_id)
    and l.property_type = p_property_type
    and l.listing_intent = p_intent
    and (p_bedrooms is null or l.bedrooms between greatest(p_bedrooms - 1, 0)
                                              and p_bedrooms + 1)
    -- A zero-bedroom row never enters a set for a property that has bedrooms,
    -- and vice versa. Zero means "not a bedroomed property", not "small".
    and (p_bedrooms is null or (p_bedrooms = 0) = (l.bedrooms = 0))
    and l.published_at is not null
    and l.published_at >= now() - make_interval(days => p_max_age_days)
    and (l.listing_intent <> 'sale' or l.sale_status is distinct from 'sold')
    and case
          when l.listing_intent = 'sale' then l.sale_price_minor
          else l.rent_amount_minor
        end > 0
    -- Rent comparables must share a cycle. A monthly rent and an annual rent
    -- are not the same number and annualising a monthly rent assumes twelve
    -- months of occupancy nobody promised.
    and (p_intent <> 'rent' or l.rent_period = 'year')
    and extensions.st_dwithin(l.location, s.origin, p_radius_m)
  order by extensions.st_distance(l.location, s.origin)
  limit least(greatest(coalesce(p_limit, 60), 1), 200);
$$;

comment on function public.comparable_listings is
  'Published, non-example listings near a point that share a property type, an
   intent and a bedroom band, with distance in metres and the one money column
   resolved the same way lib/listings/pricing.ts resolves it. Returns ASKING
   and ADVERTISED figures and says so in price_basis: nothing in this database
   is a sold price. NOT security definer, so RLS decides visibility exactly as
   it does for a direct select.';
```

Two deliberate choices in that body.

**The rent comparable is `rent_amount_minor` and not `total_move_in_cost_minor`,**
even though the move-in total is the figure the shelf sorts on
(`20260809044814...:130` and
`20260918130452...:155-167` both choose the move-in total for display). Display
and comparison want different numbers. The move-in total folds in agency, legal
and agreement fees that are conventionally ten per cent of the rent each
(`20260809044514...:116-118`) and that vary by agent rather than by property.
Comparing totals compares agents. Comparing rents compares property.

**Rent comparables are restricted to `rent_period = 'year'`.** Annual dominates
the Nigerian market and is the default assumption
(`20260809044514...:63-64`), and multiplying a monthly rent by twelve assumes
twelve months of occupancy nobody promised. A monthly-let self-contained room in
Surulere is a different product from an annual tenancy and must not be silently
annualised into one. Monthly rents get their own estimate when there are enough
of them, and until then they get a refusal.

### 3.3.3 The gate, the statistics, and the range, in one call

One function, one loop over the radius ladder, one metric selector. The
per-square-metre pass and the per-property pass differ only in which column is
ordered and whether the quantiles are multiplied by the subject's size, so they
share a body rather than being written twice.

```sql
create or replace function public.estimate_value(
  p_lat            double precision,
  p_lng            double precision,
  p_property_type  public.property_type,
  p_intent         public.listing_intent,
  p_bedrooms       integer,
  p_size_sqm       numeric default null,
  p_exclude_id     uuid default null
)
returns table (
  outcome           text,      -- 'answered', or 'refused' with a code below
  refusal_code      text,
  radius_m          integer,
  comparable_count  integer,
  basis             text,      -- 'per_sqm' or 'per_property'
  low_minor         bigint,    -- 25th percentile
  mid_minor         bigint,    -- median
  high_minor        bigint,    -- 75th percentile
  dispersion        numeric,   -- (q3 - q1) / q2, the spread the range came FROM
  confidence        text,
  median_age_days   integer,
  median_distance_m integer,
  comparable_ids    uuid[]
)
language plpgsql
stable
set search_path = ''
as $$
declare
  minimum constant integer := 5;
  r       integer;
  b       text;
  scale   numeric;
  cmp     record;
begin
  foreach r in array array[750, 1500, 3000] loop
    -- 'per_sqm' first when the subject stated a size, then 'per_property'.
    -- The per_sqm pass counts only comparables that STATE a size, so a set of
    -- six of which two state one is a set of two for that pass.
    foreach b in array (case when p_size_sqm > 0
                             then array['per_sqm', 'per_property']
                             else array['per_property'] end) loop
      scale := case when b = 'per_sqm' then p_size_sqm else 1 end;

      select
        count(*)::integer                                            as n,
        percentile_cont(0.25) within group (order by m.metric)        as q1,
        percentile_cont(0.50) within group (order by m.metric)        as q2,
        percentile_cont(0.75) within group (order by m.metric)        as q3,
        percentile_cont(0.50) within group (order by m.age_days)      as age50,
        percentile_cont(0.50) within group (order by m.distance_m)    as dist50,
        array_agg(m.id order by m.distance_m)                         as ids
      into cmp
      from (
        select c.id, c.age_days, c.distance_m,
               case when b = 'per_sqm'
                    then c.price_per_sqm_minor
                    else c.price_minor::numeric end as metric
        from public.comparable_listings(
               p_lat, p_lng, p_property_type, p_intent, p_bedrooms,
               r, 365, p_exclude_id, 60) c
      ) m
      where m.metric is not null;

      if cmp.n >= minimum then
        return query select
          'answered'::text, null::text, r, cmp.n, b,
          round(cmp.q1 * scale)::bigint,
          round(cmp.q2 * scale)::bigint,
          round(cmp.q3 * scale)::bigint,
          round((cmp.q3 - cmp.q1) / nullif(cmp.q2, 0), 4),
          public.confidence_band(cmp.n,
            (cmp.q3 - cmp.q1) / nullif(cmp.q2, 0), cmp.age50, r),
          cmp.age50::integer, cmp.dist50::integer, cmp.ids;
        return;
      end if;
    end loop;
  end loop;

  -- Nothing satisfied the gate at any rung. Say which wall we hit.
  return query select
    'refused'::text,
    case when coalesce(cmp.n, 0) = 0 then 'no_comparables'
         else 'too_few_comparables' end,
    3000, coalesce(cmp.n, 0), null::text,
    null::bigint, null::bigint, null::bigint, null::numeric,
    null::text, null::integer, null::integer, '{}'::uuid[];
end;
$$;
```

The `wide_dispersion` and `stale` refusals in 3.6 are checked by the caller
against the returned `dispersion` and `median_age_days` rather than inside this
function, so that the comparables are still available to draw when the figure is
withheld.

### 3.3.4 The confidence band, derived and not decorated

```sql
create or replace function public.confidence_band(
  p_count       integer,
  p_dispersion  numeric,
  p_median_age  numeric,
  p_radius_m    integer
)
returns text
language sql
immutable
set search_path = ''
as $$
  -- Four inputs, each of which independently degrades an estimate, and the
  -- worst of the four decides. A band is a claim about how wrong this figure
  -- could be, so it is never allowed to be better than its weakest input.
  select case
    when p_count >= 15
     and p_dispersion <= 0.20
     and p_median_age <= 120
     and p_radius_m <= 750  then 'high'
    when p_count >= 8
     and p_dispersion <= 0.35
     and p_median_age <= 270
     and p_radius_m <= 1500 then 'medium'
    else 'low'
  end;
$$;

comment on function public.confidence_band is
  'The confidence label, derived from the four things that actually degrade an
   estimate: how many comparables there were, how far apart their prices were,
   how old they were, and how far the radius had to be opened to find them. The
   worst input decides. There is no input to this function that a product
   decision can set, which is the point: a confidence label that somebody can
   choose is decoration.';
```

## 3.4 Weighting, and why the default answer is "do not"

The obvious next step after selection is to weight each comparable by an inverse
function of distance, age and bedroom difference, and take a weighted mean. **Do
not do this in version one, and the reason is not simplicity.**

A weighted mean is a point estimate wearing a spread's clothes. The moment the
weights exist, the range stops being the observed dispersion of real listings
and becomes an artefact of a weighting function nobody can inspect. Percentiles
over an unweighted set have the property that every number the product prints is
a real quantile of real asking prices we actually hold, and the comparables
panel can show the reader the exact rows that produced it. That is checkable by
the user. A weighted mean is not.

**Where weighting earns its place, and the rule for admitting it:** when the
comparable set routinely exceeds about 40 rows, the unweighted interquartile
range starts to include genuinely non-comparable property and the range widens
rather than narrowing as data improves. That is the signal. At that point,
replace the unweighted percentiles with percentiles over a set that has been
TRIMMED by weight rather than averaged by it: compute a weight per comparable,
keep the top 60 per cent by weight, and take percentiles over the survivors.
Every printed number is still a real observation.

The weight function, when it is time:

```
w = w_distance * w_age * w_bedroom * w_size * w_condition

w_distance = 1 / (1 + (distance_m / 500))
w_age      = exp(-age_days / 365)
w_bedroom  = 1.0 when equal, 0.5 when one apart
w_size     = 1.0 when |log(size_subject / size_comp)| <= 0.2, else 0.6
             (1.0 always, in the per_property basis)
w_condition= 1.0 when equal or either is null, 0.8 otherwise
```

Every factor is bounded in (0, 1], so the product is interpretable and no factor
can dominate. Nothing here is fitted to data, because we have no data to fit to,
and a fitted coefficient we cannot validate is exactly the invented number this
platform forbids.

## 3.5 The range, and why its width is not a percentage

**The range is the interquartile range of the comparable set, scaled to the
subject.** Low is the 25th percentile, mid is the median, high is the 75th
percentile. In the per-square-metre basis each is multiplied by the subject's
stated size. In the per-property basis each is the quantile itself.

This has three consequences that are the whole point.

1. **In a tight market the range is narrow because the market is tight.** Twelve three-bed flats in one Lekki estate all asking between N7.5m and N8.5m a year produce a range of roughly N7.7m to N8.3m, and that narrowness is earned.
2. **In a scattered market the range is wide, visibly, and the user can see why.** Five three-bed listings in a mixed part of Yaba asking N1.8m, N2.2m, N3.5m, N6m and N9m produce a range from about N2.2m to N6m, and the comparables panel shows five rows that obviously disagree. A fixed plus-or-minus-15-per-cent band would have printed N3.0m to N4.0m over that same set, which is a lie told with a straight face.
3. **The range width becomes a quality metric we can track.** `dispersion` is returned from the RPC on every answered call. Median dispersion by area over time is the single best measure of whether our data is improving.

**Never widen the range to look humble and never narrow it to look confident.**
If the honest interquartile range spans a factor of three, the honest answer is
to refuse, not to print a range spanning a factor of three: see `wide_dispersion`
below.

## 3.6 The refusal states, precisely

Every one of these is a first-class outcome with its own copy, its own reason,
and its own next action. Following the house pattern at
`apps/web/src/components/app/Unreachable.tsx:33-56`, each says what the situation
is, makes clear the fault is not the reader's, and leaves them somewhere to go.

| Code | Trigger | What the screen says | Next action offered |
| --- | --- | --- | --- |
| `no_location` | The address could not be resolved to a point at all. | "We could not place this address on the map. Without a location we cannot find anything to compare it to." | Drop a pin manually. Or read the area report for the LGA. |
| `no_comparables` | Zero rows at 3,000 m. | "We have nothing published near here to compare this to yet. We are not going to guess." | Notify me when we can answer. Read the area report. |
| `too_few_comparables` | Between 1 and 4 rows at 3,000 m. | "We found N properties near here. That is not enough to give a figure we would stand behind. Five is our minimum." | Show the N we found anyway, labelled as nearby listings and not as an estimate. Notify me. |
| `too_few_sized` | Enough rows, but fewer than 5 state a size, and the subject stated one. | "We can tell you what nearby properties are asking. We cannot tell you a price per square metre, because most listings near here do not state a size." | Fall through to the per-property basis, which is what the RPC already does. Show the refusal only if that also fails. |
| `wide_dispersion` | Gate satisfied but `dispersion > 0.75`. | "The properties near here disagree with each other too much for a useful figure. Here is what they are asking, spread out, so you can see the disagreement yourself." | Show the comparables as a strip plot. No number. |
| `stale` | Gate satisfied but median age over 365 days at every rung. | "The nearest comparable listings are over a year old. Naira prices have moved since. We would rather say nothing than repeat an old figure." | Notify me. Area report. |
| `unsupported_type` | `property_type` in (`land`, `restaurant`, `hotel`). | Land: "Land is priced by plot, title and access, and two plots on the same street can be worth very different amounts. We do not estimate land." | A registered valuer hand-off. |
| `unsupported_period` | Rent subject whose `rent_period` is not `year`. | "We estimate annual rents. This is a monthly let, and multiplying a monthly rent by twelve is not the same thing." | Area report. Notify me. |
| `demo_only` | The only rows found are `is_demo`. | "Everything we hold near here is an example listing, not a real one. We will not build a figure from examples." | Notify me. **This is the state the entire product is in today.** |

`demo_only` deserves its own note. With 64 of 64 listings flagged as examples
(`docs/archive/PLATFORM_SURVEY_2026-09-22.md:26`), the `is_demo = false` predicate in
`comparable_listings` means that on the day this ships, **every per-property
call refuses**. That is correct and it is the proof the gate works. It is also
why stage one must carry real product value on its own.

## 3.7 Minimum viable comparable count

**Five, and the argument for five rather than three or ten.**

Three is too few because an interquartile range over three points is the middle
point twice and one of the two others, which is not a range, it is an accident.
Ten is too many because it forces a radius expansion in almost every Nigerian
neighbourhood for years, and a 3 km radius in Lagos crosses markets, so the
larger sample would be bought with a bias larger than the variance it removes.

Five gives a quartile calculation with at least one observation strictly inside
each tail, keeps the radius tight enough to stay within a market in the areas
where we will have supply first, and is the count at which the comparables panel
still fits on a 390 pixel screen without a scroll. The confidence band then does
the rest of the work: five comparables can never reach `high`, because
`confidence_band` requires 15 for that.

**Five is the floor for showing a figure. Fifteen is the floor for the word
"high".** Both numbers are in the SQL and neither is a product setting.

## 3.8 The area report, which is what stage one actually is

Same machinery, no location gate, no minimum of five, and **no per-property
figure at any point**.

```sql
create or replace function public.area_asking_summary(
  p_state_code     text,
  p_city           text default null,
  p_area           text default null,
  p_property_type  public.property_type default null,
  p_intent         public.listing_intent default 'rent',
  p_bedrooms       integer default null,
  p_max_age_days   integer default 540
)
returns table (
  scope            text,
  property_type    public.property_type,
  bedrooms         integer,
  listing_count    integer,
  p25_minor        bigint,
  median_minor     bigint,
  p75_minor        bigint,
  sized_count      integer,
  median_per_sqm_minor numeric,
  oldest_at        timestamptz,
  newest_at        timestamptz
)
language sql
stable
set search_path = ''
as $$
  select
    case when p_area is not null then 'area'
         when p_city is not null then 'city'
         else 'state' end,
    l.property_type,
    l.bedrooms,
    count(*)::integer,
    percentile_cont(0.25) within group (
      order by case when l.listing_intent = 'sale'
                    then l.sale_price_minor else l.rent_amount_minor end)::bigint,
    percentile_cont(0.50) within group (
      order by case when l.listing_intent = 'sale'
                    then l.sale_price_minor else l.rent_amount_minor end)::bigint,
    percentile_cont(0.75) within group (
      order by case when l.listing_intent = 'sale'
                    then l.sale_price_minor else l.rent_amount_minor end)::bigint,
    count(*) filter (where l.size_sqm is not null and l.size_sqm > 0)::integer,
    percentile_cont(0.50) within group (
      order by (case when l.listing_intent = 'sale'
                     then l.sale_price_minor else l.rent_amount_minor end)::numeric
               / nullif(l.size_sqm, 0)),
    min(l.published_at),
    max(l.published_at)
  from public.listings l
  where l.status = 'PUBLISHED'
    and l.is_demo = false
    and l.state_code = p_state_code
    and (p_city is null or lower(btrim(l.city)) = lower(btrim(p_city)))
    and (p_area is null or lower(btrim(l.area)) = lower(btrim(p_area)))
    and (p_property_type is null or l.property_type = p_property_type)
    and l.listing_intent = p_intent
    and (p_bedrooms is null or l.bedrooms = p_bedrooms)
    and (p_intent <> 'rent' or l.rent_period = 'year')
    and l.published_at >= now() - make_interval(days => p_max_age_days)
    and case when l.listing_intent = 'sale'
             then l.sale_price_minor else l.rent_amount_minor end > 0
  group by l.property_type, l.bedrooms
  having count(*) >= 3
  order by l.property_type, l.bedrooms;
$$;
```

Three rather than five, because an area report's claim is weaker: it says "three
two-bed flats in Yaba are currently asking between X and Y", which is a true
statement about three listings, not an estimate of anything. `listing_count`,
`oldest_at` and `newest_at` are returned so the surface can print "based on 3
listings, published between March and August 2026" beside every figure. **That
sentence is the whole product in stage one.**

The `lower(btrim(area))` match is the best available given `area` is free text
(`20260728152229_listings_core.sql:40`). It is not good enough long term, and
the fix is section 5.4.

## 3.9 Rental estimate and yield estimate

**Rental estimate: same machinery, `p_intent = 'rent'`, and nothing else
changes.** This is the version of the feature that can honestly ship first, for
the reasons in 3.1.

**Yield estimate: the same machinery run twice, and a division that is only
allowed under conditions.**

```
gross_yield = annual_rent_estimate / sale_price_estimate
```

The conditions, all of which must hold, and none of which is negotiable:

1. Both the rent estimate and the sale estimate must return `outcome = 'answered'`. A yield from one answered side and one guessed side is a guess.
2. Both must be on the same basis (`per_sqm` with both sides, or `per_property` with both sides). A per-square-metre rent over a per-property price is not a yield.
3. The yield is reported as a RANGE, and the range is `low_rent / high_price` to `high_rent / low_price`. This is deliberately the widest honest reading: the two estimates are independent, so their errors compound rather than cancel.
4. It is labelled **gross**. Never net. A net yield needs service charge, land use charge, void periods, management fees and maintenance, and we hold only the first of those (`service_charge_minor`, `20260809044514...:86`). Publishing a net yield would require inventing four numbers.
5. Confidence is the WORSE of the two confidence bands.

Global Property Guide puts Ikoyi and Victoria Island apartment yields at roughly
3 to 5.3 per cent and Abuja at 6 to 8 per cent
([Global Property Guide](https://www.globalpropertyguide.com/africa/nigeria/rental-yields)).
That is a useful external sanity check: a yield estimate outside 1 to 15 per
cent means one of the two inputs is wrong, and should be refused rather than
printed.

## 3.10 Price per square metre

**Requires exactly one thing that is optional today: `size_sqm`.**

It is computable per listing wherever `size_sqm is not null and size_sqm > 0`
(`20260809044629...:38, 59-60`), and it is indexed for that subset at `:77-79`.
The three requirements to make it a real product surface:

1. **Make size a soft requirement in the wizard.** Not a hard gate: a hard gate would block real listings, and `submitRequirements` (`apps/web/src/lib/agent/listings-schema.ts:820-930`) deliberately asks only for what every listing can answer. Instead, make the wizard ASK for it prominently with a one-line reason ("listings that state a size get found by more buyers"), and show agents the coverage rate for their own listings in `/agent/analytics`.
2. **Never infer it.** No deriving square metres from bedroom count. `optionalDecimal` at `listings-schema.ts:524-540` already bounds it at 10,000,000 and two decimal places.
3. **Report coverage beside every per-square-metre figure.** `area_asking_summary` returns `sized_count` alongside `listing_count` for exactly this. "N2.4m per square metre, from the 7 of 19 listings here that state a size" is honest. "N2.4m per square metre" alone is not.

**Land is the exception and it goes the other way.** For land, `size_sqm` is the
plot area and is effectively always present, because a land listing without a
size has no content at all (`20260809044629...:6-12`). Price per square metre is
therefore MORE available for land than for buildings, and it is also LESS
meaningful, because a plot's value is dominated by title, access, flooding and
setback rather than by area. `unsupported_type` refuses land estimates for that
reason, and the area report may still publish land asking prices per square
metre with the title mix stated beside them.

---

# PART 4. THE LAW AND THE PRIVACY

## 4.1 (a) ESVARBON, the Act, and what we may call this

### 4.1.1 Who may lawfully carry out and issue a valuation in Nigeria

The Estate Surveyors and Valuers (Registration, etc.) Act, Cap E13 LFN 2004,
originally Decree 24 of 1975, establishes ESVARBON and empowers it to determine
who are estate surveyors and valuers and to maintain the register of persons
entitled to practise
([ESVARBON](https://www.esvarbon.gov.ng/about-esvarbon/),
[NIESV](https://www.niesv.org.ng/esvarbon.php)).

The operative provision is **section 16(1)**:

> Any person, not being a registered estate surveyor and valuer, who (a) for or
> in expectation of reward, practises or holds himself out to practise as such;
> or (b) without reasonable excuse takes or uses any name, title, addition or
> description implying that he is authorised by law to practise as a registered
> estate surveyor and valuer, shall be guilty of an offence.

Penalties under **section 16(4)** are a fine not exceeding N100 with N20 a day
for a continuing offence on summary conviction, or a fine not exceeding N1,000
or up to two years' imprisonment on conviction in the High Court, with N50 a day
continuing
([text of Cap E13](https://github.com/mykeels/nigerian-laws/blob/master/2004/estate-surveyors-and-valuers-registration-etc-act-cap-e13-lfn-2004.md)).
The interpretation section, **section 19**, defines "estate surveyor and valuer"
as "any person registered as such under this Act".

**The fines are trivially small and completely beside the point.** The exposure
is not the N1,000. It is (i) criminal liability for whoever at Vallo is held to
have held the company out as practising, (ii) a regulator with a stated
"operation clear the holdouts" enforcement posture, partnering with law
enforcement to prosecute illegal practice
([THISDAY, Pathway to Effective Estate Surveying and Valuation Practice](https://www.thisdaylive.com/2026/06/20/pathway-to-effective-estate-surveying-and-valuation-practice-in-nigeria/),
[Guardian, ESVARBON harps on ethics](https://guardian.ng/property/esvarbon-harps-on-ethics-seeks-strict-adherence-to-standards/)),
and (iii) the reputational cost of a professional body publicly naming us as
quacks, in a market where our entire differentiator is being the one platform
that does not lie.

### 4.1.2 What the word "valuation" legally imports

Section 16(1)(b) is the dangerous limb and it is dangerous in a way that
surprises people. It does not require that we perform a valuation. It catches
taking or using **"any name, title, addition or description implying that he is
authorised by law to practise"**. The offence is in the IMPLICATION, and a
product feature called "Property Valuation" with a naira figure on it, sold by a
company, is an implication of authority in ordinary English.

The professional content of the word reinforces this. NIESV's Nigerian Valuation
Standards, the Green Book, adopts the International Valuation Standards and adds
Nigerian implementation requirements
([NIESV, The Green Book](https://www.niesv.org.ng/blog_details.php?articlenumber=The+Nigerian+Valuation+Standards+(The+Green+Book))).
Under IVS a valuation is a specific professional act with a stated basis of
value, a valuation date, an identified valuer, stated assumptions, an inspection
or a stated absence of one, and a signed report. **Everything our engine
produces is missing every one of those elements.** It has no valuer, no
inspection, no basis of value, no assumptions register and no signature.

There is also a useful comparative signal. In the American market, where the
regulatory question is licensure rather than registration, the Seventh Circuit
upheld dismissal of a class action alleging that Zillow's Zestimate amounted to
an unlicensed appraisal, and the ground was that Zillow is honest about labelling
it an estimate and not an appraisal
([GeekWire, Appeals court sides with Zillow](https://www.geekwire.com/2019/appeals-court-sides-zillow-lawsuit-zestimate-accuracy/)).
**The labelling was the defence.** That is a decision from a different
jurisdiction and is not authority in Nigeria, and it would be a mistake to rely
on it. It is nonetheless evidence that the naming decision is the one that
decides the exposure.

### 4.1.3 Recommendation: the name

**Product name: "Price Check".**

The co-founder's "Estimated Property Value" is a large improvement on
"valuation" and is still wrong for us, for three reasons. It contains the word
"Value", which is the noun of art in the Green Book. It is four words and two of
them are jargon, which reads badly at 390 pixels. And it describes a number,
which is precisely the thing our engine will often refuse to produce.

"Price Check" is correct because it is what the feature honestly does: it checks
what property near here is being ASKED for. It has no term of art in it. It
survives a refusal without becoming a lie, because a price check that finds
nothing is still a price check. It reads at any width. And it will still be
accurate in stage three, when we have transacted prices: a price check against
real prices is a better price check, not a different feature.

Supporting nouns, all of which avoid the regulated vocabulary:

- The number: **"asking price range"** in stage one, **"price estimate"** in stage two. Never "value", never "worth" in the result itself.
- The comparables panel: **"What it is based on"**.
- The confidence label: **"How sure we are"** with values "not very", "fairly", "quite". Avoid a percentage, which would be a made-up number.
- The area surface: **"Area prices"**.
- The share artefact: **"Area price card"**.

### 4.1.4 Should the word "valuation" appear anywhere in the product?

**Yes, exactly once, and only in a sentence that disclaims it.** Erasing the
word entirely makes the disclaimer harder to write and leaves the reader to
supply the comparison themselves, which is worse. The word appears in the
standing disclaimer and in the valuer hand-off, and nowhere else: not in a page
title, not in a heading, not in a button, not in a URL, not in a meta
description, not in an app store listing, not in marketing copy.

Concretely, the word `valuation` must not appear in:

- Any route segment. The route is `/price-check`, never `/valuation`.
- Any `<title>`, `og:title` or `og:description`. `apps/web/src/lib/listings/syndication.ts:128, 167` already holds the line that a machine-readable tag is a claim; the same reasoning applies here.
- Any push notification or email subject.
- Any `BrandIcon` label or `aria-label`.

A lint rule belongs in `apps/web/scripts/` beside the existing token checks, in
the manner of `check-css-tokens.mjs` rule 10 described at
`docs/DESIGN_DIRECTION.md:74-77`: fail the build on `valuation`, `valuer`,
`appraisal` or `appraised` anywhere in user-facing copy except the one allowed
disclaimer constant.

### 4.1.5 The exact standing disclaimer

One constant, one wording, every surface. Suggested home:
`apps/web/src/lib/valuations/disclaimer.ts`.

> **This is not a valuation.** It is a price check: a range built from what
> similar properties near here are currently being advertised for on Vallo. It
> is not a professional valuation and it is not evidence of what anything has
> sold for. Only an estate surveyor and valuer registered with ESVARBON may
> carry out a valuation in Nigeria. If you need one, we can point you to a
> registered firm.

Rules for it:

1. It appears on the result surface, not behind a `Disclosure` (`apps/web/src/components/app/Disclosure.tsx:32-36` says a thing a person needs in order to decide whether to act stays on the page).
2. The first sentence is never truncated, never collapsed and never in a tooltip.
3. It travels with any figure that leaves the product: share cards, emails, push copy, the API if one ever exists.
4. It is the ONLY place the words "valuation" and "valuer" appear, outside the hand-off link.

### 4.1.6 One more regulator, for Lagos

LASRERA registers real estate practitioners in Lagos under the Lagos State Real
Estate Regulatory Authority Law 2022 and maintains a register of real estate
transactions, practitioners, brokers and agents
([S.P.A. Ajibade](https://spaajibade.com/an-overview-of-the-lagos-state-real-estate-regulatory-authority-law-2022/),
[LASRERA](https://lasrera.lagosstate.gov.ng/about.jsp)). It is not the valuation
regulator and does not bear on the naming question. It matters for two other
reasons: our agents may need LASRERA registration, and LASRERA's transaction
register is the one Nigerian dataset that would genuinely change what this
engine can do. Both are separate work and both are worth a formal conversation.

## 4.2 (b) The Nigeria Data Protection Act 2023 and the shareable mechanic

### 4.2.1 The processing, named accurately

The Nigeria Data Protection Act 2023 establishes the Nigeria Data Protection
Commission and sets out principles, lawful bases and data subject rights
([NDPA overview, Mondaq](https://www.mondaq.com/nigeria/privacy-protection/1346676/an-overview-of-the-nigeria-data-protection-act-2023);
[KPMG Nigeria summary](https://assets.kpmg.com/content/dam/kpmg/ng/pdf/nigeria-data-protection-act2023.pdf)).
**Section 25** sets the lawful bases: consent, performance of a contract,
compliance with a legal obligation, protection of vital interests, public
interest or official authority, and legitimate interest
([Mondaq, notable provisions](https://www.mondaq.com/nigeria/privacy-protection/1433406/the-nigeria-data-protection-act-2023-notable-provisions-at-a-glance)).
Consent must be explicit, freely given, specific, informed and unambiguous, and
silence is not consent. **Section 28** requires a data protection impact
assessment where processing is likely to result in high risk to the rights and
freedoms of data subjects, and requires prior consultation with the Commission
where the DPIA says the risk is high
([Mondaq, key provisions](https://www.mondaq.com/nigeria/data-protection/1366934/the-nigerias-data-protection-act-2023-a-look-at-key-provisions-)).
**Section 34** and Part VI set out data subject rights, including the rights to
be informed, of access, to rectification and to erasure.

Now apply it.

**Is an address plus an inferred financial figure personal data?** An address on
its own is personal data whenever it relates to an identifiable person, and a
residential address usually does: the occupant is identifiable from it,
frequently by direct lookup and always by going there. Attaching an inferred
financial figure to it does not make it less personal; it creates a NEW item of
personal data about that person, derived rather than collected, which is the
classic profiling shape. **Yes. Processing an address to produce and publish an
inferred price about the property at that address is processing personal data
about the occupant or owner.**

**Is a private lookup lawful?** Yes, and the lawful basis is legitimate interest
under section 25, with the balancing test passing comfortably: the enquirer has
a genuine interest in knowing what property in an area costs, the processing is
transient, nothing is published, the inputs are already public (published
listings) and the output is shown only to the person who asked. This is the same
basis on which every estate agent in the country answers "what would my flat go
for".

**Is a shared card naming a specific private address lawful?** **No, not on
legitimate interest,** and the balancing test is where it fails rather than the
basis. Publication changes everything: the processing stops being transient, the
output reaches an audience the data subject did not choose, and the data subject
has no practical way to exercise the section 34 rights over an artefact that is
already on WhatsApp. If the sharer is not the owner, there is also no plausible
argument that the data subject would reasonably expect it.

### 4.2.2 The physical security dimension, which is not a data protection point

This is the part that matters more than the statute and that a purely legal
analysis will miss.

Between July 2025 and June 2026 at least 7,825 Nigerians were kidnapped across
1,713 incidents, a 66 per cent increase year on year, with ransom actually paid
rising from N2.56bn to N7.78bn and the collection rate rising from 5.35 per cent
to 34 per cent
([SBM Intelligence, The Economics of Nigeria's Kidnap Industry 2026](https://sbmintelligence.substack.com/p/the-economics-of-nigerias-kidnap-0a6),
[allAfrica](https://allafrica.com/stories/202609140579.html)). Kidnap for ransom
in Nigeria is a business with a target selection process, and target selection
runs on visible wealth.

**A share card that says "14 Chevron Drive, Lekki: N180 million" is a target
selection document.** It names a building, asserts the occupant is wealthy,
quantifies the wealth, and is designed to be forwarded. It does not matter that
the figure is an estimate; a kidnapper does not care about our interquartile
range. It does not matter that the sharer is the owner and consented; the
occupant of a property is not always the owner, an owner's consent does not bind
their family, and a card is forwarded far beyond where it started.

The house already understands this shape. `public.event_venue_kind` deliberately
has no value for a private residence, and the comment at
`20260804164040_events_built_to_the_audit_spec_and_shipped_off.sql:22-23` says
why: "A private residence is deliberately not an option. The enum is what makes
that unarguable, rather than a policy somebody has to remember."

**That is the precedent and it should be followed exactly: make it unarguable in
the schema, not in a policy somebody has to remember.**

### 4.2.3 Does the proposed resolution hold?

The hypothesis under test: anyone may look up any address privately, but a share
card may never carry a specific address unless the sharer has claimed and proven
that property as their own; otherwise the shareable artefact is area-level and
type-level.

**The first half holds exactly. The second half holds in principle and fails in
practice, and must be tightened.**

The private lookup is fine. Nobody's rights are engaged by a transient answer
shown to one person.

The claimed-property exception is where it breaks. Three problems:

1. **Ownership is not occupancy.** A landlord who has proven ownership may share a card naming a flat that somebody else lives in. The tenant is the person at physical risk and has consented to nothing.
2. **Proof of ownership is hard and slow.** Doing it properly means documents, a review queue and a human. Doing it quickly means a weak check, and a weak check on a mechanic whose failure mode is a kidnapping is not a trade worth making.
3. **A card is forwarded.** Consent given to share with a circle is not consent to be in that circle's forwards. This is not a hypothetical about our product; it is what a share mechanic is FOR.

**The tightened resolution, which does hold:**

> **No share artefact this platform produces ever carries a specific address, a
> street name, a house number, an estate name, a map pin, or a photograph of a
> specific property, for any user, claimed or not.**
>
> **A specific property may be shared in exactly one way: by publishing it as a
> listing.** A listing is a deliberate, reviewed, revocable act with a price the
> owner chose to advertise, and it already carries the owner's decision to be
> visible.

This costs the product almost nothing, because the shareable moment the
co-founder is actually reaching for is not "here is my address". It is "here is
what three-bedroom flats in Lekki Phase 1 are going for, and it is mad". That
card is more shareable, not less, because it is about a place rather than about
a person, and because everyone who lives in that area can argue with it.

**The "famous property" case, which the proposal raises specifically, is
refused by the same rule.** A landmark building is often somebody's home; the
"famous property" category has no bright line; and the version of this mechanic
that goes viral is the version where somebody types a politician's house. That
is not a feature, it is a news story about us.

### 4.2.4 What the DPIA has to cover

Section 28 applies: this is profiling, at scale, producing financial inferences
about identifiable individuals, with a publication surface. **A DPIA is required
before stage two ships, and it must be written before the build rather than
after it.** Minimum contents:

1. The processing described accurately, including that the output is a derived financial inference and not a collected fact.
2. The lawful basis per operation: legitimate interest for private lookup, contract for an owner's own claimed property, and nothing at all for the address-bearing share, because that operation does not exist.
3. The legitimate interest balancing test, written out, with the publication case expressly excluded.
4. The physical security risk assessment, with the kidnapping statistics cited above, and the design mitigation (no address ever leaves in a shareable artefact).
5. Retention: what we keep from a lookup and for how long. Recommendation in 5.8.
6. Data subject rights: how a person objects to us holding an estimate about their property, and what happens when they do.
7. Whether the DPIA concludes the residual risk is high, and therefore whether prior consultation with the NDPC is required. With the address-bearing share removed, the honest answer is that residual risk is not high and consultation is not required. With it included, it is, and would be.

### 4.2.5 One more right, stated plainly

**A person must be able to ask us to stop producing an estimate for their
property, and we must honour it.** This is the section 34 family of rights
applied to a derived output. Mechanically: a suppression list keyed on a
geohash cell plus a property identifier, checked before any per-property result
renders, and returning the refusal `suppressed` with copy that does not confirm
whether a suppression exists (confirming it would itself leak).

This costs one table and one check, and it is the difference between a feature
that respects the Act and a feature that recites it.

---

# PART 5. THE PRODUCT

Design law observed throughout: 390 pixels dark first
(`docs/DESIGN_DIRECTION.md:109, 200`), one blue family with no warm hue
(`docs/DESIGN_DIRECTION.md:29-33`), rounded rectangles on
`--nf-radius-control` and **no capsules** on anything carrying text, with the
ratio test at or above 0.5 of the short side being the real check
(`docs/DESIGN_DIRECTION.md:38-77`), and the two icon tiers kept separate:
`BrandIcon` for content, `UiIcon` for navigation and controls, never mixed
(`docs/ICON_SYSTEM.md:3-4, 200-206`).

## 5.1 Entry points, and why each one

Six, in order of expected value.

1. **The agent dashboard, `/agent/dashboard`.** A card: "What is it worth? Check what property near yours is asking before you set a price." This is the single highest-value placement in the product and section 6 argues why. It sits above the listing wizard entry, because the price is the decision an agent is least sure about and most wants help with.
2. **Step 5 of the listing wizard, in `apps/web/src/app/agent/list/ListingWizard.tsx`, inline beside the price field.** The moment an agent's cursor is in the rent or asking price input is the moment a price check is worth most and is least intrusive. Rendered as a quiet row in the manner of `Disclosure` (`apps/web/src/components/app/Disclosure.tsx`), opening a sheet with the range and the comparables, with a "use this" action that fills the field. **This is the feature's highest-conversion surface and its lowest-risk one, because the reader is already a lister.**
3. **The listing detail page, `/listing/[id]`.** A "how this price compares" row under the price block, answering only for the listing being viewed, where we already hold every fact. Reuses `apps/web/src/components/app/listing/ListingSpecChips.tsx` for the facts strip.
4. **The place page, `/around/[slug]`.** The area report, native to a surface that already exists and already means "this neighbourhood".
5. **Search results, `/search`, as a footer card when a search returns few or no results.** "Nothing matched. Here is what this area is actually asking." This converts a dead end into a data point and, per `apps/web/src/components/app/EmptyActions.tsx:28-35`, the quiet action has to belong to the screen it is on.
6. **The standalone route, `/price-check`.** Linked from the site footer and the dock's more menu, and the destination of every share card. This is the acquisition surface, and the only one designed to be arrived at cold.

Deliberately NOT an entry point: the home screen dock. The dock is frozen
navigation (`ARCHITECTURE_DECISIONS.md:176`) and a price check is a task rather
than a place.

## 5.2 Address entry, given that Nigerian addressing is inconsistent

This is the hardest interaction in the feature, because there is no geocoder in
the tree (`apps/web/src/lib/maps/tiles.ts` is a tile licensing module and the
whole of `lib/maps`) and because many Nigerian properties have no formal
address at all.

**The flow is a ladder from coarse to fine, and it may be stopped at any rung.**
Every rung is answerable and no rung is a required text field.

**Rung 1, State.** A select over the 37 rows of `public.states`
(`20260728151150_location_states.sql:23-28`), already read by
`apps/web/src/lib/places/queries.ts` and already rendered in sign-up. Default to
the viewer's `profiles.state_code` where they have one.

**Rung 2, Local government.** A select over `public.local_governments` for that
state (`20260804142006_people_places_and_standing.sql:58-66`), fetched lazily
through `fetchLocalGovernments` in `apps/web/src/lib/places/actions.ts:49`,
which already exists for exactly this reason: not shipping 774 rows to a phone.

**Rung 3, Area.** Typeahead over the distinct `area` values we already hold for
that LGA, which is our only source of neighbourhood vocabulary today and which
section 5.4 fixes. Free text is accepted, because refusing an area we have not
seen would refuse every area we have not seen.

**Rung 4, the pin. This is the rung that actually matters and it is a map, not
a text field.** A `MapTiler` or CARTO map (`apps/web/src/lib/maps/tiles.ts:76-79`)
centred on the chosen area, with a single draggable pin and one line of copy:
"Drag the pin to the building. We only use this to find nearby properties." A
pin is more accurate than any Nigerian street address, it needs no parser, it
needs no normaliser, and it is the exact input `ST_DWithin` wants.

**Rung 5, optional free text.** "Anything else that helps, like the estate name
or the nearest landmark." Stored with the saved estimate for the user's own
recall. Never parsed, never used in matching, never displayed to anyone else.

**Why not geocoding.** A geocoder for Nigeria is a licensing decision, a cost
and a dependency, and it would be wrong more often than a person dragging a pin.
Where the founder later wants one, the honest option set is a paid provider with
explicit commercial terms, and the same attribution discipline
`apps/web/src/lib/maps/tiles.ts:20-24` already applies to tiles.

## 5.3 The correction flow

The proposal's "the system identifies property type, bedrooms, bathrooms and
approximate size, then lets them correct it" inverts the honest order. **We
cannot identify any of those things from an address, because we hold nothing
that maps an address to a building.** Presenting a guess for correction would be
inventing four numbers and then asking the user to take responsibility for them.

**So the user states them, and the form is short.** Property type as a segmented
control over the four types we will answer for (apartment, home, shop, office),
bedrooms and bathrooms as stepper rows, size in square metres as one optional
number with the honest label "Size in square metres, if you know it. Leave it
blank if you do not." Sale or rent as a two-option segment.

Every control is a rounded rectangle. `Segmented`
(`apps/web/src/components/ui/Segmented.tsx`) and `Field`
(`apps/web/src/components/ui/Field.tsx`) are the existing components and neither
needs changing.

**Where a guess IS honest: an existing listing.** From `/listing/[id]` or from
the wizard, every fact is already on the row and is pre-filled and editable.
That is not a guess, it is a read.

## 5.4 The area vocabulary problem, and the fix

`listings.area` is free text (`20260728152229_listings_core.sql:40`) and
`submitRequirements` requires only two characters of it
(`apps/web/src/lib/agent/listings-schema.ts:867-869`). An area report keyed on
`lower(btrim(area))` fragments the first time two agents disagree about
punctuation.

**The fix, in order of cost:**

1. **Now, free:** a typeahead in the listing wizard over distinct existing `area` values in the chosen LGA, so the second agent to list in an estate picks the first agent's spelling. One query, one component, no schema change.
2. **Stage one:** a `public.neighbourhoods` reference table keyed to `local_governments`, seeded by hand for Lagos, Abuja, Port Harcourt and Ibadan, in the manner `public.landmarks` was built to be seeded (`supabase/migrations/pending/LANDMARKS.md` is the precedent for a one-page human list the founder approves). A nullable `listings.neighbourhood_id` beside the free-text `area`, never replacing it.
3. **Stage two:** report by `neighbourhood_id` where set and by `lower(btrim(area))` where not, and show the coverage.

This is not optional work. **An area report is only as good as its area key, and
ours is currently a string somebody typed.**

## 5.5 The result surface

At 390 pixels, dark, in this vertical order.

1. **The subject line.** "Three bedroom apartment, Lekki Phase 1, Lagos." Plain text, no card.
2. **The figure, or the refusal.** On an answer: a range rendered with `Amount` (`apps/web/src/components/ui/Amount.tsx:29-60`), which is already the two-tone treatment the reference set uses, as `₦7.7m to ₦8.3m` with `per year` in the muted suffix tone. The midpoint is NOT rendered larger than the bounds: a range whose middle is emphasised is a point estimate with decoration, which is the thing we are refusing to build. On a refusal: the refusal copy from 3.6, in the `EmptyState` shape that `Unreachable` uses (`apps/web/src/components/app/Unreachable.tsx:48-55`), with a `BrandIcon` and no figure anywhere on the screen.
3. **The basis line.** "Based on 9 listings within 750 m, published in the last 8 months." Small, muted, always present, never behind a tap.
4. **The confidence row.** A `StatusPill` (`apps/web/src/components/ui/StatusPill.tsx`) reading "How sure we are: fairly", with a `UiIcon` info glyph opening a sheet that explains the four inputs in plain words. The pill is a rounded rectangle, not a capsule.
5. **The standing disclaimer**, in full, from 4.1.5.
6. **What it is based on:** the comparables, section 5.6.
7. **Next actions**, section 5.7.

**The blue family rule bites here.** The obvious design instinct for a
confidence indicator is green, amber and red. `docs/DESIGN_DIRECTION.md:29-33`
forbids the warm hues outright, and the rule is that any warm hue in a reference
becomes its blue-family equivalent. Confidence is therefore expressed as
SATURATION and FILL within one blue: "quite sure" is a filled blue pill, "fairly"
is an outlined blue pill, "not very" is a muted grey-blue outline. Text carries
the meaning; colour reinforces it and never carries it alone.

## 5.6 The comparables presentation

**Show the rows. All of them, up to the set that produced the figure.** This is
the single most trust-building element in the feature and it is the one thing
competitors cannot copy without revealing that they have nothing.

Reuse `apps/web/src/components/app/ListingCard.tsx` in its compact form, with
`listing-card-model.ts` unchanged, in a horizontal scroller, with two additions
per card: distance ("420 m away") and age ("listed 3 months ago"). Both come
straight out of `comparable_listings`. The existing spec chips already render
size (`apps/web/src/components/app/listing/ListingSpecChips.tsx:34`), so a
comparable that states a size says so and one that does not simply omits the
chip, which is the existing honest behaviour.

Above the scroller, one line: **"These are asking prices from live Vallo
listings. They are not sold prices. Nobody publishes sold prices in Nigeria."**
That sentence is the most valuable copy in the feature. It is true, it explains
the limitation, and it tells the reader something about their own country that
they will repeat.

Below the scroller, in the `wide_dispersion` refusal state only, the same set is
drawn as a horizontal strip plot: one tick per comparable on a price axis, no
figure, no range. The reader sees the disagreement instead of being told about
it.

## 5.7 Next actions

Three, and which one leads depends on what the user said they came for. This
reuses the existing intent machinery at
`apps/web/src/lib/listings/intent.ts` and the `IntentTune` component
(`apps/web/src/components/app/IntentTune.tsx`).

| Intent | Primary | Secondary |
| --- | --- | --- |
| I own it | **List it on Vallo** to `/agent/list` with state, LGA, area, type, bedrooms, bathrooms, size and the suggested price PRE-FILLED from the check | Save this check |
| I am buying | **See similar nearby** to `/search` with the filter pre-applied | Save this search, which is the existing saved-search flow |
| Just curious | **See area prices** to the area report | Share the area card |

**The pre-filled listing wizard is the whole strategic point of the feature and
it must be built in version one.** Not a link to `/agent/list`. A link that
carries every field the check already collected. `apps/web/src/lib/listings/search-params.ts`
is the existing precedent for a typed URL contract, and the wizard's draft
schema (`apps/web/src/lib/agent/listings-schema.ts:563-600`) already accepts
every one of these fields optionally.

The primary is full width, the secondary is quiet and full width beneath it, per
`apps/web/src/components/app/EmptyActions.tsx:22-27`.

## 5.8 Saved checks and the notify-me state

**Saved checks** go in a new `public.saved_estimates` table, modelled on
`public.saved_searches` and deliberately NOT reusing it, because a saved search
is a query and a saved estimate is a result with a date on it. Columns: owner,
the inputs (state, LGA, area text, lat, lng, type, intent, bedrooms, bathrooms,
size), the outcome, the three figures, the dispersion, the confidence, the
comparable ids, and `created_at`. RLS owner-only, in the shape
`saved_searches_own` already uses.

**The figures are frozen at the time of the check and are never recomputed in
place.** A saved estimate that silently updates is a record of nothing. Re-check
creates a new row, and the saved list shows the history, which is the beginning
of "historical price changes" from the proposal's long list, built out of our
own product's use rather than out of data we do not have.

**Notify me when we can answer** is the refusal state's most valuable action and
the machinery already exists. `public.saved_searches` gained
`alert_cursor_at`, `alert_checked_at` and `alert_notified_at` at
`20260919183000_o2_a_saved_search_can_be_named_watched_and_told_about.sql:38-53`,
with the cursor semantics ("a match is a listing published STRICTLY after this
instant") that a notify-me needs exactly. The matcher is
`apps/web/src/lib/saved/search-alerts.ts`, which reuses `matchesFilter` from
`lib/listings/filter.ts` so the alert and the shelf cannot disagree
(`search-alerts.ts:14-21`), and it excludes demo rows deliberately
(`search-alerts.ts:24-32`).

**A price-check notify-me is a saved search with a radius.** Register it as a
`saved_searches` row whose query carries the point and the radius, and extend the
existing cron job to ask, after writing its alerts, whether any watched
price-check row has crossed its gate. One notification per person per run, which
is the rule that job already enforces (`search-alerts.ts:36-40`).

Copy for the state, following the `Unreachable` shape: "We will tell you the
moment there are enough listings near here to answer. We are not going to guess
in the meantime."

## 5.9 The claim-your-property flow

Given 4.2.3, the claim flow no longer unlocks an address-bearing share. It still
earns its place, for three other things.

1. **A private property record.** Saved checks over time for a property the owner has named, which is the personal history surface.
2. **A pre-filled listing.** The claim collects exactly what the wizard needs.
3. **Suppression.** Claiming is how an owner exercises the right in 4.2.5 to stop us estimating their property.

**The claim itself is light: a pin, the facts, and a name for it.** No document
upload, no review queue, no verification, because nothing the claim unlocks
requires proof. The instant a claim WOULD unlock something that affects another
person, it needs the full agent verification ladder
(`20260805095946_an_agent_climbs_a_verification_ladder.sql`), and the honest
design decision is to not build that door at all.

The distinction must be visible: a claimed property carries no badge, no tick and
no trust mark. `20260809080524_an_example_listing_may_never_wear_the_trust_mark.sql`
is the precedent that the trust mark means one specific thing.

## 5.10 The standalone shareable route

`/price-check` cold, and `/area/[state]/[lga]/[area]` for the share destination.

**The share artefact, per 4.2.3, is area-level and type-level and carries no
address.** An OG image generated at request time, 1200 by 630, dark, in the
blue family, reading:

> **Three bedroom flats in Lekki Phase 1**
> Asking ₦7.5m to ₦9.0m a year
> Based on 9 Vallo listings, September 2026
> Asking prices, not sold prices. vallo.ng

`apps/web/src/lib/listings/syndication.ts` is the existing metadata layer and
already holds the line that a machine-readable tag is a claim it must be able to
stand behind (`syndication.ts:128, 167`). The same module gains the area card,
and the same rule applies: **no OG image is ever generated for a refused check,
because an image is a claim and a refusal has nothing to claim.**

The share sheet reuses `apps/web/src/components/app/ReportSheet.tsx`'s sheet
anatomy and the existing share picker at `/(dev)/preview/f5/share-picker`.

## 5.11 What this reuses, named

| Need | Existing thing | Path |
| --- | --- | --- |
| Money rendering | `Amount` | `apps/web/src/components/ui/Amount.tsx` |
| Price resolution | `headlinePrice`, `moveInTotal` | `apps/web/src/lib/listings/pricing.ts:101, 264` |
| Comparable cards | `ListingCard`, `listing-card-model` | `apps/web/src/components/app/ListingCard.tsx` |
| Fact chips | `ListingSpecChips` | `apps/web/src/components/app/listing/ListingSpecChips.tsx` |
| Refusal shape | `Unreachable`, `EmptyState` | `apps/web/src/components/app/Unreachable.tsx`, `Screen.tsx` |
| Empty state actions | `EmptyActions` | `apps/web/src/components/app/EmptyActions.tsx` |
| Behind-a-tap detail | `Disclosure` | `apps/web/src/components/app/Disclosure.tsx` |
| Confidence pill | `StatusPill` | `apps/web/src/components/ui/StatusPill.tsx` |
| Type and intent choice | `Segmented` | `apps/web/src/components/ui/Segmented.tsx` |
| Numeric inputs | `Field` | `apps/web/src/components/ui/Field.tsx` |
| Sheets | `Sheet` | `apps/web/src/components/ui/Sheet.tsx` |
| Map and pin | tile provider and attribution | `apps/web/src/lib/maps/tiles.ts` |
| State and LGA pickers | `fetchLocalGovernments` | `apps/web/src/lib/places/actions.ts:49` |
| Saved and watched | `saved_searches` plus alert cursor | `20260919183000_o2_...sql:38-53`, `apps/web/src/lib/saved/search-alerts.ts` |
| URL contract | search params codec | `apps/web/src/lib/listings/search-params.ts` |
| Share metadata | syndication | `apps/web/src/lib/listings/syndication.ts` |
| Icons | `BrandIcon` content, `UiIcon` controls | `apps/web/src/design-system/icons/` |

Content icons that already exist and fit: `chart-growth`, `report-stats`,
`home-search`, `naira-coins`, `map-spot`, `seal-pending`
(`apps/web/src/design-system/icons/BrandIcon.tsx:101-180`). No new artwork is
required for version one.

---

# PART 6. THE STRATEGIC CASE

## 6.1 The hypothesis, tested

> The highest value moment for this feature is the instant before an owner
> decides to list, because a landlord who checks what his flat is worth is one
> tap from listing it directly, which makes this the cheapest supply acquisition
> channel the platform has.

**The hypothesis is right about the moment and wrong about the mechanism, and
the correction changes what gets built.**

Right about the moment. Supply is unambiguously the binding constraint:
`docs/archive/PLATFORM_SURVEY_2026-09-22.md:26` records 64 listings of which 64 are
examples, 1 agent, 0 bookings, and the survey's own gloss at `:31-35` is that
"the engine is real and the shop is empty" and that the marketing surface is
advertising stock that cannot be transacted. Everything else on the platform
works. Nothing on it has anything to sell.

Wrong about the mechanism, in one specific way. **A price check is not primarily
a conversion tool. It is a QUALIFICATION tool, and that is more valuable.** The
person who runs a price check has self-identified as somebody thinking about
their property's money. That is a far stronger signal than a visit to the
homepage, and it is available at the top of the funnel rather than the bottom.
The conversion from "checked a price" to "published a listing" will be small in
absolute terms. The conversion from "checked a price" to "is a known, reachable
property owner in a named area" is close to total, and that second asset is what
actually builds supply, through follow-up rather than through one tap.

**And there is a third thing the hypothesis misses entirely, which may be the
largest of the three: the price check is the only feature on this platform that
is USEFUL WITH ZERO SUPPLY IN A GIVEN AREA.** Every other surface degrades to an
empty state when there is nothing nearby. A price check that refuses, explains
why, and offers to tell you when it can answer is a complete and honest
experience with no inventory at all, and it collects a notify-me row that is
itself a demand signal telling us where to go and get supply.

## 6.2 The funnel, modelled

Six stages, with the honest note that **every conversion rate below is an
assumption and not a measurement, because this platform has never run this
feature and has no view counting at all** (`apps/web/src/lib/agent/analytics-queries.ts:29-35`).
They are here to be replaced by measurements, and the instrumentation in 6.4 is
what replaces them.

```
  Reach            somebody arrives at /price-check or sees an entry point
    |
  Start            they complete the state and LGA rungs
    |
  Submit           they drop a pin and state type and bedrooms
    |
  Outcome          the engine answers, or refuses with a reason
    |  \
    |   \--- Refused --> Notify me registered  (the demand signal)
    |
  Intent           they pick own / buying / curious
    |
  Convert          own --> listing wizard opened with fields pre-filled
    |
  Supply           a listing reaches PUBLISHED
```

Two things about the shape of this funnel matter more than any number in it.

**The refusal branch is not leakage.** On the day this ships, with 64 of 64
listings flagged demo, the refusal branch is 100 per cent of traffic. A notify-me
row is the only output, and it is a good one: it is a geocoded, typed statement
that a real person wanted to know about a real place. A hundred of those in one
LGA is a business case for putting an agent on the ground there.

**The `own` branch is the only one that touches supply, and it is the one
everything else should be tuned for.** A "buying" outcome sends somebody into a
catalogue of 64 examples and will disappoint them. Until supply exists, the
buying branch should be honest about that rather than routed into a dead search:
"We have nothing to show you here yet. Tell us what you are looking for and we
will come back when we do."

## 6.3 The metrics that prove or disprove it

Six, and each one has a shape that would falsify the hypothesis.

| # | Metric | Proves the hypothesis if | Disproves it if |
| --- | --- | --- | --- |
| 1 | **Check-to-wizard rate.** Of checks whose intent is "I own it", the share that open the listing wizard within the session. | Above roughly 20 per cent. A fifth of owners moving straight to listing is a supply channel. | Below about 5 per cent. Owners are curious and not motivated, and the feature is a content product rather than an acquisition one. |
| 2 | **Wizard completion rate, pre-filled versus cold.** Of wizards opened, the share reaching PUBLISHED, split by whether the fields were carried from a check. | Pre-filled completes materially better than cold. The pre-fill is doing work. | No difference. The pre-fill is decoration and the check is not lowering the barrier. |
| 3 | **Cost per published listing.** Marketing spend on the price check divided by listings published through it, against the same figure for direct agent recruitment. | Lower than direct recruitment. That is the "cheapest supply channel" claim, tested. | Higher. The claim is false and the budget belongs elsewhere. |
| 4 | **Refusal rate over time, by LGA.** The share of checks that refuse, tracked monthly. | Falls steadily in the LGAs where we recruit. The flywheel is real and measurable. | Flat for two consecutive quarters in an LGA we are actively recruiting in. Supply is not accumulating where demand is. |
| 5 | **Notify-me to published-listing lag.** Median days between a notify-me registration in an LGA and that LGA crossing its gate. | Falls. Demand signals are leading supply acquisition. | Never resolves. We are collecting promises we cannot keep, which is worse than refusing plainly. |
| 6 | **Median dispersion by area.** The `dispersion` value returned on every answered check, by area, over time. | Narrows as listing count rises. Our data is getting better and our ranges are earning their width. | Stays wide or widens. Either our area keys are fragmenting (5.4) or our comparable selection is too loose (3.2). |

Metric 6 is the one nobody would think to instrument and the one that will save
the most embarrassment. **A range that never narrows as data accumulates is
proof that the estimator is not working, and it is visible long before a user
complains.**

## 6.4 What must be instrumented from day one

**There is no analytics layer in this codebase.** `apps/web/src/lib/agent/analytics-queries.ts:29-35`
records that nothing counts a view of a listing, and the reason it refuses to
publish a conversion rate is the absence of a numerator. The observability layer
(`apps/web/src/lib/observability/`) is crash reporting with a scrubber, not
product analytics. Building this feature without instrumenting it would
reproduce exactly the hole that module complains about.

So the instrumentation is part of the feature, not a follow-up, and it is a
table rather than a third-party pixel: a third-party analytics pixel on a screen
that processes an address and a financial inference is a data protection problem
in its own right under section 25, and the honest answer is to keep it on our
own rails.

**`public.price_check_events`, minimal, honest and privacy-preserving:**

```sql
create table public.price_check_events (
  id             uuid primary key default gen_random_uuid(),
  -- Null for a signed-out check. Never backfilled from a later sign-in.
  user_id        uuid references auth.users (id) on delete set null,
  -- One row per check, so the stages of one check join to each other without
  -- joining to a person.
  check_id       uuid not null,
  stage          text not null check (stage in (
                   'reach','start','submit','outcome','intent','convert','supply')),
  entry_point    text,
  state_code     text references public.states (code),
  lga_code       text references public.local_governments (code),
  -- DELIBERATELY NOT lat/lng. A coarse cell is enough to answer every
  -- question in 6.3 and cannot be walked back to a building. Roughly 1.2 km
  -- at Nigerian latitudes.
  geohash5       text check (geohash5 is null or length(geohash5) = 5),
  property_type  public.property_type,
  listing_intent public.listing_intent,
  bedrooms       integer,
  size_stated    boolean,
  outcome        text,
  refusal_code   text,
  comparable_count integer,
  radius_m       integer,
  dispersion     numeric,
  confidence     text,
  intent_chosen  text,
  listing_id     uuid references public.listings (id) on delete set null,
  created_at     timestamptz not null default now()
);

comment on table public.price_check_events is
  'One row per stage of one price check. Location is a five character geohash
   and never a point, because every question this table exists to answer is
   answerable at 1.2 km and none of them is worth holding a building for. No
   address is ever written here.';

create index price_check_events_check_idx on public.price_check_events (check_id, created_at);
create index price_check_events_place_idx on public.price_check_events (state_code, lga_code, created_at desc);
create index price_check_events_stage_idx on public.price_check_events (stage, created_at desc);
```

RLS: no select for `anon` or `authenticated` at all. Admin read only, through the
existing admin role helpers. Insert through a security-definer RPC that writes
the row and returns nothing, so a client can record a stage and can never read
anybody's.

Retention: 24 months, swept by the existing cron machinery
(`20260804184423_the_scheduler_exists_now.sql`), and named in
`docs/RETENTION_SCHEDULE.md`.

**And one thing this table deliberately does not do: it does not store the
address, the free-text hint, or the point.** Section 4.2 is not a paragraph in a
policy; it is a column list.

## 6.5 The Property Intelligence system, honestly mapped

The proposal's long list, each item marked with what it needs and when it is
reachable.

| Capability | Needs | Reachable with our own data? | Honest timeline |
| --- | --- | --- | --- |
| **Area asking-price ranges** | 3+ real listings per area, type and bedroom band | **Yes** | The week real listings start arriving. It is stage one and it is buildable now against an empty set that refuses honestly. |
| **Price per square metre** | `size_sqm` coverage above roughly 40 per cent in an area | **Yes, partially**, and coverage must be printed beside every figure | Month 3 to 6 after real supply, conditional on the wizard nudge in 3.10 |
| **Comparables shown** | The `comparable_listings` RPC and 5+ rows | **Yes** | Same day as stage two, per area |
| **Per-property asking estimate** | 5+ non-demo comparables within 3 km | **Yes, per area, as the gate opens** | First Lagos estates around month 6 to 9 after real supply begins. Never nationally. |
| **Rental estimate** | Same, `intent = 'rent'`, `rent_period = 'year'` | **Yes, and first** | Before the sale estimate, for the reasons in 3.1 |
| **Gross yield estimate** | Both estimates answered in the same area on the same basis | **Yes, in the few areas where both sides clear the gate** | Month 12 or later. Ikoyi, Victoria Island and Lekki Phase 1 first, if anywhere. |
| **Net yield** | Void rates, management fees, maintenance, land use charge | **No.** We hold only service charge (`20260809044514...:86`) | Not reachable. Do not build it. Explain why on the page. |
| **Area price TRENDS over time** | A time series of our own asking prices, which requires history we do not yet have | **Yes, and only by waiting.** The first honest trend line needs at least four quarters of real listings in one area | Month 15 at the earliest. Any trend line before then is two points and a straight edge. |
| **Historical price changes for one property** | Repeat observations of the same property | **Yes, weakly:** a re-listed property gives us two asking prices, and a saved check history gives a user their own series | Month 18. Genuine repeat-sales needs sold prices and is not reachable. |
| **Neighbourhood insights** (power, water, security, access) | `power_grid`, `power_backup`, `water_supply`, `prepaid_meter`, `has_estate_access` (`20260804160509_light_water_and_getting_through_the_gate.sql:51-55, 173`) | **Yes, and this is the most underrated asset in the schema.** Nobody else in Nigeria collects structured power and water facts per listing. | Stage one. It needs no prices at all. |
| **Sold prices and true transaction evidence** | Our own completed sales, or a licensed feed | **No, not from anywhere, today.** Stage three, and only for what transacts on our rails | Year 2 at the earliest for rent, and only if the rent payment flow carries real volume |
| **Achieved rents** | Completed `rent_payments` rows (`20260918140000_b3...:227-257`) | **Yes. This is the flywheel and it is already built.** | From the first completed tenancy. The schema is done; the supply is not. |

**Read that table's last two rows together, because they are the real strategy.**
The flywheel does not start with sales. It starts with tenancies, because
`rent_payments` already records the six move-in parts as the listing stated them
and the total actually charged, per inspection, and `bookings` already captures a
priced snapshot at booking time so later edits cannot rewrite history
(`20260728152358_bookings_payments.sql:38-41`). **The moment one tenancy
completes on our rails we hold one achieved rent, which is one more than anybody
else in Nigeria publishes.** A thousand of them is a rental index nobody can
replicate.

The correction to the hypothesis, second of two: **stage three is not "when we
have sold prices". Stage three is "when we have achieved rents", and it is much
closer than it looks.**

## 6.6 What to build, in order

1. **Now, before any supply exists:** the `comparable_listings` and `estimate_value` RPCs, the refusal states, the `/price-check` route, the notify-me, and `price_check_events`. Every check refuses. That is the product working.
2. **With the same release:** the area report, the neighbourhood insights surface (which needs no prices), and the area share card.
3. **Same release, non-negotiable:** the pre-filled listing wizard hand-off, because it is the entire strategic case.
4. **Before stage two:** the DPIA, the neighbourhoods reference table, the wizard size nudge, the area typeahead, and an Estate Intel licence for calibration.
5. **When an area first clears the gate:** per-property rent estimates in that area only, gated per area, never switched on nationally.
6. **When four quarters of real listings exist in an area:** the trend line for that area, and not before.

---

# PART 7. HONESTY LOG

Everything this research could not verify, with the reason.

**About our own code and data**

1. **The 22 listings this tree does not explain.** `docs/archive/PLATFORM_SURVEY_2026-09-22.md:26` records 64 listings in the live project. The only listing seed in the migration tree is `20260809081618_forty_two_example_properties_across_four_cities.sql`, which inserts 42. The other 22 are not created by any migration here. I did not query the live database, so I cannot say what they are, whether they carry sizes or pins, or whether all 22 are also `is_demo`. The survey says 64 of 64 are, and I have relied on that.
2. **Live row counts generally.** Every count in Part 1 comes from `docs/archive/PLATFORM_SURVEY_2026-09-22.md`, dated 22 September 2026, and from the migration tree. I did not run a query against the database, per the instruction not to write to it and my own decision not to read from it either.
3. **Whether `listings.published_at` is reliably set on real listings.** The seed rows all set it explicitly. The publish path that sets it in production was not traced.
4. **Whether `size_sqm` coverage on real listings will resemble the seed.** All 42 seed rows carry a size. I have assumed real coverage will be far lower and have designed for that, but I have no measurement, because there are no real listings.
5. **The exact behaviour of the Postgres planner on the proposed `listings_comparables_idx` combined with the existing GiST index.** Neither index was created and no `EXPLAIN` was run. The SQL in Part 3 is written to be correct; its plans are untested.
6. **The `dispersion > 0.75` threshold for `wide_dispersion`, the 365 and 730 day windows, the 750/1500/3000 metre ladder, and the 15/8 counts in `confidence_band`.** These are reasoned from Nigerian market structure and from the shape of the seed data. None is fitted to observations, because there are no observations. Every one of them should be revisited the first time an area clears the gate.
7. **Whether the listing wizard's step 5 is the right insertion point structurally.** `apps/web/src/app/agent/list/ListingWizard.tsx` is over 2,100 lines and I read only the two regions touching size and the review summary.
8. **Whether extending the saved-search alert cron to carry a price-check watch is straightforward.** I read `apps/web/src/lib/saved/search-alerts.ts` and the O2 migration header but not `apps/web/src/lib/cron/jobs/saved-search-alerts.ts`.

**About Nigerian sources and law**

9. **The full text of the Estate Surveyors and Valuers (Registration, etc.) Act Cap E13.** `placng.org` is blocked by this environment's egress proxy. The section 16(1), 16(4) and 19 wording quoted in 4.1.1 comes from a third-party reproduction of the Act on GitHub and should be checked against the gazette or a law report before any product copy relies on it.
10. **The Nigeria Data Protection Act 2023 primary text.** `cert.gov.ng`, `ndpc.gov.ng`, `fpf.org` and `mondaq.com` are all blocked by this environment's egress proxy. Section numbers 25, 28 and 34 come from Nigerian law firm and commission summaries, not from the Act itself. **A lawyer must confirm the section numbers before they appear in a privacy notice.**
11. **The NDPC General Application and Implementation Directive 2025.** Could not be fetched. The DPIA trigger categories in 4.2.4 are therefore derived from section 28's general wording as summarised, not from the Directive's list.
12. **The Nigerian Valuation Standards (Green Book) text.** `niesv.org.ng` is blocked by this environment's egress proxy. The characterisation of what the Green Book requires of a valuation, in 4.1.2, comes from NIESV's own description page and from the general IVS framework it adopts. I could not confirm whether the Green Book expressly addresses automated valuation models, desktop valuations or indicative estimates, which is the single most useful thing it could say for this feature.
13. **The Lagos State Official Gazette No. 9, Vol. 54 of 15 March 2021.** Not obtained. Its existence, date and several per-square-metre figures come from Estate Intel's guidance page and from law firm commentary. The actual schedule was not read, its full area coverage is unknown, and whether a later gazette supersedes it is unknown. **Do not publish gazetted figures until somebody has the gazette.**
14. **Whether the Lagos Land Use Charge assessment roll is public.** No provision either way was found. `landsbureau.lagosstate.gov.ng` is blocked by this environment's egress proxy.
15. **Estate Intel's actual API coverage, pricing and redistribution terms.** `estateintel.com` and `developer.estateintel.com` were both unreachable from this environment. The price range of US$100 to US$700 a month, and the ei Pro tier, come from press coverage dated 2020 and later and may be stale. **Terms on redistribution, which is what matters if we ever show their figures to a user, are entirely unverified.**
16. **Nigeria Property Centre's and PropertyPro's terms of service.** `nigeriapropertycentre.com` is blocked by this environment's egress proxy. It does not matter for the scraping question, which is settled by our own rule at `docs/API_INVENTORY.md:86` regardless of what their terms say, but it does mean I cannot state whether either offers a licence.
17. **Whether LASRERA's transaction register can be accessed by a regulated platform.** No published route was found. This is a conversation, not a lookup.
18. **The "recorded sale prices are often 20 to 40 per cent below actual transaction values" claim** in 2.1's background comes from a commercial blog and could not be traced to a primary source. I have not relied on the specific figures, only on the direction, which is corroborated by the consent-fee structure creating an incentive to under-declare.
19. **Whether any Nigerian regulator has taken enforcement action against a proptech platform for publishing estimates.** No such case was found. Absence of a found case is not evidence that none exists.
20. **The Zillow Seventh Circuit outcome** is reported by a technology publication rather than read from the judgment, and is in any event a foreign decision of no authority in Nigeria. It appears in 4.1.2 as a design signal, not as legal comfort.

**About the model**

21. **Whether five is the right minimum.** The argument in 3.7 is a reasoned one about quartiles, radius and screen space. It is not validated against any Nigerian dataset, because no Nigerian dataset with sold prices exists to validate it against.
22. **Whether the interquartile range is the right range.** It is the honest range given unweighted percentiles over a small set. A confidence interval would be more defensible statistically and would require distributional assumptions we cannot support with five observations.
23. **Whether restricting rent comparables to `rent_period = 'year'` will leave too little data in areas where monthly lets dominate.** Plausible, unmeasured, and the mitigation is the `unsupported_period` refusal rather than a silent annualisation.
