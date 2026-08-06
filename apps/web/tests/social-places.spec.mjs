/**
 * The way in: 37 states, 774 local governments, and the door that opens the
 * first time somebody walks through it.
 *
 * Self-contained node script, no runner and no config, matching the other specs
 * in this directory. It has two parts and they run under different conditions.
 *
 * **Part one needs nothing.** `places-schema.ts` is a client-safe module, so it
 * is imported here through Node's type stripping and the product's own rules
 * are tested rather than a copy of them written into the test.
 *
 * **Part two renders the screen.** This sandbox has no route to the Supabase
 * host by organisation proxy policy, so against a build with real keys every
 * social route shows its designed unconfigured state and no chip is ever drawn.
 * Rather than assert nothing, this spec carries its own stand-in for PostgREST
 * holding Nigeria's real reference data, all 37 states and all 774 local
 * governments, four places already open, and an `enter_place` endpoint that
 * behaves the way the real function was probed to behave: idempotent, ACTIVE on
 * first entry, and RM030 for a code that is not on the list.
 *
 *   node apps/web/tests/social-places.spec.mjs --serve     # stand-in only
 *   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54331 \
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=standin \
 *   NEXT_DIST_DIR=.next-a2places npm run build --workspace @naijafinds/web
 *   cd apps/web && NEXT_DIST_DIR=.next-a2places npx next start -p 3232
 *   node apps/web/tests/social-places.spec.mjs
 *
 * Against any other build the render section says plainly that it did not run
 * and counts nothing. A green check that cannot fail is worse than no check.
 *
 * **The harness property from SOCIAL_AUDIT 11.4 applies here too.** A Next
 * response that reads from this stand-in stays open for about seven seconds
 * after its last byte, so `/around`, which has a `loading.tsx`, shows its
 * skeleton for those seconds and then resolves. The waits below allow for it.
 * That is the harness, not the product.
 *
 * **The signed-in half.** The write path needs a session, so the browser is
 * given the auth cookie `@supabase/ssr` looks for and the stand-in answers
 * `/auth/v1/user` with a person. That is enough for `resolveSession()` to
 * return signed-in and for the server action to run for real. What it cannot
 * prove is RLS, because the stand-in has no policies: the database half was
 * proven separately by calling `public.enter_place` through `private.probe_as`
 * with `set local role authenticated`, which is the only way to test a policy.
 */

import { fileURLToPath } from "node:url";

/* Node 22 needs the flag to import a TypeScript module; 23 and later do not. */
if (!process.execArgv.includes("--experimental-strip-types")) {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--no-warnings",
      fileURLToPath(import.meta.url),
      ...process.argv.slice(2),
    ],
    { stdio: "inherit" },
  );
  process.exit(result.status ?? 1);
}

import { createServer } from "node:http";
import { chromium } from "playwright-core";

const { LGA_CODE_RE, PLACE_COPY, ENTER_FAILURE, ENTER_SQLSTATE, enterPlaceSchema } =
  await import("../src/lib/social/places-schema.ts");

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const STANDIN_PORT = Number(process.env.SOCIAL_STANDIN_PORT ?? 54331);
const WAIT = 1500;

let failures = 0;
function check(name, condition) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}`);
  }
}

/* ------------------------------------------------------------------ part one
 * The rules the product ships. No browser, no server, no database.
 * ------------------------------------------------------------------------ */

console.log("\nthe rules, from places-schema.ts");

for (const [label, code, expected] of [
  ["a real code", "la_eti_osa", true],
  ["a one word local government", "kn_dala", true],
  ["the FCT area council", "fc_municipal_area_council", true],
  ["an empty code", "", false],
  ["a slug is not a code", "eti-osa-lagos", false],
  ["a code with a capital", "LA_ETI_OSA", false],
  ["an injection attempt", "la_eti_osa; drop table areas", false],
]) {
  check(`${label} (${JSON.stringify(code)})`, LGA_CODE_RE.test(code) === expected);
}

check(
  "the schema accepts a real code",
  enterPlaceSchema.safeParse({ lgaCode: "la_ikeja" }).success === true,
);
check(
  "the schema refuses a slug",
  enterPlaceSchema.safeParse({ lgaCode: "ikeja-lagos" }).success === false,
);
check(
  "the schema trims before it judges",
  enterPlaceSchema.safeParse({ lgaCode: "  la_ikeja  " }).success === true,
);

/* Every refusal the database can raise has a sentence, and every sentence is
   one somebody can act on rather than a code on a screen. */
check("RM030 is mapped", ENTER_SQLSTATE.noSuchLga === "RM030");
check("RM031 is mapped", ENTER_SQLSTATE.couldNotOpen === "RM031");
check("a raw duplicate key is mapped too", ENTER_SQLSTATE.slugTaken === "23505");
for (const [name, sentence] of Object.entries(ENTER_FAILURE)) {
  check(`${name} says something a person can act on`, sentence.length > 30);
}

/* House rules, on this layer's own copy. */
const allCopy = [
  ...Object.values(ENTER_FAILURE),
  ...Object.values(PLACE_COPY).filter((value) => typeof value === "string"),
  PLACE_COPY.searchInState("Lagos"),
  PLACE_COPY.lgaHint("Lagos", 20),
  PLACE_COPY.withinTitle("Eti-Osa"),
].join(" ");
check("no em dash anywhere in the copy", !allCopy.includes("\u2014"));
check(
  "no banned word in the copy",
  !/\b(demo|sample|preview|not live)\b/i.test(allCopy),
);
check("the lede names the FCT rather than only the states", /Federal Capital Territory/.test(PLACE_COPY.lede));

/* ------------------------------------------------------------------ part two
 * Nigeria, as the stand-in serves it.
 * ------------------------------------------------------------------------ */

/** state code | state name | comma separated local governments, real rows. */
const REFERENCE = `AB|Abia|Aba North,Aba South,Arochukwu,Bende,Ikwuano,Isiala Ngwa North,Isiala Ngwa South,Isuikwuato,Obi Ngwa,Ohafia,Osisioma,Ugwunagbo,Ukwa East,Ukwa West,Umu Nneochi,Umuahia North,Umuahia South
AD|Adamawa|Demsa,Fufore,Ganye,Girei,Gombi,Guyuk,Hong,Jada,Lamurde,Madagali,Maiha,Mayo-Belwa,Michika,Mubi North,Mubi South,Numan,Shelleng,Song,Toungo,Yola North,Yola South
AK|Akwa Ibom|Abak,Eastern Obolo,Eket,Esit Eket,Essien Udim,Etim Ekpo,Etinan,Ibeno,Ibesikpo Asutan,Ibiono-Ibom,Ika,Ikono,Ikot Abasi,Ikot Ekpene,Ini,Itu,Mbo,Mkpat-Enin,Nsit-Atai,Nsit-Ibom,Nsit-Ubium,Obot Akara,Okobo,Onna,Oron,Oruk Anam,Udung-Uko,Ukanafun,Uruan,Urue-Offong/Oruko,Uyo
AN|Anambra|Aguata,Anambra East,Anambra West,Anaocha,Awka North,Awka South,Ayamelum,Dunukofia,Ekwusigo,Idemili North,Idemili South,Ihiala,Njikoka,Nnewi North,Nnewi South,Ogbaru,Onitsha North,Onitsha South,Orumba North,Orumba South,Oyi
BA|Bauchi|Alkaleri,Bauchi,Bogoro,Damban,Darazo,Dass,Gamawa,Ganjuwa,Giade,Itas/Gadau,Jama'are,Katagum,Kirfi,Misau,Ningi,Shira,Tafawa Balewa,Toro,Warji,Zaki
BE|Benue|Ado,Agatu,Apa,Buruku,Gboko,Guma,Gwer East,Gwer West,Katsina-Ala,Konshisha,Kwande,Logo,Makurdi,Obi,Ogbadibo,Ohimini,Oju,Okpokwu,Otukpo,Tarka,Ukum,Ushongo,Vandeikya
BO|Borno|Abadam,Askira/Uba,Bama,Bayo,Biu,Chibok,Damboa,Dikwa,Gubio,Guzamala,Gwoza,Hawul,Jere,Kaga,Kala/Balge,Konduga,Kukawa,Kwaya Kusar,Mafa,Magumeri,Maiduguri,Marte,Mobbar,Monguno,Ngala,Nganzai,Shani
BY|Bayelsa|Brass,Ekeremor,Kolokuma/Opokuma,Nembe,Ogbia,Sagbama,Southern Ijaw,Yenagoa
CR|Cross River|Abi,Akamkpa,Akpabuyo,Bakassi,Bekwarra,Biase,Boki,Calabar Municipal,Calabar South,Etung,Ikom,Obanliku,Obubra,Obudu,Odukpani,Ogoja,Yakuur,Yala
DE|Delta|Aniocha North,Aniocha South,Bomadi,Burutu,Ethiope East,Ethiope West,Ika North East,Ika South,Isoko North,Isoko South,Ndokwa East,Ndokwa West,Okpe,Oshimili North,Oshimili South,Patani,Sapele,Udu,Ughelli North,Ughelli South,Ukwuani,Uvwie,Warri North,Warri South,Warri South West
EB|Ebonyi|Abakaliki,Afikpo North,Afikpo South,Ebonyi,Ezza North,Ezza South,Ikwo,Ishielu,Ivo,Izzi,Ohaozara,Ohaukwu,Onicha
ED|Edo|Akoko-Edo,Egor,Esan Central,Esan North-East,Esan South-East,Esan West,Etsako Central,Etsako East,Etsako West,Igueben,Ikpoba-Okha,Oredo,Orhionmwon,Ovia North-East,Ovia South-West,Owan East,Owan West,Uhunmwonde
EK|Ekiti|Ado-Ekiti,Efon,Ekiti East,Ekiti South-West,Ekiti West,Emure,Gbonyin,Ido-Osi,Ijero,Ikere,Ikole,Ilejemeje,Irepodun/Ifelodun,Ise/Orun,Moba,Oye
EN|Enugu|Aninri,Awgu,Enugu East,Enugu North,Enugu South,Ezeagu,Igbo-Etiti,Igbo-Eze North,Igbo-Eze South,Isi-Uzo,Nkanu East,Nkanu West,Nsukka,Oji River,Udenu,Udi,Uzo-Uwani
FC|FCT (Abuja)|Abaji,Bwari,Gwagwalada,Kuje,Kwali,Municipal Area Council
GO|Gombe|Akko,Balanga,Billiri,Dukku,Funakaye,Gombe,Kaltungo,Kwami,Nafada,Shongom,Yamaltu/Deba
IM|Imo|Aboh Mbaise,Ahiazu Mbaise,Ehime Mbano,Ezinihitte,Ideato North,Ideato South,Ihitte/Uboma,Ikeduru,Isiala Mbano,Isu,Mbaitoli,Ngor Okpala,Njaba,Nkwerre,Nwangele,Obowo,Oguta,Ohaji/Egbema,Okigwe,Onuimo,Orlu,Orsu,Oru East,Oru West,Owerri Municipal,Owerri North,Owerri West
JI|Jigawa|Auyo,Babura,Biriniwa,Birnin Kudu,Buji,Dutse,Gagarawa,Garki,Gumel,Guri,Gwaram,Gwiwa,Hadejia,Jahun,Kafin Hausa,Kaugama,Kazaure,Kiri Kasama,Kiyawa,Maigatari,Malam Madori,Miga,Ringim,Roni,Sule Tankarkar,Taura,Yankwashi
KD|Kaduna|Birnin Gwari,Chikun,Giwa,Igabi,Ikara,Jaba,Jema'a,Kachia,Kaduna North,Kaduna South,Kagarko,Kajuru,Kaura,Kauru,Kubau,Kudan,Lere,Makarfi,Sabon Gari,Sanga,Soba,Zangon Kataf,Zaria
KE|Kebbi|Aleiro,Arewa Dandi,Argungu,Augie,Bagudo,Birnin Kebbi,Bunza,Dandi,Fakai,Gwandu,Jega,Kalgo,Koko/Besse,Maiyama,Ngaski,Sakaba,Shanga,Suru,Wasagu/Danko,Yauri,Zuru
KN|Kano|Ajingi,Albasu,Bagwai,Bebeji,Bichi,Bunkure,Dala,Dambatta,Dawakin Kudu,Dawakin Tofa,Doguwa,Fagge,Gabasawa,Garko,Garun Mallam,Gaya,Gezawa,Gwale,Gwarzo,Kabo,Kano Municipal,Karaye,Kibiya,Kiru,Kumbotso,Kunchi,Kura,Madobi,Makoda,Minjibir,Nasarawa,Rano,Rimin Gado,Rogo,Shanono,Sumaila,Takai,Tarauni,Tofa,Tsanyawa,Tudun Wada,Ungogo,Warawa,Wudil
KO|Kogi|Adavi,Ajaokuta,Ankpa,Bassa,Dekina,Ibaji,Idah,Igalamela-Odolu,Ijumu,Kabba/Bunu,Kogi,Lokoja,Mopa-Muro,Ofu,Ogori/Magongo,Okehi,Okene,Olamaboro,Omala,Yagba East,Yagba West
KT|Katsina|Bakori,Batagarawa,Batsari,Baure,Bindawa,Charanchi,Dan Musa,Dandume,Danja,Daura,Dutsi,Dutsin Ma,Faskari,Funtua,Ingawa,Jibia,Kafur,Kaita,Kankara,Kankia,Katsina,Kurfi,Kusada,Mai'Adua,Malumfashi,Mani,Mashi,Matazu,Musawa,Rimi,Sabuwa,Safana,Sandamu,Zango
KW|Kwara|Asa,Baruten,Edu,Ekiti,Ifelodun,Ilorin East,Ilorin South,Ilorin West,Irepodun,Isin,Kaiama,Moro,Offa,Oke Ero,Oyun,Pategi
LA|Lagos|Agege,Ajeromi-Ifelodun,Alimosho,Amuwo-Odofin,Apapa,Badagry,Epe,Eti-Osa,Ibeju-Lekki,Ifako-Ijaiye,Ikeja,Ikorodu,Kosofe,Lagos Island,Lagos Mainland,Mushin,Ojo,Oshodi-Isolo,Shomolu,Surulere
NA|Nasarawa|Akwanga,Awe,Doma,Karu,Keana,Keffi,Kokona,Lafia,Nasarawa,Nasarawa Egon,Obi,Toto,Wamba
NI|Niger|Agaie,Agwara,Bida,Borgu,Bosso,Chanchaga,Edati,Gbako,Gurara,Katcha,Kontagora,Lapai,Lavun,Magama,Mariga,Mashegu,Mokwa,Munya,Paikoro,Rafi,Rijau,Shiroro,Suleja,Tafa,Wushishi
OG|Ogun|Abeokuta North,Abeokuta South,Ado-Odo/Ota,Ewekoro,Ifo,Ijebu East,Ijebu North,Ijebu North East,Ijebu Ode,Ikenne,Imeko Afon,Ipokia,Obafemi Owode,Odeda,Odogbolu,Ogun Waterside,Remo North,Sagamu,Yewa North,Yewa South
ON|Ondo|Akoko North-East,Akoko North-West,Akoko South-East,Akoko South-West,Akure North,Akure South,Ese Odo,Idanre,Ifedore,Ilaje,Ile Oluji/Okeigbo,Irele,Odigbo,Okitipupa,Ondo East,Ondo West,Ose,Owo
OS|Osun|Aiyedaade,Aiyedire,Atakunmosa East,Atakunmosa West,Boluwaduro,Boripe,Ede North,Ede South,Egbedore,Ejigbo,Ife Central,Ife East,Ife North,Ife South,Ifedayo,Ifelodun,Ila,Ilesa East,Ilesa West,Irepodun,Irewole,Isokan,Iwo,Obokun,Odo Otin,Ola Oluwa,Olorunda,Oriade,Orolu,Osogbo
OY|Oyo|Afijio,Akinyele,Atiba,Atisbo,Egbeda,Ibadan North,Ibadan North-East,Ibadan North-West,Ibadan South-East,Ibadan South-West,Ibarapa Central,Ibarapa East,Ibarapa North,Ido,Irepo,Iseyin,Itesiwaju,Iwajowa,Kajola,Lagelu,Ogbomosho North,Ogbomosho South,Ogo Oluwa,Olorunsogo,Oluyole,Ona Ara,Orelope,Ori Ire,Oyo East,Oyo West,Saki East,Saki West,Surulere
PL|Plateau|Barkin Ladi,Bassa,Bokkos,Jos East,Jos North,Jos South,Kanam,Kanke,Langtang North,Langtang South,Mangu,Mikang,Pankshin,Qua'an Pan,Riyom,Shendam,Wase
RI|Rivers|Abua/Odual,Ahoada East,Ahoada West,Akuku-Toru,Andoni,Asari-Toru,Bonny,Degema,Eleme,Emohua,Etche,Gokana,Ikwerre,Khana,Obio/Akpor,Ogba/Egbema/Ndoni,Ogu/Bolo,Okrika,Omuma,Opobo/Nkoro,Oyigbo,Port Harcourt,Tai
SO|Sokoto|Binji,Bodinga,Dange Shuni,Gada,Goronyo,Gudu,Gwadabawa,Illela,Isa,Kebbe,Kware,Rabah,Sabon Birni,Shagari,Silame,Sokoto North,Sokoto South,Tambuwal,Tangaza,Tureta,Wamako,Wurno,Yabo
TA|Taraba|Ardo Kola,Bali,Donga,Gashaka,Gassol,Ibi,Jalingo,Karim Lamido,Kumi,Lau,Sardauna,Takum,Ussa,Wukari,Yorro,Zing
YO|Yobe|Bade,Bursari,Damaturu,Fika,Fune,Geidam,Gujba,Gulani,Jakusko,Karasuwa,Machina,Nangere,Nguru,Potiskum,Tarmuwa,Yunusari,Yusufari
ZA|Zamfara|Anka,Bakura,Birnin Magaji/Kiyaw,Bukkuyum,Bungudu,Gummi,Gusau,Kaura Namoda,Maradun,Maru,Shinkafi,Talata Mafara,Tsafe,Zurmi`;

/** The database's own rule, verified against all 774 rows before it was used. */
const codeFor = (stateCode, name) =>
  `${stateCode.toLowerCase()}_${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")}`;

const STATES = [];
const LGAS = [];
for (const line of REFERENCE.split("\n")) {
  const [code, name, names] = line.split("|");
  STATES.push({ code, name });
  for (const lga of names.split(",")) {
    LGAS.push({ code: codeFor(code, lga), state_code: code, name: lga });
  }
}

console.log("\nthe country, as the fixture holds it");
check("36 states and the FCT", STATES.length === 37);
check("774 local governments", LGAS.length === 774);
check("Kano has 44", LGAS.filter((l) => l.state_code === "KN").length === 44);
check("every code is unique", new Set(LGAS.map((l) => l.code)).size === 774);
check("every code is the shape the schema accepts", LGAS.every((l) => LGA_CODE_RE.test(l.code)));

const USER = "aaaa0000-0000-4000-8000-00000000000a";

const area = (over) => ({
  id: null,
  slug: "",
  name: "",
  kind: "AREA",
  city: "Lagos",
  state_code: "LA",
  area: null,
  blurb: null,
  status: "ACTIVE",
  lga_code: null,
  within_lga_code: null,
  member_count: 0,
  post_count: 0,
  slow_mode: false,
  opened_at: "2026-01-01T00:00:00Z",
  created_by: null,
  decision_note: null,
  ...over,
});

/* The four places the live database actually holds, plus the two that are
   local governments themselves. Mutable on purpose: `enter_place` pushes into
   it, which is what lets the reload assertion mean anything. */
const DATA = {
  feature_flags: [{ key: "social", enabled: true }],
  states: STATES,
  local_governments: LGAS,
  areas: [
    area({
      id: "b7f5e8f6-c9bd-49b8-adf9-7953c147b114",
      slug: "eti-osa-lagos",
      name: "Eti-Osa",
      city: "Eti-Osa",
      area: "Eti-Osa",
      lga_code: "la_eti_osa",
      within_lga_code: "la_eti_osa",
      member_count: 12,
      blurb: "Everything happening in Eti-Osa, Lagos.",
    }),
    area({
      id: "0cd39842-9f10-43f2-babe-4fa2d35a1e95",
      slug: "lekki-phase-1-lagos",
      name: "Lekki Phase 1",
      area: "Lekki Phase 1",
      within_lga_code: "la_eti_osa",
      member_count: 4,
    }),
    area({
      id: "440605de-73d5-4b62-ba17-e0df3c413486",
      slug: "yaba-lagos",
      name: "Yaba",
      area: "Yaba",
      within_lga_code: "la_lagos_mainland",
      member_count: 7,
    }),
    area({
      id: "5b220e27-818d-47ae-9366-ec762feaca66",
      slug: "surulere-lagos",
      name: "Surulere",
      area: "Surulere",
      lga_code: "la_surulere",
      within_lga_code: "la_surulere",
      member_count: 2,
    }),
  ],
  area_members: [],
  area_moderator_applications: [],
  social_profiles: [{ user_id: USER, handle: "spec_walker", display_label: "Walker", avatar_path: null, is_agent: false }],
  posts: [],
  post_media: [],
  post_reactions: [],
  post_reposts: [],
  mutes: [],
  stories: [],
  listings: [],
  reviews: [],
  notifications: [],
};

/**
 * The two SYSTEM entries `private.open_place_entries` writes when a place
 * opens, reproduced from the migration so the screen half can prove they land
 * on a card. Both are true and both are timeless: the only number in either is
 * a count of local governments, which does not move.
 */
const MONEY_RULE =
  "Never send money for a place you have not stood inside. Message the agent, " +
  "arrange the inspection, see it, and pay after that. RentMe takes no fee at any " +
  "point, so anybody asking you to pay to view is not us. If a message asks you for " +
  "an account number, report it and a person will read it.";

const SAY_HERE =
  "the useful thing to say here is the thing you would tell a friend moving in: " +
  "what the road is like when it rains, which streets have light, and what a one " +
  "bedroom really costs.";

let systemSeq = 0;
function openEntries(areaRow) {
  const stateName = STATES.find((s) => s.code === areaRow.state_code)?.name ?? areaRow.state_code;
  let opening;
  if (areaRow.lga_code) {
    const n = LGAS.filter((l) => l.state_code === areaRow.state_code).length;
    const placeOf =
      areaRow.state_code === "FC"
        ? `one of the Federal Capital Territory's ${n} area councils`
        : `one of ${stateName} State's ${n} local governments`;
    opening = `${areaRow.name} is open. It is ${placeOf}, and ${SAY_HERE}`;
  } else {
    opening = `${areaRow.name} is open, in ${areaRow.city}. The ${SAY_HERE.slice(4)}`;
  }

  /* One base per place, then a fixed offset inside it. Computed BEFORE the ids
     are handed out: an earlier version folded the sequence into the timestamp
     and the two entries came out with the same instant, which put the money
     rule above the opening in a feed sorted newest first. That is the sort of
     thing only a rendered feed ever shows you. */
  const base = Date.now() - systemSeq * 60_000;
  const at = (secondsAgo) => new Date(base - secondsAgo * 1000).toISOString();

  const post = (body, secondsAgo) => ({
    id: `5y57e400-0000-4000-8000-${String(systemSeq * 10 + secondsAgo).padStart(12, "0")}`,
    area_id: areaRow.id,
    root_id: null,
    parent_id: null,
    depth: 0,
    author_id: null,
    author_kind: "SYSTEM",
    kind: "SYSTEM",
    body,
    listing_id: null,
    quoted_post_id: null,
    payload: null,
    reply_count: 0,
    like_count: 0,
    repost_count: 0,
    view_count: 0,
    status: "LIVE",
    hold_reason: null,
    allow_quotes: true,
    created_at: at(secondsAgo),
    edited_at: null,
  });

  const entries = [post(MONEY_RULE, 2), post(opening, 1)];
  systemSeq += 1;
  return entries;
}

/** What the real function does, reproduced exactly enough to prove the loop. */
function enterPlace(lgaCode) {
  const lga = LGAS.find((l) => l.code === lgaCode);
  if (!lga) return { error: { code: "RM030", message: "That local government does not exist." } };

  const existing = DATA.areas.find((a) => a.lga_code === lga.code);
  if (existing) {
    return { rows: [{ id: existing.id, slug: existing.slug, name: existing.name, status: existing.status }] };
  }

  const stateName = STATES.find((s) => s.code === lga.state_code)?.name ?? lga.state_code;
  const slug = `${lga.name} ${stateName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (DATA.areas.some((a) => a.slug === slug)) {
    return { error: { code: "RM031", message: "That place could not be opened." } };
  }

  const row = area({
    id: `feed0000-0000-4000-8000-${String(DATA.areas.length).padStart(12, "0")}`,
    slug,
    name: lga.name,
    city: lga.name,
    area: lga.name,
    state_code: lga.state_code,
    lga_code: lga.code,
    within_lga_code: lga.code,
    blurb: `Everything happening in ${lga.name}, ${stateName}.`,
  });
  DATA.areas.push(row);
  /* The trigger on `areas`, standing in for itself. A place has never opened
     empty since the migration that put it there. */
  const entries = openEntries(row);
  DATA.posts.push(...entries);
  row.post_count = entries.length;
  return { rows: [{ id: row.id, slug: row.slug, name: row.name, status: row.status }] };
}

/* Every place that was already open carries the same two entries, because the
   migration backfilled them. Four places became eight rows. */
for (const row of DATA.areas) {
  const entries = openEntries(row);
  DATA.posts.push(...entries);
  row.post_count = entries.length;
}

console.log("\nthe entries a place opens with");
check("every open place has two", DATA.posts.length === DATA.areas.length * 2);
check("none of them has an author", DATA.posts.every((p) => p.author_id === null));
check("all of them are SYSTEM", DATA.posts.every((p) => p.author_kind === "SYSTEM"));
check("no em dash in either sentence", !`${MONEY_RULE} ${SAY_HERE}`.includes("\u2014"));
check(
  "no banned word in either sentence",
  !/\b(demo|sample|preview|not live)\b/i.test(`${MONEY_RULE} ${SAY_HERE}`),
);
check("the money rule says the platform charges nothing", /takes no fee/.test(MONEY_RULE));
/* A post carries its timestamp for ever, so an entry that describes a state of
   affairs is a lie the week after it is written. Neither of these does. */
check(
  "neither entry describes a moment",
  !/\b(yet|today|right now|this week|currently)\b/i.test(`${MONEY_RULE} ${SAY_HERE}`),
);

function matches(row, key, expr) {
  if (expr.startsWith("eq.")) return String(row[key]) === expr.slice(3);
  if (expr.startsWith("neq.")) return String(row[key]) !== expr.slice(4);
  if (expr.startsWith("not.is.")) {
    const want = expr.slice(7);
    if (want === "null") return row[key] !== null && row[key] !== undefined;
    return String(row[key]) !== want;
  }
  if (expr.startsWith("is.")) {
    const want = expr.slice(3);
    if (want === "null") return row[key] === null || row[key] === undefined;
    return String(row[key]) === want;
  }
  if (expr.startsWith("in.")) {
    const list = expr
      .slice(3)
      .replace(/^\(|\)$/g, "")
      .split(",")
      .map((v) => v.trim().replace(/^"|"$/g, ""));
    return list.includes(String(row[key]));
  }
  return true;
}

function serveStandin(port) {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
    const send = (status, payload) => {
      const text = JSON.stringify(payload);
      res.writeHead(status, {
        "content-type": "application/json; charset=utf-8",
        "content-length": Buffer.byteLength(text),
      });
      res.end(text);
    };

    if (url.pathname === "/auth/v1/user") {
      const auth = req.headers.authorization ?? "";
      if (!auth.startsWith("Bearer ") || auth.endsWith("standin")) {
        return send(401, { message: "no session" });
      }
      return send(200, {
        id: USER,
        aud: "authenticated",
        role: "authenticated",
        email: "walker@example.test",
        app_metadata: {},
        user_metadata: {},
        created_at: "2026-01-01T00:00:00Z",
      });
    }
    if (url.pathname.startsWith("/auth/v1/")) return send(401, { message: "no session" });

    if (url.pathname === "/rest/v1/rpc/enter_place") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        let code = "";
        try {
          code = JSON.parse(body || "{}").p_lga_code ?? "";
        } catch {
          code = "";
        }
        const result = enterPlace(String(code).trim());
        if (result.error) {
          return send(400, {
            code: result.error.code,
            message: result.error.message,
            details: null,
            hint: null,
          });
        }
        return send(200, result.rows);
      });
      return;
    }
    /* Everything else the app calls: the rate limiter, the flag reader and the
       notification helpers. An RPC this stand-in has not thought about answers
       null, and every one of them fails open by design. */
    if (url.pathname.startsWith("/rest/v1/rpc/")) return send(200, null);
    if (!url.pathname.startsWith("/rest/v1/")) return send(404, { message: "not here" });

    const table = url.pathname.slice("/rest/v1/".length);
    let rows = [...(DATA[table] ?? [])];

    for (const [key, value] of url.searchParams) {
      if (["select", "order", "limit", "offset", "columns"].includes(key)) continue;
      rows = rows.filter((row) => matches(row, key, value));
    }

    const order = url.searchParams.get("order");
    if (order) {
      const [column, direction] = order.split(".");
      rows.sort((a, b) => {
        const l = a[column] ?? "";
        const r = b[column] ?? "";
        if (typeof l === "number" && typeof r === "number") {
          return direction === "desc" ? r - l : l - r;
        }
        return direction === "desc"
          ? String(r).localeCompare(String(l))
          : String(l).localeCompare(String(r));
      });
    }
    const limit = Number(url.searchParams.get("limit") ?? 0);
    if (limit > 0) rows = rows.slice(0, limit);

    const accept = req.headers.accept ?? "";
    if (accept.includes("vnd.pgrst.object")) {
      if (rows.length === 0) return send(200, null);
      return send(200, rows[0]);
    }
    send(200, rows);
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}

const standin = await serveStandin(STANDIN_PORT);

if (process.argv.includes("--serve")) {
  console.log(`\nstand-in listening on http://127.0.0.1:${STANDIN_PORT}. Ctrl-C to stop.`);
  await new Promise(() => {});
}

/* ---------------------------------------------------------------- the screen */

const host = new URL(BASE_URL).hostname;

/** The session cookie `@supabase/ssr` reads, for the stand-in's host. */
function authCookie() {
  const session = {
    access_token: "standin-access-token",
    refresh_token: "standin-refresh-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: USER, aud: "authenticated", role: "authenticated", email: "walker@example.test" },
  };
  const value = `base64-${Buffer.from(JSON.stringify(session), "utf8").toString("base64url")}`;
  return { name: "sb-127-auth-token", value, domain: host, path: "/" };
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function openContext({ signedIn = false, theme = "dark" } = {}) {
  const context = await browser.newContext({
    colorScheme: theme === "light" ? "light" : "dark",
    viewport: { width: 390, height: 844 },
  });
  if (signedIn) await context.addCookies([authCookie()]);
  await context.addInitScript((mode) => {
    window.localStorage.setItem("nf_theme", mode);
  }, theme);
  return context;
}

/** Colours outside the blue family, the same window the other social specs use. */
async function outOfFamily(page) {
  return await page.evaluate(() => {
    const found = [];
    const seen = new Set();
    const hueOf = (r, g, b) => {
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const d = max - min;
      if (d === 0) return { hue: 0, sat: 0 };
      let hue;
      if (max === r) hue = ((g - b) / d) % 6;
      else if (max === g) hue = (b - r) / d + 2;
      else hue = (r - g) / d + 4;
      hue = Math.round(hue * 60);
      if (hue < 0) hue += 360;
      return { hue, sat: d / max };
    };
    for (const node of document.querySelectorAll(".nf-enter, .nf-enter *")) {
      const style = getComputedStyle(node);
      for (const prop of ["color", "background-color", "border-top-color"]) {
        const value = style.getPropertyValue(prop);
        const m = value.match(/rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)/);
        if (!m) continue;
        if (m[4] !== undefined && Number(m[4]) < 0.06) continue;
        const { hue, sat } = hueOf(Number(m[1]), Number(m[2]), Number(m[3]));
        if (sat < 0.2) continue;
        if ((hue >= 20 && hue <= 60) || (hue >= 255 && hue <= 330)) {
          const key = `${value}`;
          if (!seen.has(key)) {
            seen.add(key);
            found.push(`${prop}: ${value}`);
          }
        }
      }
    }
    return found;
  });
}

let rendered = false;

try {
  const context = await openContext();
  const page = await context.newPage();

  console.log("\n/around, signed out");
  await page.goto(`${BASE_URL}/around`, { waitUntil: "load" });
  await page.waitForTimeout(WAIT);

  const stateChips = page.locator('[data-testid="place-picker-states"] button');
  const stateCount = await stateChips.count();
  rendered = stateCount === 37;

  if (!rendered) {
    console.log(
      `\n  The picker did not render 37 states (saw ${stateCount}). This build cannot\n` +
        "  read the reference tables, so the screen half did not run and nothing\n" +
        "  below is counted. Build against the stand-in to prove it:\n" +
        `    NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:${STANDIN_PORT} NEXT_PUBLIC_SUPABASE_ANON_KEY=standin \\\n` +
        "    NEXT_DIST_DIR=.next-a2places npm run build --workspace @naijafinds/web\n",
    );
  } else {
    check("37 containers, one per state and the FCT", stateCount === 37);

    const names = await stateChips.allInnerTexts();
    check("Lagos is one of them", names.includes("Lagos"));
    check("the FCT is one of them", names.some((n) => n.includes("FCT")));
    check("no state appears twice", new Set(names).size === 37);

    /* Every chip is a real target, not a zero-size ghost. */
    const tiny = await page.evaluate(() => {
      const nodes = [...document.querySelectorAll('[data-testid="place-picker-states"] button')];
      return nodes.filter((n) => {
        const r = n.getBoundingClientRect();
        return r.width < 40 || r.height < 36;
      }).length;
    });
    check("every state chip is at least 40 by 36", tiny === 0);

    const scrolls = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    check("37 chips do not push the page sideways at 390px", scrolls === false);

    // ------------------------------------------------------------ tap a state
    console.log("\ntapping a state");
    await page.locator('[data-testid="place-picker-states"] button[data-state-code="LA"]').click();
    await page.waitForTimeout(400);

    check("the state chips give way", (await stateChips.count()) === 0);
    check(
      "the state is named",
      (await page.locator('[data-testid="place-picker-state"]').innerText()) === "Lagos",
    );
    const lgaChips = page.locator('[data-testid="place-picker-lgas"] button');
    check("Lagos draws its 20 local governments", (await lgaChips.count()) === 20);
    check(
      "the address bar remembers it",
      new URL(page.url()).searchParams.get("state") === "LA",
    );
    check(
      "Eti-Osa is drawn as already open",
      (await page
        .locator('[data-testid="place-picker-lgas"] button[data-lga-code="la_eti_osa"]')
        .getAttribute("data-open")) === "true",
    );
    check(
      "Ikeja is not, because nobody has been in it",
      (await page
        .locator('[data-testid="place-picker-lgas"] button[data-lga-code="la_ikeja"]')
        .getAttribute("data-open")) === null,
    );
    check("nothing outside the blue family", (await outOfFamily(page)).length === 0);

    // ------------------------------------------------------------ search in it
    console.log("\nsearching inside one state");
    await page.locator('[data-testid="place-picker-search"]').fill("ifelodun");
    await page.waitForTimeout(250);
    check(
      "three letters narrow 20 to 1",
      (await lgaChips.count()) === 1 &&
        (await lgaChips.first().innerText()).includes("Ajeromi-Ifelodun"),
    );

    await page.locator('[data-testid="place-picker-search"]').fill("ibeju lekki");
    await page.waitForTimeout(250);
    check(
      "a space matches a hyphen",
      (await lgaChips.count()) === 1 &&
        (await lgaChips.first().innerText()).includes("Ibeju-Lekki"),
    );

    await page.locator('[data-testid="place-picker-search"]').fill("zzzz");
    await page.waitForTimeout(250);
    check("nothing matching says so", await page.locator("text=Nothing matches that").isVisible());

    // ----------------------------------------------------------- back and Kano
    console.log("\nchanging state, which is never pinned");
    await page.locator('[data-testid="place-picker-back"]').click();
    await page.waitForTimeout(300);
    check("all 37 are back", (await stateChips.count()) === 37);
    check(
      "the address bar forgets it",
      new URL(page.url()).searchParams.get("state") === null,
    );

    await page.locator('[data-testid="place-picker-states"] button[data-state-code="KN"]').click();
    await page.waitForTimeout(400);
    check("Kano draws all 44", (await lgaChips.count()) === 44);
    const kanoScrolls = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    check("44 chips do not push the page sideways at 390px", kanoScrolls === false);

    // ------------------------------------------------- search across the whole
    console.log("\nsearching the whole country");
    await page.locator('[data-testid="place-picker-back"]').click();
    await page.waitForTimeout(300);
    await page.locator('[data-testid="place-picker-search"]').fill("gwagwalada");
    await page.waitForTimeout(300);
    const wide = page.locator('[data-testid="place-picker-lgas"] button');
    check("one local government in the whole country matches", (await wide.count()) === 1);
    check(
      "and it says which state it is in",
      (await wide.first().innerText()).includes("FCT"),
    );

    await page.locator('[data-testid="place-picker-search"]').fill("surulere");
    await page.waitForTimeout(300);
    check(
      "a name two states share returns both",
      (await page.locator('[data-testid="place-picker-lgas"] button').count()) === 2,
    );

    // --------------------------------------------- signed out, an open door
    console.log("\nsigned out: an open door needs no account");
    await page.locator('[data-testid="place-picker-search"]').fill("eti-osa");
    await page.waitForTimeout(300);
    await page.locator('button[data-lga-code="la_eti_osa"]').click();
    await page.waitForURL(/\/around\/eti-osa-lagos/, { timeout: 12_000 }).catch(() => {});
    check("walking into an open place needs no account", /\/around\/eti-osa-lagos/.test(page.url()));
    await page.waitForTimeout(WAIT);
    check(
      "and the finer places inside it are offered",
      (await page.locator("text=Inside Eti-Osa").count()) === 1 &&
        (await page.locator('a[href="/around/lekki-phase-1-lagos"]').count()) >= 1,
    );

    console.log("\nthe place is not empty, and nobody was invented to fill it");
    const systemCards = page.locator(".nf-post--system");
    check("two entries stand in the room", (await systemCards.count()) === 2);
    check(
      "the platform signs them, in its own name",
      (await systemCards.first().locator("text=RentMe").count()) >= 1,
    );
    check(
      "the newest is the one that names the place",
      (await systemCards.first().innerText()).includes(
        "Eti-Osa is open. It is one of Lagos State's 20 local governments",
      ),
    );
    check(
      "and the other is the money rule",
      (await systemCards.nth(1).innerText()).includes("Never send money for a place you have not stood inside"),
    );
    /* The whole point of doing it this way. No handle, no avatar, no person. */
    check(
      "no invented person is on the page",
      (await page.locator('.nf-post--system a[href^="/u/"]').count()) === 0,
    );
    check(
      "the empty feed line is gone, because the feed is not empty",
      (await page.locator("text=Nothing has been said here yet").count()) === 0,
    );

    console.log("\nsigned out: a closed door asks for an account, and says why");
    await page.goto(`${BASE_URL}/around?state=LA`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);
    check(
      "the state survives a reload",
      (await page.locator('[data-testid="place-picker-state"]').innerText()) === "Lagos",
    );
    await page.locator('button[data-lga-code="la_ikeja"]').click();
    await page.waitForURL(/\/sign-in/, { timeout: 12_000 }).catch(() => {});
    const signInUrl = new URL(page.url());
    check("it goes to sign in", signInUrl.pathname === "/sign-in");
    check(
      "and it comes back to the state they were looking at",
      signInUrl.searchParams.get("next") === "/around?state=LA",
    );
    check("no place was created by a signed out tap", !DATA.areas.some((a) => a.lga_code === "la_ikeja"));

    await context.close();

    // ------------------------------------------------------ signed in: the write
    console.log("\nsigned in: the door opens, and stays open");
    const inContext = await openContext({ signedIn: true });
    const inPage = await inContext.newPage();
    await inPage.goto(`${BASE_URL}/around?state=FC`, { waitUntil: "load" });
    await inPage.waitForTimeout(WAIT);

    const before = DATA.areas.length;
    await inPage.locator('button[data-lga-code="fc_gwagwalada"]').click();
    await inPage.waitForURL(/\/around\/gwagwalada-fct-abuja/, { timeout: 20_000 }).catch(() => {});

    check("the row was written", DATA.areas.length === before + 1);
    const created = DATA.areas.find((a) => a.lga_code === "fc_gwagwalada");
    check("it is a place, ACTIVE, in the FCT", Boolean(created) && created.status === "ACTIVE" && created.state_code === "FC");
    check("the browser is standing in it", /\/around\/gwagwalada-fct-abuja/.test(inPage.url()));
    await inPage.waitForTimeout(WAIT);
    check(
      "and the place has its own name on it",
      (await inPage.locator("text=Gwagwalada").count()) >= 1,
    );
    /* A door that has never been walked through opens with something in it. */
    check("a brand new place is not an empty room", (await inPage.locator(".nf-post--system").count()) === 2);
    check(
      "and it knows the FCT is not a state",
      (await inPage.locator(".nf-post--system").first().innerText()).includes(
        "one of the Federal Capital Territory's 6 area councils",
      ),
    );

    console.log("\nsigned in: the same tap twice opens one place, not two");
    await inPage.goto(`${BASE_URL}/around?state=FC`, { waitUntil: "load" });
    await inPage.waitForTimeout(WAIT);
    check(
      "the reload shows the door standing open",
      (await inPage
        .locator('button[data-lga-code="fc_gwagwalada"]')
        .getAttribute("data-open")) === "true",
    );
    const beforeAgain = DATA.areas.length;
    await inPage.locator('button[data-lga-code="fc_gwagwalada"]').click();
    await inPage.waitForURL(/\/around\/gwagwalada-fct-abuja/, { timeout: 20_000 }).catch(() => {});
    check("no second row", DATA.areas.length === beforeAgain);

    await inContext.close();

    // ------------------------------------------------------------- paper twin
    console.log("\nthe paper twin");
    const lightContext = await openContext({ theme: "light" });
    const lightPage = await lightContext.newPage();
    await lightPage.goto(`${BASE_URL}/around?state=LA`, { waitUntil: "load" });
    await lightPage.waitForTimeout(WAIT);
    check(
      "the picker draws in light too",
      (await lightPage.locator('[data-testid="place-picker-lgas"] button').count()) === 20,
    );
    check("nothing outside the blue family on paper", (await outOfFamily(lightPage)).length === 0);
    await lightContext.close();
  }
} catch (error) {
  failures += 1;
  console.log(`  FAILED  the run threw: ${error.message}`);
} finally {
  await browser.close();
  standin.close();
}

console.log(
  rendered
    ? `\n${failures === 0 ? "all green" : `${failures} failed`}\n`
    : `\n${failures === 0 ? "the rules are green; the screen half did not run" : `${failures} failed`}\n`,
);
process.exit(failures === 0 ? 0 : 1);
