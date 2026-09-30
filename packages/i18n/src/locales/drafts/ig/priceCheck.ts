import type { Translation } from "../../fallback";

/* MACHINE DRAFT, 30 September 2026. Needs a native Igbo speaker's review
   (review-status.ts). "Price Check" is the product's name and stays as it
   is; every refusal must keep saying that we will not guess. */
export const priceCheckIg = {
  lead: "Gịnị ka ihe onwunwe dị nso ebe a na-arịọ?",
  intro:
    "Gwa anyị ebe na ihe ọ bụ, anyị ga-agwa gị ihe a na-akpọsa ihe onwunwe yiri ya dị nso n'ebe ahụ ugbu a. Ọ bụrụ na anyị enweghị ihe zuru ezu iji jide n'aka, anyị ga-ekwu ya kama ịkọ nkọ.",

  ladder: {
    heading: "Ebee ka ọ dị?",
    state: "Steeti",
    statePlaceholder: "Họrọ steeti",
    lga: "Ọchịchị ime obodo",
    lgaPlaceholder: "Họrọ ọchịchị ime obodo",
    lgaLoading: "Na-ebugo ọchịchị ime obodo",
    lgaNeedsState: "Buru ụzọ họrọ steeti",
    area: "Mpaghara ma ọ bụ ogige obibi",
    areaPlaceholder: "Malite ide, ma ọ bụ dee nke gị",
    areaHint:
      "Anyị nwere naanị aha ndị nnọchiteanya dere na ndepụta, ya mere dee nke gị ma ọ bụrụ na ọ nọghị ebe ahụ.",
    areaSuggestionCount: "Ndepụta {count}",
    pin: "Tinye pin",
    pinHelp: "Dọrọ pin ahụ gaa n'ụlọ ahụ. Anyị na-eji nke a naanị ịchọta ihe onwunwe dị nso.",
    pinPlaced: "Etinyela pin",
    pinMissing: "Enwebeghị pin",
    pinOutsideNigeria: "Nke ahụ dị na mpụga Naịjirịa. Dọghachi pin ahụ na maapụ.",
    pinUse: "Jiri ebe a",
    hint: "Ihe ọ bụla ọzọ nwere ike inye aka",
    hintPlaceholder: "Aha ogige obibi, ma ọ bụ akara ala kacha nso",
    hintHelp:
      "Maka icheta gị mgbe ị nọ n'ihuenyo a. Anyị anaghị echekwa ya, anyị anaghị agụ ya, ọ dịghịkwa onye ọzọ na-ahụ ya.",
    mapUnavailable: "Maapụ enweghị ike ibugo ugbu a. Ị ka nwere ike ịgụ ọnụahịa mpaghara n'okpuru.",
  },

  subject: {
    heading: "Gịnị ka ọ bụ?",
    type: "Ụdị ihe onwunwe",
    apartment: "Flat",
    home: "Ụlọ",
    shop: "Ụlọ ahịa",
    office: "Ọfịs",
    intent: "Ị na-ajụ maka",
    rent: "Mgbazinye",
    sale: "Ire",
    period: "Oge mgbazinye",
    periodYear: "Otu afọ",
    periodMonth: "Otu ọnwa",
    periodQuarter: "Ọnwa atọ",
    bedrooms: "Ime ụlọ ihi ụra",
    bathrooms: "Ụlọ ịsa ahụ",
    size: "Nha na mita square",
    sizeHint: "Ọ bụrụ na ị ma ya. Hapụ ya efu ma ọ bụrụ na ị maghị, anyị agaghị akọ nkọ.",
    submit: "Lelee ọnụahịa ahụ",
    checking: "Na-elele",
    fromListing: "E jupụtara ya site na ndepụta a. Gbanwee ihe ọ bụla na-ezighị ezi.",
  },

  result: {
    askingRange: "Oke ọnụahịa a na-arịọ",
    perYear: "kwa afọ",
    perProperty: "maka ihe onwunwe dị ka nke a",
    perSqm: "kwa mita square",
    basis: "Dabere na ndepụta {count} n'ime mita {radius}, e bipụtara n'ime ọnwa {months} gara aga.",
    confidence: "Otú anyị si jide n'aka",
    confidenceLow: "ọ bụghị nke ukwuu",
    confidenceMedium: "n'ụzọ ụfọdụ",
    confidenceHigh: "nke ukwuu",
    confidenceExplain: "Otú anyị si arụpụta ya",
    confidenceBody:
      "Ihe anọ na-ekpebi ya, nke kacha njọ na-emeri: ihe onwunwe ole anyị hụrụ, otú ha si ekwenyeghị n'ọnụahịa, afọ ole ndepụta ha dị, na ebe dị anya anyị gara ịchọ. Ọ dịghị onye na Vallo nwere ike ịtọ ya.",
    sizedShortfall:
      "Anyị nwere ike ịgwa gị ihe ihe onwunwe dị nso na-arịọ. Anyị enweghị ike ịgwa gị ọnụahịa kwa mita square, n'ihi na ọtụtụ ndepụta dị nso ebe a anaghị ekwu nha.",
    comparablesHeading: "Ihe o dabere na ya",
    distanceAway: "Mita {metres} site ebe a",
    listedAgo: "E depụtara ya ọnwa {months} gara aga",
    listedRecently: "E depụtara ya n'ọnwa a",
    spreadHeading: "Ihe nke ọ bụla na-arịọ",
    unreachableTitle: "Anyị enweghị ike ịlele ọnụahịa ugbu a",
    unreachableBody:
      "Nsogbu a sitere n'akụkụ anyị, ọ bụghị n'akụkụ gị, ọ bụghịkwa okwu banyere ihe dị gị nso. Ọ dịghị ihe i tinyere furu efu. Nwaa ọzọ mgbe nkeji ole na ole gachara.",
  },

  refusals: {
    noLocation: {
      title: "Anyị enweghị ike itinye adreesị a na maapụ",
      body: "Na-enweghị ebe ọ dị, anyị enweghị ike ịchọta ihe a ga-eji tụnyere ya. Ọ dịghị ọchụchọ adreesị maka Naịjirịa anyị ga-atụkwasị obi, ya mere pin bụ otú anyị si eme ya.",
    },
    noComparables: {
      title: "Anyị enwebeghị ihe e bipụtara dị nso ebe a",
      body: "Ọ dịghị ihe dị nso n'ebe a anyị ga-eji tụnyere. Anyị agaghị akọ nkọ.",
    },
    tooFewComparables: {
      title: "Anyị hụrụ ihe onwunwe {count} dị nso ebe a",
      body: "Nke ahụ ezughị iji nye ọnụọgụ anyị ga-eguzo n'azụ ya. Ise bụ opekata mpe anyị. Lee ihe anyị hụrụ, dịka ndepụta dị nso, ọ bụghị dịka atụmatụ.",
    },
    tooFewSized: {
      title: "Anyị enweghị ike inye gị ọnụahịa kwa mita square",
      body: "Ọtụtụ ndepụta dị nso ebe a anaghị ekwu nha, ya mere ọnụọgụ kwa mita square ga-esi n'ole na ole n'ime ha nke na-enweghị isi.",
    },
    wideDispersion: {
      title: "Ihe onwunwe dị nso ebe a ekwenyeghị n'ibe ha nke ukwuu",
      body: "Ọnụọgụ bara uru chọrọ ka ha kwekọrịta karịa nke a. Lee ihe ha na-arịọ, gbasaa ya, ka ị hụ esemokwu ahụ n'onwe gị.",
    },
    stale: {
      title: "Ndepụta kacha nso karịrị otu afọ",
      body: "Ọnụahịa naịra agbanweela kemgbe ahụ. Ọ ka mma anyị ekwughị ihe ọ bụla karịa ikwughachi ọnụọgụ ochie.",
    },
    unsupportedType: {
      title: "Anyị anaghị akwụ ụdị ihe onwunwe a ọnụahịa",
      body: "A na-akwụ ala ọnụahịa site n'ala, akwụkwọ ala na ụzọ mbata, ala abụọ n'otu okporo ụzọ nwere ike ịdị iche nke ukwuu n'uru. A na-akwụ họtel na ụlọ nri ọnụahịa kwa abalị na kwa onye. Ndepụta ndị ọzọ agaghị agbanwe nke ahụ.",
    },
    unsupportedPeriod: {
      title: "Anyị na-arụ ọrụ na mgbazinye kwa afọ",
      body: "Nke a bụ mgbazinye obere oge, ịmụba mgbazinye otu ọnwa ugboro iri na abụọ na-eche na mmadụ ga-ebi ọnwa iri na abụọ nke onye ọ bụla na-ekweghị nkwa.",
    },
    demoOnly: {
      title: "Ihe niile anyị nwere dị nso ebe a bụ ndepụta ihe atụ",
      body: "Ha nọ ebe ahụ iji gosi otú ikpo okwu ahụ si arụ ọrụ, ọ bụghị ka e nye ha ọnụahịa. Anyị agaghị esi n'ihe atụ wuo ọnụọgụ.",
    },
  },

  actions: {
    dropPin: "Tinye pin",
    areaReport: "Lee ọnụahịa mpaghara",
    notifyMe: "Gwa m mgbe unu nwere ike ịza",
    notifyMeSignedOut: "Banye ka a gwa gị mgbe anyị nwere ike ịza",
    showNearby: "Gosi ihe anyị hụrụ",
    registeredFirm: "Chọta ụlọ ọrụ edebanyere aha",
    changePeriod: "Jụọ maka mgbazinye kwa afọ",
    listIt: "Depụta ya na Vallo",
    seeSimilar: "Lee ndị yiri ya dị nso",
    share: "Kesaa kaadị mpaghara",
    startOver: "Malite ọzọ",
  },

  next: {
    heading: "Gịnị na-esote",
    seeListings: "Lee ndepụta na mpaghara a",
    seeListingsBody: "Otu ụdị ebe, nwere otu ọnụọgụ ime ụlọ ihi ụra, ebe ị lelere.",
    setAlert: "Gwa m maka ndepụta ọhụrụ ebe a",
    setAlertSignedOut: "Banye ka a gwa gị maka ndepụta ọhụrụ ebe a",
    alertBody: "Anyị na-edebere gị ọchụchọ a ma gwa gị mgbe ihe ọhụrụ dabara na ya.",
    alertSaved: "Emechaala. Ọ dị n'ọchụchọ gị echekwara, ya na ọkwa gbanyere.",
    alertOpen: "Mepee ọchụchọ echekwara",
    shareBody: "Zipu kaadị mpaghara: oke ọnụahịa na ndepụta ole o dabere na ya, ọ bụghị ebe ị tinyere pin.",
  },

  notify: {
    heading: "Gwa m mgbe unu nwere ike ịza",
    body: "Anyị ga-agwa gị ozugbo ndepụta zuru ezu dị nso ebe a iji zaa. Anyị agaghị akọ nkọ ka ọ dị ugbu a.",
    signedOutBody:
      "Nke a na-abịa n'ọkwa Vallo gị, ya mere ị ga-achọ akaụntụ. Anyị anaghị eziga email maka ya.",
    saved: "Echekwala. Anyị ga-agwa gị mgbe anyị nwere ike ịza.",
    alreadySaved: "Ị na-ele ebe a anya mbụ.",
    failed: "Anyị enweghị ike ichekwa nke ahụ ugbu a. Ọ dịghị ihe furu efu, ya mere nwaa ọzọ n'oge na-adịghị anya.",
  },

  area: {
    heading: "Ọnụahịa mpaghara",
    subheading: "Ihe ihe onwunwe ebe a na-arịọ ugbu a",
    askingFor: "{type} nwere ime ụlọ ihi ụra {bedrooms}",
    studioFor: "{type} studio",
    basis: "Site na ndepụta {count}, e bipụtara n'etiti {from} na {to}.",
    perSqm: "{amount} kwa mita square",
    perSqmCoverage: "site na ndepụta {sized} n'ime {count} ebe a na-ekwu nha",
    noPerSqm: "Enweghị ọnụọgụ kwa mita square: ndepụta ole na ole ebe a na-ekwu nha.",
    emptyTitle: "Enwebeghị ọnụahịa mpaghara maka ebe a",
    emptyBody:
      "Anyị chọrọ opekata mpe ezigbo ndepụta atọ nke otu ụdị n'otu mpaghara tupu anyị ebipụta oke. Anyị agaghị akọ nkọ.",
    demoOnlyTitle: "Ihe niile anyị nwere ebe a bụ ndepụta ihe atụ",
    demoOnlyBody: "Ha nọ ebe ahụ iji gosi otú ikpo okwu ahụ si arụ ọrụ, ọ bụghị ka e nye ha ọnụahịa.",
    unreachableTitle: "Anyị enweghị ike ịgụ ndepụta ugbu a",
    unreachableBody:
      "Nsogbu a sitere n'akụkụ anyị, ọ bụghị n'akụkụ gị, ọ bụghịkwa okwu banyere ihe dị ebe a. Nwaa ọzọ mgbe nkeji ole na ole gachara.",
  },

  facts: {
    heading: "Ọkụ na mmiri gburugburu ebe a",
    basis:
      "Site na ndepụta {count} anyị nwere ebe a. Nke a bụ ihe ha na-ekwu banyere onwe ha, ọ bụghị nyocha mpaghara.",
    grid: "Ọkụ gọọmentị",
    backup: "Ọkụ nkwado",
    water: "Mmiri",
    prepaid: "Mita akwụ ụgwọ tupu",
    estate: "Ogige obibi nwere ọnụ ụzọ",
    ofListings: "{count} n'ime {total}",
    mostCommon: "Ọtụtụ na-ekwu {value}",
    gridBandA: "Band A",
    gridMostlyOn: "Ọ na-adịkarị",
    gridPatchy: "Mgbe ụfọdụ",
    gridRarely: "Ọ na-adịkarịghị",
    gridNone: "Enweghị",
    backupNone: "Enweghị",
    backupGenerator: "Jenereto",
    backupInverter: "Inverter",
    backupSolar: "Ike anyanwụ",
    backupGeneratorInverter: "Jenereto na inverter",
    waterTreatedMains: "Mmiri pọmpụ a sachara",
    waterBorehole: "Olulu mmiri",
    waterPumpedStorage: "Tankị a na-apọmpụ mmiri",
    waterTanker: "Ụgbọ tanka",
    waterNone: "Enweghị",
    empty: "Enwebeghị ndepụta ebe a na-ekwu maka ọkụ ma ọ bụ mmiri ha.",
  },

  share: {
    heading: "Kesaa ọnụahịa mpaghara ndị a",
    body: "Kaadị ahụ na-akpọ aha mpaghara na ụdị ihe onwunwe. Ọ dịghị mgbe ọ na-akpọ aha adreesị, ọbụna nke gị.",
    why: "Gịnị mere ọ bụghị adreesị m?",
    whyBody:
      "Adreesị n'akụkụ ọnụọgụ naịra bụ akwụkwọ bara uru nye onye na-ekwesịghị, a na-ezigakwa kaadị n'ihu karịa ndị e zigaara ya. Onye ọ bụla bi n'ebe ahụ bụ onye nọ n'ihe egwu, a jụghịkwa ha. Ọ bụrụ na ịchọrọ ka a hụ otu ihe onwunwe kapịrị ọnụ, bipụta ya dịka ndepụta.",
    cardLine: "{type} nwere ime ụlọ ihi ụra {bedrooms} na {area} na-arịọ {low} ruo {high}",
    copy: "Detuo njikọ ahụ",
    copied: "Edetuola",
    make: "Kesaa ọnụahịa ndị a",
    making: "Na-eme kaadị ahụ",
    madeHeading: "Kaadị gị adịla njikere",
    madeBody:
      "Onye ọ bụla nwere njikọ a nwere ike ịgụ ya. Ọ na-akpọ aha mpaghara na ụdị ihe onwunwe, ọ nakwaghị akpọ aha adreesị ọ bụla.",
    failed: "Anyị enweghị ike ime kaadị ahụ ugbu a. Ọ dịghị ihe furu efu, ya mere nwaa ọzọ n'oge na-adịghị anya.",
    nothingYet: "Ọ dịbeghị ihe a ga-ekesa ebe a",
    nothingYetBody:
      "Kaadị chọrọ opekata mpe ezigbo ndepụta atọ nke otu ụdị n'otu mpaghara. Anyị agaghị eme otu site n'ihe pere mpe karịa.",
    open: "Mepee kaadị ahụ",
    pageLead: "Ihe a na-akpọsa ihe onwunwe na mpaghara a na Vallo ugbu a.",
    headline: "{type} nwere ime ụlọ ihi ụra {bedrooms} na {area}",
    headlineNoBedrooms: "{type} na {area}",
    headlineStudio: "{type} studio na {area}",
    cardRange: "Na-arịọ {low} ruo {high} {period}",
    cardBasis: "Dabere na ndepụta Vallo {count}, {month}",
    cardBasisNoDate: "Dabere na ndepụta Vallo {count}",
    cardMeterWord: "Ndepụta {count}",
    cardStatListings: "Ndepụta",
    cardStatMonth: "Emere",
    typeApartmentPlural: "flat",
    typeHomePlural: "ụlọ",
    typeShopPlural: "ụlọ ahịa",
    typeOfficePlural: "ọfịs",
    typeAnyPlural: "Ihe onwunwe",
    madeOn: "Emere kaadị ahụ na {month}.",
    frozen:
      "Ọnụọgụ ndị a bụ eziokwu banyere ndepụta anyị nwere mgbe e mere kaadị ahụ. A naghị agbakọ ha ọzọ.",
    checkYours: "Lelee mpaghara ọzọ",
    seeListings: "Lee ihe e depụtara ebe a",
    missingTitle: "Kaadị a anọghị ebe a",
    missingBody:
      "Ikekwe njikọ ahụ ezighị ezi, ma ọ bụ e mebeghị kaadị ahụ. Ị nwere ike ime nlele ọnụahịa nke gị kama.",
  },
} satisfies NonNullable<Translation["priceCheck"]>;
