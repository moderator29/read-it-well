import type { Translation } from "../../fallback";

/* MACHINE DRAFT, 30 September 2026. Needs a native Hausa speaker's review
   (review-status.ts). "Price Check" is the product's name and stays as it
   is; every refusal must keep saying that we will not guess. */
export const priceCheckHa = {
  lead: "Me gidaje a kusa da nan ke nema?",
  intro:
    "Faɗa mana ina da menene, za mu gaya maka abin da ake tallata gidaje makamantan wannan a kusa da can a yanzu. Idan ba mu da isasshen bayani don mu tabbata, za mu faɗa maimakon mu yi hasashe.",

  ladder: {
    heading: "Ina yake?",
    state: "Jiha",
    statePlaceholder: "Zaɓi jiha",
    lga: "Ƙaramar hukuma",
    lgaPlaceholder: "Zaɓi ƙaramar hukuma",
    lgaLoading: "Ana loda ƙananan hukumomi",
    lgaNeedsState: "Zaɓi jiha da farko",
    area: "Unguwa ko rukunin gidaje",
    areaPlaceholder: "Fara rubutawa, ko ka rubuta naka",
    areaHint:
      "Muna riƙe da sunayen da wakilai suka rubuta a kan jeri kawai, don haka rubuta naka idan ba ya nan.",
    areaSuggestionCount: "Jeri {count}",
    pin: "Sanya fil",
    pinHelp: "Ja fil ɗin zuwa ginin. Muna amfani da wannan ne kawai don nemo gidaje na kusa.",
    pinPlaced: "An sanya fil",
    pinMissing: "Babu fil tukuna",
    pinOutsideNigeria: "Wannan yana wajen Najeriya. Ja fil ɗin ya dawo kan taswira.",
    pinUse: "Yi amfani da wannan wuri",
    hint: "Wani abu kuma da zai taimaka",
    hintPlaceholder: "Sunan rukunin gidaje, ko alamar ƙasa mafi kusa",
    hintHelp:
      "Don tunawarka yayin da kake kan wannan allon. Ba ma adana shi, ba ma karanta shi, kuma babu wani da ke ganinsa.",
    mapUnavailable: "Taswirar ba za ta iya loda yanzu ba. Har yanzu za ka iya karanta farashin unguwa a ƙasa.",
  },

  subject: {
    heading: "Menene shi?",
    type: "Nau'in kadara",
    apartment: "Fulat",
    home: "Gida",
    shop: "Shago",
    office: "Ofis",
    intent: "Kana tambaya game da",
    rent: "Haya",
    sale: "Sayarwa",
    period: "Lokacin haya",
    periodYear: "Shekara ɗaya",
    periodMonth: "Wata ɗaya",
    periodQuarter: "Watanni uku",
    bedrooms: "Ɗakunan kwana",
    bathrooms: "Banɗakuna",
    size: "Girma a murabba'in mita",
    sizeHint: "Idan ka sani. Bar shi babu komai idan ba ka sani ba, kuma ba za mu yi hasashe ba.",
    submit: "Duba farashin",
    checking: "Ana dubawa",
    fromListing: "An cike daga wannan jeri. Canza duk abin da ba daidai ba.",
  },

  result: {
    askingRange: "Iyakar farashin da ake nema",
    perYear: "a shekara",
    perProperty: "don gida kamar wannan",
    perSqm: "a kowane murabba'in mita",
    basis: "Bisa jeri {count} cikin mita {radius}, da aka buga a watanni {months} da suka wuce.",
    confidence: "Yadda muka tabbata",
    confidenceLow: "ba sosai ba",
    confidenceMedium: "matsakaici",
    confidenceHigh: "sosai",
    confidenceExplain: "Yadda muke gano hakan",
    confidenceBody:
      "Abubuwa huɗu ne ke yanke shi kuma mafi muni ne ke nasara: gidaje nawa muka samu, yadda suka saɓa kan farashi, shekarun jerinsu, da nisan da muka duba. Babu wani a Vallo da zai iya saita shi.",
    sizedShortfall:
      "Za mu iya gaya maka abin da gidaje na kusa ke nema. Ba za mu iya gaya maka farashi a kowane murabba'in mita ba, domin yawancin jeri a kusa da nan ba sa faɗin girma.",
    comparablesHeading: "Abin da aka dogara a kai",
    distanceAway: "Mita {metres} daga nan",
    listedAgo: "An sanya watanni {months} da suka wuce",
    listedRecently: "An sanya a wannan watan",
    spreadHeading: "Abin da kowanne ke nema",
    unreachableTitle: "Ba za mu iya duba farashi yanzu ba",
    unreachableBody:
      "Wannan laifin ɓangarenmu ne, ba naka ba, kuma ba magana ce game da abin da ke kusa da kai ba. Babu abin da ka shigar da ya ɓace. Sake gwadawa bayan 'yan mintuna.",
  },

  refusals: {
    noLocation: {
      title: "Ba mu iya sanya wannan adireshin a taswira ba",
      body: "Ba tare da wuri ba ba za mu iya samun abin da za mu kwatanta shi da shi ba. Babu binciken adireshi na Najeriya da za mu amince da shi, don haka fil ne hanyar da muke yi.",
    },
    noComparables: {
      title: "Ba mu da abin da aka buga a kusa da nan tukuna",
      body: "Babu komai kusa da wannan wuri da za mu kwatanta. Ba za mu yi hasashe ba.",
    },
    tooFewComparables: {
      title: "Mun sami gidaje {count} a kusa da nan",
      body: "Hakan bai isa a ba da alƙalamin da za mu tsaya a kai ba. Biyar ne mafi ƙarancinmu. Ga abin da muka samu, a matsayin jerin na kusa ba a matsayin ƙiyasi ba.",
    },
    tooFewSized: {
      title: "Ba za mu iya ba ka farashi a kowane murabba'in mita ba",
      body: "Yawancin jeri a kusa da nan ba sa faɗin girma, don haka alƙalamin murabba'in mita zai fito daga kaɗan daga cikinsu da ba zai yi ma'ana ba.",
    },
    wideDispersion: {
      title: "Gidajen da ke kusa da nan sun saɓa da juna sosai",
      body: "Alƙalami mai amfani yana buƙatar su yarda fiye da haka. Ga abin da suke nema, a shimfiɗe, don ka ga saɓanin da kanka.",
    },
    stale: {
      title: "Jeri mafi kusa sun wuce shekara ɗaya",
      body: "Farashin naira ya motsa tun daga lokacin. Gara mu yi shiru da mu maimaita tsohon alƙalami.",
    },
    unsupportedType: {
      title: "Ba ma ƙayyade farashin irin wannan kadara",
      body: "Ana ƙayyade farashin fili bisa fili, takardar mallaka da hanyar shiga, kuma filaye biyu a titi ɗaya na iya bambanta sosai a daraja. Ana ƙayyade farashin otal-otal da gidajen abinci a kowane dare da kowane mutum. Ƙarin jeri ba zai canza hakan ba.",
    },
    unsupportedPeriod: {
      title: "Muna aiki da hayar shekara",
      body: "Wannan haya ce ta ɗan gajeren lokaci, kuma ninka hayar wata sau goma sha biyu yana ɗauka zaman watanni goma sha biyu da babu wanda ya yi alkawari.",
    },
    demoOnly: {
      title: "Duk abin da muke riƙe da shi a kusa da nan misalin jeri ne",
      body: "Suna nan ne don nuna yadda dandalin ke aiki, ba don a ƙayyade farashinsu ba. Ba za mu gina alƙalami daga misalai ba.",
    },
  },

  actions: {
    dropPin: "Sanya fil",
    areaReport: "Duba farashin unguwa",
    notifyMe: "Gaya mini idan za ku iya amsawa",
    notifyMeSignedOut: "Shiga don a gaya maka idan za mu iya amsawa",
    showNearby: "Nuna abin da muka samu",
    registeredFirm: "Nemo kamfani mai rajista",
    changePeriod: "Tambaya game da hayar shekara",
    listIt: "Sanya shi a Vallo",
    seeSimilar: "Duba makamantan na kusa",
    share: "Raba katin unguwa",
    startOver: "Sake farawa",
  },

  next: {
    heading: "Me ke biyo baya",
    seeListings: "Duba jeri a wannan unguwa",
    seeListingsBody: "Irin wuri ɗaya, da adadin ɗakunan kwana ɗaya, inda ka duba.",
    setAlert: "Gaya mini game da sabbin jeri a nan",
    setAlertSignedOut: "Shiga don a gaya maka game da sabbin jeri a nan",
    alertBody: "Muna ajiye maka wannan binciken kuma muna gaya maka idan wani sabo ya dace da shi.",
    alertSaved: "An gama. Yana cikin binciken da ka ajiye, tare da faɗakarwa a kunne.",
    alertOpen: "Buɗe binciken da aka ajiye",
    shareBody: "Aika katin unguwa: iyakar farashi da jeri nawa ya dogara a kai, ba wurin da ka sanya fil ba.",
  },

  notify: {
    heading: "Gaya mini idan za ku iya amsawa",
    body: "Za mu gaya maka da zarar akwai isassun jeri a kusa da nan don amsawa. Ba za mu yi hasashe a halin yanzu ba.",
    signedOutBody:
      "Wannan yana zuwa sanarwarka ta Vallo, don haka za ka buƙaci asusu. Ba ma aika imel don shi.",
    saved: "An ajiye. Za mu gaya maka idan za mu iya amsawa.",
    alreadySaved: "Kana kallon wannan wuri tuni.",
    failed: "Ba mu iya ajiye wannan yanzu ba. Babu abin da ya ɓace, don haka sake gwadawa nan da ɗan lokaci.",
  },

  area: {
    heading: "Farashin unguwa",
    subheading: "Abin da gidaje a nan ke nema a yanzu",
    askingFor: "{type} mai ɗakunan kwana {bedrooms}",
    studioFor: "{type} studio",
    basis: "Daga jeri {count}, da aka buga tsakanin {from} da {to}.",
    perSqm: "{amount} a kowane murabba'in mita",
    perSqmCoverage: "daga jeri {sized} cikin {count} a nan da ke faɗin girma",
    noPerSqm: "Babu alƙalamin murabba'in mita: jeri kaɗan ne a nan ke faɗin girma.",
    emptyTitle: "Babu farashin unguwa a nan tukuna",
    emptyBody:
      "Muna buƙatar aƙalla ainihin jeri uku na irin ɗaya a unguwa ɗaya kafin mu wallafa iyakar farashi. Ba za mu yi hasashe ba.",
    demoOnlyTitle: "Duk abin da muke riƙe da shi a nan misalin jeri ne",
    demoOnlyBody: "Suna nan ne don nuna yadda dandalin ke aiki, ba don a ƙayyade farashinsu ba.",
    unreachableTitle: "Ba za mu iya karanta jeri yanzu ba",
    unreachableBody:
      "Wannan laifin ɓangarenmu ne, ba naka ba, kuma ba magana ce game da abin da ke nan ba. Sake gwadawa bayan 'yan mintuna.",
  },

  facts: {
    heading: "Wuta da ruwa a kusa da nan",
    basis:
      "Daga jeri {count} da muke riƙe da su a nan. Wannan shi ne abin da suke faɗa game da kansu, ba binciken unguwa ba.",
    grid: "Wutar NEPA",
    backup: "Wutar ajiya",
    water: "Ruwa",
    prepaid: "Mita mai biyan kafin amfani",
    estate: "Rukunin gidaje mai ƙofa",
    ofListings: "{count} cikin {total}",
    mostCommon: "Yawancinsu suna cewa {value}",
    gridBandA: "Band A",
    gridMostlyOn: "Yawanci a kunne",
    gridPatchy: "Lokaci-lokaci",
    gridRarely: "Da wuya a kunne",
    gridNone: "Babu",
    backupNone: "Babu",
    backupGenerator: "Janareta",
    backupInverter: "Inverter",
    backupSolar: "Hasken rana",
    backupGeneratorInverter: "Janareta da inverter",
    waterTreatedMains: "Ruwan famfo da aka tace",
    waterBorehole: "Rijiyar burtsatse",
    waterPumpedStorage: "Tankin da ake turawa",
    waterTanker: "Tanka",
    waterNone: "Babu",
    empty: "Babu jeri a nan da ke faɗin wutarsu ko ruwansu tukuna.",
  },

  share: {
    heading: "Raba waɗannan farashin unguwa",
    body: "Katin yana ambaton unguwa da irin kadarar. Ba ya taɓa ambaton adireshi, ko naka ma.",
    why: "Me ya sa ba adireshina ba?",
    whyBody:
      "Adireshi a gefen alƙalamin naira takarda ce mai amfani ga wanda bai dace ba, kuma ana tura kati nesa da mutanen da aka aika wa. Duk wanda ke zaune a can shi ne ke cikin haɗari kuma ba a taɓa tambayarsa ba. Idan kana son a ga wani gida na musamman, buga shi a matsayin jeri.",
    cardLine: "{type} masu ɗakunan kwana {bedrooms} a {area} suna neman {low} zuwa {high}",
    copy: "Kwafi mahaɗin",
    copied: "An kwafi",
    make: "Raba waɗannan farashin",
    making: "Ana yin katin",
    madeHeading: "Katinka ya shirya",
    madeBody:
      "Duk wanda ke da wannan mahaɗin zai iya karanta shi. Yana ambaton unguwa da irin kadarar, kuma ba ya ambaton adireshi.",
    failed: "Ba mu iya yin wannan katin yanzu ba. Babu abin da ya ɓace, don haka sake gwadawa nan da ɗan lokaci.",
    nothingYet: "Babu abin rabawa a nan tukuna",
    nothingYetBody:
      "Kati yana buƙatar aƙalla ainihin jeri uku na irin ɗaya a unguwa ɗaya. Ba za mu yi ɗaya daga ƙasa da haka ba.",
    open: "Buɗe katin",
    pageLead: "Abin da ake tallata gidaje a wannan unguwa a Vallo a yanzu.",
    headline: "{type} masu ɗakunan kwana {bedrooms} a {area}",
    headlineNoBedrooms: "{type} a {area}",
    headlineStudio: "{type} studio a {area}",
    cardRange: "Suna neman {low} zuwa {high} {period}",
    cardBasis: "Bisa jerin Vallo {count}, {month}",
    cardBasisNoDate: "Bisa jerin Vallo {count}",
    cardMeterWord: "Jeri {count}",
    cardStatListings: "Jeri",
    cardStatMonth: "An yi",
    typeApartmentPlural: "fulat-fulat",
    typeHomePlural: "gidaje",
    typeShopPlural: "shaguna",
    typeOfficePlural: "ofisoshi",
    typeAnyPlural: "Kadarori",
    madeOn: "An yi katin {month}.",
    frozen:
      "Waɗannan alƙaluman gaskiya ne game da jerin da muke riƙe da su lokacin da aka yi katin. Ba a sake ƙididdige su.",
    checkYours: "Duba wata unguwa",
    seeListings: "Duba abin da aka sanya a nan",
    missingTitle: "Wannan katin baya nan",
    missingBody:
      "Wataƙila mahaɗin ba daidai ba ne, ko ba a taɓa yin katin ba. Za ka iya yin binciken farashi naka maimakon haka.",
  },
} satisfies NonNullable<Translation["priceCheck"]>;
