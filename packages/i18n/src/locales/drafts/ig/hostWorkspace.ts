import type { Translation } from "../../fallback";

/* MACHINE DRAFT, 30 September 2026. Needs a native Igbo speaker's review
   (review-status.ts). "Onye nnabata" is the host, as in desk.ts; TIN, RC and
   BN are kept as the registries write them. */
export const hostWorkspaceIg = {
  loading: "Na-ebugo",
  home: {
    signedOutTitle: "Nabata ndị ọbịa na Vallo",
    signedOutBody:
      "Depụta họtel, ụlọ ọbịa, flat a na-elekọta ma ọ bụ ụlọ nri. Banye, arịrịọ ahụ ga-echekwa onwe ya n'akaụntụ gị ka ị na-aga.",
    startTitle: "Bụrụ onye nnabata",
    startBody:
      "Nzọụkwụ dị mkpụmkpụ iri kacha elu, a na-echekwa ya ka ị na-aga. Onye otu anyị na-agụ ya, akara ahụ na-apụtakwa naanị na e nyochara mmadụ.",
  },
  apply: {
    signedOutTitle: "Banye ka ị bụrụ onye nnabata",
    signedOutBody:
      "A na-echekwa arịrịọ gị n'akaụntụ gị ka ị na-aga, ya mere ọ chọrọ otu. Ị ga-alaghachi ebe a ozugbo.",
    failedTitle: "Anyị enweghị ike imeghe arịrịọ gị",
    failedBody:
      "Ọ dịghị ihe gbanwere, nkọwa gị echekwara ka dị; naanị na anyị enweghị ike ibugo ha n'oge a. Nwaa ọzọ n'oge na-adịghị anya.",
  },
  photos: {
    signedOutTitle: "Foto nke ebe gị",
    signedOutBody: "Banye ka i tinye foto nke gị n'ibe ebe gị.",
    noVenueTitle: "Enwebeghị ebe",
    noVenueBody:
      "Foto na-adabere n'ebe, ya mere e nwere otu ihe a ga-ebu ụzọ mee. Arịrịọ na-ewe nzọụkwụ dị mkpụmkpụ iri kacha elu, ọ na-echekwakwa onwe ya ka ị na-aga.",
    venuesLabel: "Ebe gị",
    saveFirstTitle: "Buru ụzọ chekwaa ụlọ ahụ",
    saveFirstBody:
      "Foto na-adabere n'ụlọ ahụ n'onwe ya, ya mere arịrịọ ahụ na-ebu ụzọ rịọ aha ya na pin ya. Chekwaa ụlọ ahụ n'ebe ahụ, foto ndị ahụ ga-arịgokwa n'otu nzọụkwụ ahụ.",
  },
  reservations: {
    signedOutTitle: "Tebụl gị",
    signedOutBody: "Banye ka ị hụ tebụl ndị ọbịa rịọrọ n'ebe gị, ma nabata ma ọ bụ jụ ha.",
    failedTitle: "Anyị enweghị ike ibugo tebụl gị",
    failedBody:
      "Nsogbu a sitere n'akụkụ anyị, ọ bụghị n'akụkụ gị, ọ dịghịkwa ihe furu efu. Nwaa ọzọ mgbe nkeji ole na ole gachara. Arịrịọ ọ bụla ọbịa rịọrọ ka na-eche gị.",
    emptyTitle: "Enwebeghị tebụl",
    emptyBody:
      "Mgbe mmadụ rịọrọ tebụl n'ebe gị, ọ na-apụta ebe a, ya na aha ha, ọnụọgụ ndị mmadụ na oge n'elekere Legọs. Ọ naghị efu onye ọ bụla ihe ọ bụla, ọ dịghịkwa ihe a na-ejide ruo mgbe ị nabatara ya.",
  },
  rooms: {
    signedOutTitle: "Ime ụlọ gị na abalị gị",
    signedOutBody: "Banye ka ị hụ ime ụlọ ole i nwere maka ire na ogologo oge n'ihu ndị ọbịa nwere ike idebe ha.",
    noPropertyTitle: "Enwebeghị ụlọ",
    noPropertyBody:
      "Ime ụlọ na-adabere n'ụlọ, ya mere e nwere otu ihe a ga-ebu ụzọ mee. Arịrịọ na-ewe nzọụkwụ dị mkpụmkpụ iri kacha elu, ọ na-echekwakwa onwe ya ka ị na-aga.",
    saveFirstTitle: "Buru ụzọ chekwaa ụlọ ahụ",
    saveFirstBody:
      "Ime ụlọ na abalị ha na-adabere n'ụlọ ahụ n'onwe ya, ya mere arịrịọ ahụ na-ebu ụzọ rịọ aha ya na pin ya. Chekwaa ụlọ ahụ n'ebe ahụ, ime ụlọ ndị ahụ ga-esokwa na nzọụkwụ na-esote.",
    propertiesLabel: "Ụlọ gị",
    noRoomTypesTitle: "Enwebeghị ụdị ime ụlọ",
    noRoomTypesBody:
      "Ụdị ime ụlọ bụ ụdị ime ụlọ ọbịa na-edebe, dịka ime ụlọ nwere akwa abụọ dị oke ọnụ. Tinye opekata mpe otu, ya na ole dị na ihe otu abalị na-efu, ụlọ ahụ nwere ike ịrịgo n'elu shelf.",
  },
  settings: {
    signedOutTitle: "Ntọala onye nnabata",
    signedOutBody: "Banye ka ị gbanwee ihe na-eru gị banyere ebe obibi na ụlọ nri gị.",
    businessesTitle: "Azụmahịa gị",
  },
  transfer: {
    signedOutTitle: "Nyefee azụmahịa",
    signedOutBody: "Banye ka ị bufee azụmahịa nye onye ọzọ, ma ọ bụ zaa onyinye mmadụ nyere gị.",
    offeredTitle: "E nyere gị ya",
    businessesTitle: "Azụmahịa gị",
    nothingTitle: "Ọ dịghị ihe a ga-enyefe",
    nothingBody: "Ọ dịghị azụmahịa n'akaụntụ a, ya mere ọ dịghị ihe ebe a guzoro n'etiti gị na ihe ọ bụla.",
  },
  facilitiesLabel: "Ihe ụlọ ahụ na-enye",
  wizard: {
    hostKindLabel: "Kedu ụdị onye nnabata ị bụ?",
    businessKindLabel: "Ụdị azụmahịa",
    businessName: "Aha azụmahịa edebanyere",
    rcNumber: "Nọmba RC ma ọ bụ BN",
    fullName: "Aha gị zuru ezu",
    phone: "Ekwentị gị",
    bank: "Ụlọ akụ",
    accountNumber: "Nọmba akaụntụ",
    permissionsLabel: "Ikike",
    review: {
      contact: "Kọntaktị",
      address: "Adreesị",
      registration: "Ndebanye aha",
      representative: "Onye nnọchite",
      property: "Ụlọ",
      service: "Ọrụ",
      payouts: "Ịkwụ ụgwọ",
    },
  },
  nights: {
    firstNight: "Abalị mbụ",
    lastNight: "Abalị ikpeazụ",
    roomsOnSale: "Ime ụlọ a na-ere kwa abalị",
  },
  steps: {
    pinLabel: "Pin na maapụ",
    hotelName: "Aha họtel",
    rcNumber: "Nọmba RC",
    address: "Adreesị",
    changeAddress: "Gbanwee adreesị ahụ",
    starRating: "Ọkwa kpakpando",
    roomCount: "Ọnụọgụ ime ụlọ",
    roomsUnit: "ime ụlọ",
    cancellationPolicy: "Iwu ịkagbu",
    shortletKind: "Kedu ụdị shortlet ị na-edepụta?",
    placeName: "Ihe ị na-akpọ ya",
    bedrooms: "Ime ụlọ ihi ụra",
    beds: "Akwa",
    maxGuests: "Ọnụọgụ ndị ọbịa kacha elu",
    nightlyPrice: "Ọnụahịa abalị",
    cancellation: "Ịkagbu",
    freeCancellation: "Ịkagbu n'efu",
    mealPlan: "Ihe abalị ahụ gụnyere",
    restaurantName: "Aha ụlọ nri",
    cuisine: "Ụdị nri",
    priceBand: "Ọkwa ọnụahịa",
    roomTypeName: "Aha",
    roomTypePlaceholder: "Ime ụlọ nwere akwa abụọ dị oke ọnụ",
    roomKind: "Kedu ụdị ime ụlọ",
    roomsOfKind: "ime ụlọ nke ụdị a",
    guestsUnit: "ndị ọbịa",
    openingHours: "Oge mmeghe",
    tableInventory: "Ọnụọgụ tebụl",
    sittingDuration: "Ogologo oge ịnọdụ ala",
  },
} satisfies NonNullable<Translation["hostWorkspace"]>;
