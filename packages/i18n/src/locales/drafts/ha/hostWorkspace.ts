import type { Translation } from "../../fallback";

/* MACHINE DRAFT, 30 September 2026. Needs a native Hausa speaker's review
   (review-status.ts). "Mai masauki" is the host, as in desk.ts; TIN, RC and
   BN are kept as the registries write them. */
export const hostWorkspaceHa = {
  loading: "Ana lodawa",
  home: {
    signedOutTitle: "Karɓi baƙi a Vallo",
    signedOutBody:
      "Sanya otal, gidan baƙi, fulat masu hidima ko gidan abinci. Shiga kuma takardar nema tana adanuwa a asusunka yayin da kake cikewa.",
    startTitle: "Zama mai masauki",
    startBody:
      "Gajerun matakai goma a mafi yawa, ana adanawa yayin da kake cikewa. Wani a ƙungiyarmu yana karanta shi, kuma alamar tana nufin an duba mutum ne kawai.",
  },
  apply: {
    signedOutTitle: "Shiga don zama mai masauki",
    signedOutBody:
      "Ana adana takardar nemanka a asusunka yayin da kake cikewa, don haka tana buƙatar ɗaya. Za ka dawo nan kai tsaye.",
    failedTitle: "Ba mu iya buɗe takardar nemanka ba",
    failedBody:
      "Ba a canza komai ba kuma bayanan da ka ajiye suna nan; kawai ba mu iya loda su a wannan karon ba. Sake gwadawa nan da ɗan lokaci.",
  },
  photos: {
    signedOutTitle: "Hotunan wurinka",
    signedOutBody: "Shiga don sanya hotunanka a shafin wurinka.",
    noVenueTitle: "Babu wuri tukuna",
    noVenueBody:
      "Hotuna suna rataye a kan wuri, don haka akwai abu ɗaya da za a fara yi. Takardar nema tana ɗaukar gajerun matakai goma a mafi yawa kuma tana adanuwa yayin da kake cikewa.",
    venuesLabel: "Wuraren ka",
    saveFirstTitle: "Ajiye gidan da farko",
    saveFirstBody:
      "Hotuna suna rataye a kan gidan kansa, don haka takardar nema tana neman sunansa da fil ɗinsa da farko. Ajiye gidan a can, kuma hotunan suna hawa a mataki ɗaya.",
  },
  reservations: {
    signedOutTitle: "Teburanka",
    signedOutBody: "Shiga don ganin teburan da baƙi suka nema a wurinka, da kuma karɓa ko ƙi su.",
    failedTitle: "Ba mu iya loda teburanka ba",
    failedBody:
      "Laifin daga ɓangarenmu ne, ba naka ba, kuma babu abin da ya ɓace. Sake gwadawa bayan 'yan mintuna. Duk buƙatar da baƙo ya yi har yanzu tana jiranka.",
    emptyTitle: "Babu tebura tukuna",
    emptyBody:
      "Idan wani ya nemi tebur a wurinka yana bayyana a nan, tare da sunansa, yawan mutane da lokaci a agogon Legas. Ba ya cin kowa komai, kuma ba a riƙe komai har sai ka karɓa.",
  },
  rooms: {
    signedOutTitle: "Ɗakunanka da darenka",
    signedOutBody: "Shiga don ganin ɗakuna nawa kake da su na sayarwa da nisan gaba da baƙi za su iya yin ajiya.",
    noPropertyTitle: "Babu gida tukuna",
    noPropertyBody:
      "Ɗakuna suna rataye a kan gida, don haka akwai abu ɗaya da za a fara yi. Takardar nema tana ɗaukar gajerun matakai goma a mafi yawa kuma tana adanuwa yayin da kake cikewa.",
    saveFirstTitle: "Ajiye gidan da farko",
    saveFirstBody:
      "Ɗakuna da darensu suna rataye a kan gidan kansa, don haka takardar nema tana neman sunansa da fil ɗinsa da farko. Ajiye gidan a can, kuma ɗakunan suna biyo baya a mataki na gaba.",
    propertiesLabel: "Gidajenka",
    noRoomTypesTitle: "Babu nau'ikan ɗaki tukuna",
    noRoomTypesBody:
      "Nau'in ɗaki irin ɗaki ne da baƙo ke yin ajiya, kamar ɗakin gado biyu na alfarma. Ƙara aƙalla ɗaya, tare da nawa ne akwai da abin da dare ɗaya ke ci, kuma gidan zai iya hawa kan shiryayye.",
  },
  settings: {
    signedOutTitle: "Saitunan mai masauki",
    signedOutBody: "Shiga don canza abin da ke zuwa gare ka game da masaukinka da gidan abincinka.",
    businessesTitle: "Kasuwancinka",
  },
  transfer: {
    signedOutTitle: "Miƙa kasuwanci",
    signedOutBody: "Shiga don matsar da kasuwanci zuwa ga wani, ko amsa tayin da wani ya yi maka.",
    offeredTitle: "An yi maka tayi",
    businessesTitle: "Kasuwancinka",
    nothingTitle: "Babu abin da za a miƙa",
    nothingBody: "Babu kasuwanci a wannan asusu, don haka babu abin da ke tsaye tsakaninka da komai a nan.",
  },
  facilitiesLabel: "Abin da gidan ke bayarwa",
  wizard: {
    hostKindLabel: "Wane irin mai masauki ne kai?",
    businessKindLabel: "Irin kasuwanci",
    businessName: "Sunan kasuwanci mai rajista",
    rcNumber: "Lambar RC ko BN",
    fullName: "Cikakken sunanka",
    phone: "Wayarka",
    bank: "Banki",
    accountNumber: "Lambar asusu",
    permissionsLabel: "Izini",
    review: {
      contact: "Tuntuɓa",
      address: "Adireshi",
      registration: "Rajista",
      representative: "Wakilci",
      property: "Gida",
      service: "Sabis",
      payouts: "Biyan kuɗi",
    },
  },
  nights: {
    firstNight: "Dare na farko",
    lastNight: "Dare na ƙarshe",
    roomsOnSale: "Ɗakunan da ake sayarwa kowane dare",
  },
  steps: {
    pinLabel: "Fil a kan taswira",
    hotelName: "Sunan otal",
    rcNumber: "Lambar RC",
    address: "Adireshi",
    changeAddress: "Canza adireshin",
    starRating: "Darajar taurari",
    roomCount: "Adadin ɗakuna",
    roomsUnit: "ɗakuna",
    cancellationPolicy: "Manufar sokewa",
    shortletKind: "Wane irin shortlet kake sanyawa?",
    placeName: "Abin da kake kiransa",
    bedrooms: "Ɗakunan kwana",
    beds: "Gadaje",
    maxGuests: "Mafi yawan baƙi",
    nightlyPrice: "Farashin dare",
    cancellation: "Sokewa",
    freeCancellation: "Soke kyauta",
    mealPlan: "Abin da daren ya ƙunsa",
    restaurantName: "Sunan gidan abinci",
    cuisine: "Irin abinci",
    priceBand: "Rukunin farashi",
    roomTypeName: "Suna",
    roomTypePlaceholder: "Ɗakin gado biyu na alfarma",
    roomKind: "Wane irin ɗaki",
    roomsOfKind: "ɗakuna na wannan iri",
    guestsUnit: "baƙi",
    openingHours: "Lokutan buɗewa",
    tableInventory: "Adadin tebura",
    sittingDuration: "Tsawon zama",
  },
  /* Machine draft (D-10), needs native review like the rest of this file. */
  loadingScreens: {
    calendar: "Ana lodawa kalandarka",
    decide: "Ana lodawa buƙatun da ke jiran ka",
    reviews: "Ana lodawa sharhinka",
    earnings: "Ana lodawa kuɗin da ka samu",
    tables: "Ana lodawa teburanka",
    rooms: "Ana lodawa ɗakunanka",
  },
} satisfies NonNullable<Translation["hostWorkspace"]>;
