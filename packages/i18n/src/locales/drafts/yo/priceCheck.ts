import type { Translation } from "../../fallback";

/* MACHINE DRAFT, 30 September 2026. Needs a native Yoruba speaker's review
   (review-status.ts). "Price Check" is the product's name and stays as it
   is; every refusal must keep saying that we will not guess. */
export const priceCheckYo = {
  lead: "Kí ni àwọn ilé nítòsí ibí ń béèrè?",
  intro:
    "Sọ ibi àti ohun tí ó jẹ́ fún wa, a ó sì sọ iye tí a ń polówó àwọn ilé tí ó jọra nítòsí ibẹ̀ báyìí fún ọ. Bí a kò bá ní tó láti dá wa lójú, a ó sọ bẹ́ẹ̀ dípò kí a fojú díwọ̀n.",

  ladder: {
    heading: "Ibo ló wà?",
    state: "Ìpínlẹ̀",
    statePlaceholder: "Yan ìpínlẹ̀ kan",
    lga: "Ìjọba ìbílẹ̀",
    lgaPlaceholder: "Yan ìjọba ìbílẹ̀ kan",
    lgaLoading: "À ń gbé àwọn ìjọba ìbílẹ̀ wọlé",
    lgaNeedsState: "Kọ́kọ́ yan ìpínlẹ̀ kan",
    area: "Àdúgbò tàbí agbègbè ilé",
    areaPlaceholder: "Bẹ̀rẹ̀ sí í tẹ̀, tàbí kọ tìrẹ",
    areaHint:
      "Orúkọ tí àwọn aṣojú tẹ̀ sórí àkọsílẹ̀ nìkan ni a ní, nítorí náà kọ tìrẹ bí kò bá sí níbẹ̀.",
    areaSuggestionCount: "Àkọsílẹ̀ {count}",
    pin: "Fi pinni sí i",
    pinHelp: "Fa pinni náà sí ilé náà. A ń lò èyí láti wá àwọn ilé tí ó wà nítòsí nìkan.",
    pinPlaced: "A ti fi pinni sí i",
    pinMissing: "Kò tíì sí pinni",
    pinOutsideNigeria: "Ìyẹn wà lẹ́yìn Nàìjíríà. Fa pinni náà padà sórí máàpù.",
    pinUse: "Lo ibí yìí",
    hint: "Ohunkóhun mìíràn tí ó lè ṣèrànwọ́",
    hintPlaceholder: "Orúkọ agbègbè ilé, tàbí àmì ilẹ̀ tí ó sún mọ́ jù",
    hintHelp:
      "Fún ìrántí tìrẹ nígbà tí o wà lórí ojú yìí. A kì í pa á mọ́, a kì í kà á, kò sì sí ẹlòmíràn tí ó ń rí i.",
    mapUnavailable: "Máàpù náà kò lè wọlé báyìí. O ṣì lè ka iye owó àdúgbò nísàlẹ̀.",
  },

  subject: {
    heading: "Kí ni ó jẹ́?",
    type: "Irú ohun ìní",
    apartment: "Fúláàtì",
    home: "Ilé",
    shop: "Ṣọ́ọ̀bù",
    office: "Ọ́fíìsì",
    intent: "Ṣé o ń béèrè nípa",
    rent: "Háyà",
    sale: "Títà",
    period: "Àkókò háyà",
    periodYear: "Ọdún kan",
    periodMonth: "Oṣù kan",
    periodQuarter: "Oṣù mẹ́ta",
    bedrooms: "Yàrá ìsùn",
    bathrooms: "Balùwẹ̀",
    size: "Ìwọ̀n ní mítà onígun mẹ́rin",
    sizeHint: "Bí o bá mọ̀ ọ́n. Fi sílẹ̀ lófo bí o kò bá mọ̀, a kò sì ní fojú díwọ̀n.",
    submit: "Ṣàyẹ̀wò iye owó",
    checking: "À ń ṣàyẹ̀wò",
    fromListing: "A kún un láti inú àkọsílẹ̀ yìí. Yí ohunkóhun tí kò tọ̀nà padà.",
  },

  result: {
    askingRange: "Ààlà iye tí wọ́n ń béèrè",
    perYear: "lọ́dún",
    perProperty: "fún ilé bí èyí",
    perSqm: "fún mítà onígun mẹ́rin kan",
    basis: "Ní ìbámu pẹ̀lú àkọsílẹ̀ {count} láàrin mítà {radius}, tí a tẹ̀ jáde ní oṣù {months} sẹ́yìn.",
    confidence: "Bí ó ṣe dá wa lójú tó",
    confidenceLow: "kò tó bẹ́ẹ̀",
    confidenceMedium: "díẹ̀",
    confidenceHigh: "gan-an",
    confidenceExplain: "Bí a ṣe ń ṣírò rẹ̀",
    confidenceBody:
      "Nǹkan mẹ́rin ló ń pinnu rẹ̀, èyí tí ó burú jù ló sì ń borí: iye ilé tí a rí, bí wọ́n ṣe yàtọ̀ síra lórí iye owó, bí àkọsílẹ̀ wọn ṣe pẹ́ tó, àti bí a ṣe wo jìnnà tó. Kò sí ẹnikẹ́ni ní Vallo tí ó lè ṣètò rẹ̀.",
    sizedShortfall:
      "A lè sọ ohun tí àwọn ilé nítòsí ń béèrè fún ọ. A kò lè sọ iye fún mítà onígun mẹ́rin kan fún ọ, nítorí ọ̀pọ̀ jù lọ àkọsílẹ̀ nítòsí ibí kò sọ ìwọ̀n.",
    comparablesHeading: "Ohun tí ó dá lé lórí",
    distanceAway: "Mítà {metres} sí ibí",
    listedAgo: "A kéde rẹ̀ ní oṣù {months} sẹ́yìn",
    listedRecently: "A kéde rẹ̀ lóṣù yìí",
    spreadHeading: "Ohun tí ọ̀kọ̀ọ̀kan ń béèrè",
    unreachableTitle: "A kò lè ṣàyẹ̀wò iye owó báyìí",
    unreachableBody:
      "Ẹ̀bi náà wà lọ́dọ̀ wa, kì í ṣe lọ́dọ̀ rẹ, kì í sì ṣe ọ̀rọ̀ nípa ohun tí ó wà nítòsí rẹ. Kò sí ohun tí o tẹ̀ tí ó sọnù. Tún gbìyànjú lẹ́yìn ìṣẹ́jú díẹ̀.",
  },

  refusals: {
    noLocation: {
      title: "A kò lè gbé àdírẹ́sì yìí sórí máàpù",
      body: "Láìsí ibi tí ó wà, a kò lè rí ohun kan láti fi wé e. Kò sí ìwádìí àdírẹ́sì fún Nàìjíríà tí a fọkàn tán, nítorí náà pinni ni ọ̀nà tí a ń gbà ṣe é.",
    },
    noComparables: {
      title: "A kò tíì ní ohun tí a tẹ̀ jáde nítòsí ibí",
      body: "Kò sí nǹkan kan nítòsí ibí yìí tí a lè fi wéra. A kò ní fojú díwọ̀n.",
    },
    tooFewComparables: {
      title: "A rí ilé {count} nítòsí ibí",
      body: "Ìyẹn kò tó láti fún ọ ní nọ́mbà tí a lè dúró lé lórí. Márùn-ún ni ó kéré jù tí a ń gbà. Ohun tí a rí nìyí, bí àkọsílẹ̀ nítòsí, kì í ṣe bí ìfojúdíwọ̀n.",
    },
    tooFewSized: {
      title: "A kò lè fún ọ ní iye fún mítà onígun mẹ́rin kan",
      body: "Ọ̀pọ̀ jù lọ àkọsílẹ̀ nítòsí ibí kò sọ ìwọ̀n, nítorí náà nọ́mbà fún mítà onígun mẹ́rin yóò wá láti inú díẹ̀ jù nínú wọn láti ní ìtumọ̀.",
    },
    wideDispersion: {
      title: "Àwọn ilé nítòsí ibí yàtọ̀ síra jù",
      body: "Nọ́mbà tí ó wúlò nílò kí wọ́n fohùn ṣọ̀kan jù bẹ́ẹ̀ lọ. Ohun tí wọ́n ń béèrè nìyí, ní títẹ́ sílẹ̀, kí o lè rí ìyàtọ̀ náà fúnra rẹ.",
    },
    stale: {
      title: "Àwọn àkọsílẹ̀ tí ó sún mọ́ jù ti ju ọdún kan lọ",
      body: "Iye owó náírà ti yí padà láti ìgbà náà. A fẹ́ kí a dákẹ́ ju kí a tún nọ́mbà àtijọ́ sọ.",
    },
    unsupportedType: {
      title: "A kì í díyelé irú ohun ìní yìí",
      body: "A ń díyelé ilẹ̀ ní ìbámu pẹ̀lú ìpín ilẹ̀, ìwé ẹ̀tọ́ àti ọ̀nà àbáwọlé, ilẹ̀ méjì ní òpópónà kan náà sì lè yàtọ̀ gidigidi ní iye. A ń díyelé hótẹ́ẹ̀lì àti ilé oúnjẹ fún alẹ́ kan àti fún ènìyàn kan. Àkọsílẹ̀ púpọ̀ sí i kò ní yí ìyẹn padà.",
    },
    unsupportedPeriod: {
      title: "A ń ṣiṣẹ́ pẹ̀lú háyà ọdọọdún",
      body: "Èyí jẹ́ háyà àkókò kúkúrú, fífi méjìlá sọ háyà oṣù kan di púpọ̀ sì ń ronú pé ẹnì kan yóò gbé ibẹ̀ fún oṣù méjìlá tí ẹnikẹ́ni kò ṣèlérí.",
    },
    demoOnly: {
      title: "Gbogbo ohun tí a ní nítòsí ibí jẹ́ àpẹẹrẹ àkọsílẹ̀",
      body: "Wọ́n wà níbẹ̀ láti fi bí pẹpẹ ṣe ń ṣiṣẹ́ hàn, kì í ṣe láti díyelé wọn. A kò ní kọ́ nọ́mbà láti inú àpẹẹrẹ.",
    },
  },

  actions: {
    dropPin: "Fi pinni sí i",
    areaReport: "Wo iye owó àdúgbò",
    notifyMe: "Sọ fún mi nígbà tí ẹ bá lè dáhùn",
    notifyMeSignedOut: "Wọlé kí a lè sọ fún ọ nígbà tí a bá lè dáhùn",
    showNearby: "Fi ohun tí a rí hàn",
    registeredFirm: "Wá ilé iṣẹ́ tí a forúkọ rẹ̀ sílẹ̀",
    changePeriod: "Béèrè nípa háyà ọdọọdún",
    listIt: "Kéde rẹ̀ lórí Vallo",
    seeSimilar: "Wo èyí tí ó jọra nítòsí",
    share: "Pín káàdì àdúgbò",
    startOver: "Bẹ̀rẹ̀ lẹ́ẹ̀kan sí i",
  },

  next: {
    heading: "Kí ló kàn",
    seeListings: "Wo àkọsílẹ̀ ní àdúgbò yìí",
    seeListingsBody: "Irú ibi kan náà, pẹ̀lú iye yàrá ìsùn kan náà, níbi tí o ṣàyẹ̀wò.",
    setAlert: "Sọ fún mi nípa àkọsílẹ̀ tuntun níbí",
    setAlertSignedOut: "Wọlé kí a lè sọ fún ọ nípa àkọsílẹ̀ tuntun níbí",
    alertBody: "A ń pa ìwádìí yìí mọ́ fún ọ, a sì ń sọ fún ọ nígbà tí ohun tuntun bá bá a mu.",
    alertSaved: "Ó ti parí. Ó wà nínú àwọn ìwádìí rẹ tí a fipamọ́, pẹ̀lú ìkìlọ̀ ní títàn.",
    alertOpen: "Ṣí àwọn ìwádìí tí a fipamọ́",
    shareBody: "Fi káàdì àdúgbò ránṣẹ́: ààlà iye owó àti iye àkọsílẹ̀ tí ó dá lé lórí, kì í ṣe ibi tí o fi pinni sí.",
  },

  notify: {
    heading: "Sọ fún mi nígbà tí ẹ bá lè dáhùn",
    body: "A ó sọ fún ọ ní kété tí àkọsílẹ̀ bá tó nítòsí ibí láti dáhùn. A kò ní fojú díwọ̀n ní báyìí ná.",
    signedOutBody:
      "Èyí ń dé sínú ìfitónilétí Vallo rẹ, nítorí náà o máa nílò àkọọ́lẹ̀ kan. A kì í fi ímeèlì ránṣẹ́ fún un.",
    saved: "A ti fi pamọ́. A ó sọ fún ọ nígbà tí a bá lè dáhùn.",
    alreadySaved: "O ti ń ṣọ́ ibí yìí tẹ́lẹ̀.",
    failed: "A kò lè fi ìyẹn pamọ́ báyìí. Kò sí ohun tí ó sọnù, nítorí náà tún gbìyànjú láìpẹ́.",
  },

  area: {
    heading: "Iye owó àdúgbò",
    subheading: "Ohun tí àwọn ilé níbí ń béèrè báyìí",
    askingFor: "{type} oní yàrá ìsùn {bedrooms}",
    studioFor: "{type} studio",
    basis: "Láti inú àkọsílẹ̀ {count}, tí a tẹ̀ jáde láàrin {from} àti {to}.",
    perSqm: "{amount} fún mítà onígun mẹ́rin kan",
    perSqmCoverage: "láti inú àkọsílẹ̀ {sized} nínú {count} níbí tí ó sọ ìwọ̀n",
    noPerSqm: "Kò sí nọ́mbà fún mítà onígun mẹ́rin: àkọsílẹ̀ díẹ̀ jù níbí ló sọ ìwọ̀n.",
    emptyTitle: "Kò tíì sí iye owó àdúgbò fún ibí",
    emptyBody:
      "A nílò ó kéré tán àkọsílẹ̀ gidi mẹ́ta ti irú kan náà ní àdúgbò kan kí a tó tẹ ààlà jáde. A kò ní fojú díwọ̀n.",
    demoOnlyTitle: "Gbogbo ohun tí a ní níbí jẹ́ àpẹẹrẹ àkọsílẹ̀",
    demoOnlyBody: "Wọ́n wà níbẹ̀ láti fi bí pẹpẹ ṣe ń ṣiṣẹ́ hàn, kì í ṣe láti díyelé wọn.",
    unreachableTitle: "A kò lè ka àwọn àkọsílẹ̀ báyìí",
    unreachableBody:
      "Ẹ̀bi náà wà lọ́dọ̀ wa, kì í ṣe lọ́dọ̀ rẹ, kì í sì ṣe ọ̀rọ̀ nípa ohun tí ó wà níbí. Tún gbìyànjú lẹ́yìn ìṣẹ́jú díẹ̀.",
  },

  facts: {
    heading: "Iná àti omi ní àyíká ibí",
    basis:
      "Láti inú àkọsílẹ̀ {count} tí a ní níbí. Ohun tí wọ́n sọ nípa ara wọn nìyí, kì í ṣe ìwádìí àdúgbò.",
    grid: "Iná ìjọba",
    backup: "Iná àfẹ̀yìntì",
    water: "Omi",
    prepaid: "Mítà àsansílẹ̀",
    estate: "Agbègbè olódi",
    ofListings: "{count} nínú {total}",
    mostCommon: "Ọ̀pọ̀ jù lọ ń sọ pé {value}",
    gridBandA: "Band A",
    gridMostlyOn: "Ó sábà máa ń wà",
    gridPatchy: "Lẹ́ẹ̀kọ̀ọ̀kan",
    gridRarely: "Ó ṣọ̀wọ́n",
    gridNone: "Kò sí",
    backupNone: "Kò sí",
    backupGenerator: "Jẹnẹrétọ̀",
    backupInverter: "Inverter",
    backupSolar: "Agbára oòrùn",
    backupGeneratorInverter: "Jẹnẹrétọ̀ àti inverter",
    waterTreatedMains: "Omi ẹ̀rọ tí a ti fọ̀",
    waterBorehole: "Kànga ẹ̀rọ",
    waterPumpedStorage: "Táǹkì tí a ń fa omi sí",
    waterTanker: "Táǹkà",
    waterNone: "Kò sí",
    empty: "Kò tíì sí àkọsílẹ̀ níbí tí ó sọ nípa iná tàbí omi rẹ̀.",
  },

  share: {
    heading: "Pín iye owó àdúgbò wọ̀nyí",
    body: "Káàdì náà ń dárúkọ àdúgbò àti irú ohun ìní. Kì í dárúkọ àdírẹ́sì rí, kódà tìrẹ.",
    why: "Kí ló dé tí kì í ṣe àdírẹ́sì mi?",
    whyBody:
      "Àdírẹ́sì lẹ́gbẹ̀ẹ́ iye owó náírà jẹ́ ìwé tí ó wúlò fún ẹni tí kò yẹ, a sì ń fi káàdì ránṣẹ́ síwájú jìnnà ju àwọn tí a fi ránṣẹ́ sí lọ. Ẹnikẹ́ni tí ó ń gbé ibẹ̀ ni ó wà nínú ewu, a kò sì bi wọ́n rí. Bí o bá fẹ́ kí a rí ilé kan pàtó, tẹ̀ ẹ́ jáde bí àkọsílẹ̀.",
    cardLine: "{type} oní yàrá ìsùn {bedrooms} ní {area} ń béèrè {low} sí {high}",
    copy: "Da ìjápọ̀ náà kọ",
    copied: "A ti da á kọ",
    make: "Pín iye owó wọ̀nyí",
    making: "À ń ṣe káàdì náà",
    madeHeading: "Káàdì rẹ ti ṣetán",
    madeBody:
      "Ẹnikẹ́ni tí ó bá ní ìjápọ̀ yìí lè kà á. Ó ń dárúkọ àdúgbò àti irú ohun ìní, kò sì dárúkọ àdírẹ́sì kankan.",
    failed: "A kò lè ṣe káàdì yẹn báyìí. Kò sí ohun tí ó sọnù, nítorí náà tún gbìyànjú láìpẹ́.",
    nothingYet: "Kò tíì sí ohun tí a lè pín níbí",
    nothingYetBody:
      "Káàdì nílò ó kéré tán àkọsílẹ̀ gidi mẹ́ta ti irú kan náà ní àdúgbò kan. A kò ní ṣe ọ̀kan láti inú èyí tí ó kéré sí bẹ́ẹ̀.",
    open: "Ṣí káàdì náà",
    pageLead: "Iye tí a ń polówó àwọn ilé ní àdúgbò yìí fún lórí Vallo báyìí.",
    headline: "{type} oní yàrá ìsùn {bedrooms} ní {area}",
    headlineNoBedrooms: "{type} ní {area}",
    headlineStudio: "{type} studio ní {area}",
    cardRange: "Wọ́n ń béèrè {low} sí {high} {period}",
    cardBasis: "Ní ìbámu pẹ̀lú àkọsílẹ̀ Vallo {count}, {month}",
    cardBasisNoDate: "Ní ìbámu pẹ̀lú àkọsílẹ̀ Vallo {count}",
    cardMeterWord: "Àkọsílẹ̀ {count}",
    cardStatListings: "Àkọsílẹ̀",
    cardStatMonth: "A ṣe é",
    typeApartmentPlural: "àwọn fúláàtì",
    typeHomePlural: "àwọn ilé",
    typeShopPlural: "àwọn ṣọ́ọ̀bù",
    typeOfficePlural: "àwọn ọ́fíìsì",
    typeAnyPlural: "Àwọn ohun ìní",
    madeOn: "A ṣe káàdì náà ní {month}.",
    frozen:
      "Àwọn nọ́mbà wọ̀nyí jẹ́ òótọ́ nípa àwọn àkọsílẹ̀ tí a ní nígbà tí a ṣe káàdì náà. A kì í ṣírò wọn lẹ́ẹ̀kan sí i.",
    checkYours: "Ṣàyẹ̀wò àdúgbò mìíràn",
    seeListings: "Wo ohun tí a kéde níbí",
    missingTitle: "Káàdì yìí kò sí níbí",
    missingBody:
      "Bóyá ìjápọ̀ náà kò tọ̀nà, tàbí a kò ṣe káàdì náà rí. O lè ṣe àyẹ̀wò iye owó tìrẹ dípò.",
  },
} satisfies NonNullable<Translation["priceCheck"]>;
