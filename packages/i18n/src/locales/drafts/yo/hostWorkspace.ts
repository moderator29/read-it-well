import type { Translation } from "../../fallback";

/* MACHINE DRAFT, 30 September 2026. Needs a native Yoruba speaker's review
   (review-status.ts). "Olùgbàlejò" is the host, as in desk.ts; TIN, RC and
   BN are kept as the registries write them. */
export const hostWorkspaceYo = {
  loading: "À ń gbé e wọlé",
  home: {
    signedOutTitle: "Gbàlejò lórí Vallo",
    signedOutBody:
      "Kéde hótẹ́ẹ̀lì, ilé àlejò, fúláàtì olùtọ́jú tàbí ilé oúnjẹ. Wọlé, ìbéèrè náà yóò sì máa fi ara rẹ̀ pamọ́ sínú àkọọ́lẹ̀ rẹ bí o ṣe ń lọ.",
    startTitle: "Di olùgbàlejò",
    startBody:
      "Ìgbésẹ̀ kúkúrú mẹ́wàá ní púpọ̀ jù, tí a ń fi pamọ́ bí o ṣe ń lọ. Ènìyàn kan nínú ẹgbẹ́ wa ń kà á, àmì náà sì túmọ̀ sí pé a ṣàyẹ̀wò ènìyàn nìkan.",
  },
  apply: {
    signedOutTitle: "Wọlé láti di olùgbàlejò",
    signedOutBody:
      "A ń fi ìbéèrè rẹ pamọ́ sínú àkọọ́lẹ̀ rẹ bí o ṣe ń lọ, nítorí náà ó nílò ọ̀kan. O máa padà síbí tààrà.",
    failedTitle: "A kò lè ṣí ìbéèrè rẹ",
    failedBody:
      "A kò yí nǹkan kan padà, àwọn àlàyé tí o fi pamọ́ ṣì wà níbẹ̀; a kàn kò lè gbé wọn wọlé ní àkókò yìí. Tún gbìyànjú láìpẹ́.",
  },
  photos: {
    signedOutTitle: "Àwòrán ibi rẹ",
    signedOutBody: "Wọlé láti fi àwòrán tìrẹ sórí ojú ewé ibi rẹ.",
    noVenueTitle: "Kò tíì sí ibi kankan",
    noVenueBody:
      "Àwòrán ń so mọ́ ibi kan, nítorí náà ohun kan wà láti kọ́kọ́ ṣe. Ìbéèrè kan ń gba ìgbésẹ̀ kúkúrú mẹ́wàá ní púpọ̀ jù, ó sì ń fi ara rẹ̀ pamọ́ bí o ṣe ń lọ.",
    venuesLabel: "Àwọn ibi rẹ",
    saveFirstTitle: "Kọ́kọ́ fi ilé náà pamọ́",
    saveFirstBody:
      "Àwòrán ń so mọ́ ilé náà fúnra rẹ̀, nítorí náà ìbéèrè náà ń kọ́kọ́ béèrè orúkọ rẹ̀ àti pinni rẹ̀. Fi ilé náà pamọ́ níbẹ̀, àwọn àwòrán náà yóò sì gòkè ní ìgbésẹ̀ kan náà.",
  },
  reservations: {
    signedOutTitle: "Àwọn tábìlì rẹ",
    signedOutBody: "Wọlé láti rí àwọn tábìlì tí àwọn àlejò ti béèrè ní ibi rẹ, àti láti gbà wọ́n tàbí kọ̀ wọ́n.",
    failedTitle: "A kò lè gbé àwọn tábìlì rẹ wọlé",
    failedBody:
      "Ẹ̀bi náà wà lọ́dọ̀ wa, kì í ṣe lọ́dọ̀ rẹ, kò sì sí ohun tí ó sọnù. Tún gbìyànjú lẹ́yìn ìṣẹ́jú díẹ̀. Ìbéèrè èyíkéyìí tí àlejò kan ṣe ṣì ń dúró dè ọ́.",
    emptyTitle: "Kò tíì sí tábìlì",
    emptyBody:
      "Nígbà tí ẹnì kan bá béèrè tábìlì ní ibi rẹ, yóò hàn níbí, pẹ̀lú orúkọ wọn, iye ènìyàn àti àkókò lórí aago Èkó. Kò ná ẹnikẹ́ni ní nǹkan kan, a kò sì dá nǹkan kan dúró títí o ó fi gbà á.",
  },
  rooms: {
    signedOutTitle: "Àwọn yàrá rẹ àti àwọn alẹ́ rẹ",
    signedOutBody: "Wọlé láti rí iye yàrá tí o ní fún títà àti bí àwọn àlejò ṣe lè ṣe ìfipamọ́ jìnnà sí iwájú tó.",
    noPropertyTitle: "Kò tíì sí ilé kankan",
    noPropertyBody:
      "Yàrá ń so mọ́ ilé kan, nítorí náà ohun kan wà láti kọ́kọ́ ṣe. Ìbéèrè kan ń gba ìgbésẹ̀ kúkúrú mẹ́wàá ní púpọ̀ jù, ó sì ń fi ara rẹ̀ pamọ́ bí o ṣe ń lọ.",
    saveFirstTitle: "Kọ́kọ́ fi ilé náà pamọ́",
    saveFirstBody:
      "Yàrá àti àwọn alẹ́ wọn ń so mọ́ ilé náà fúnra rẹ̀, nítorí náà ìbéèrè náà ń kọ́kọ́ béèrè orúkọ rẹ̀ àti pinni rẹ̀. Fi ilé náà pamọ́ níbẹ̀, àwọn yàrá náà yóò sì tẹ̀lé e ní ìgbésẹ̀ tí ó kàn.",
    propertiesLabel: "Àwọn ilé rẹ",
    noRoomTypesTitle: "Kò tíì sí irú yàrá kankan",
    noRoomTypesBody:
      "Irú yàrá jẹ́ irú yàrá tí àlejò ń ṣe ìfipamọ́ rẹ̀, bí yàrá oníbùsùn méjì olówó iyebíye. Fi ọ̀kan kún un ó kéré tán, pẹ̀lú iye tí ó wà àti iye tí alẹ́ kan ń ná, ilé náà yóò sì lè gòkè sórí pẹpẹ.",
  },
  settings: {
    signedOutTitle: "Ètò olùgbàlejò",
    signedOutBody: "Wọlé láti yí ohun tí ó ń dé ọ̀dọ̀ rẹ nípa ibùgbé àti ilé oúnjẹ rẹ padà.",
    businessesTitle: "Àwọn iṣẹ́ òwò rẹ",
  },
  transfer: {
    signedOutTitle: "Fa iṣẹ́ òwò kan lé ẹlòmíràn lọ́wọ́",
    signedOutBody: "Wọlé láti gbé iṣẹ́ òwò kan lọ sọ́dọ̀ ẹlòmíràn, tàbí láti dáhùn ìfilọ̀ tí ẹnì kan ṣe fún ọ.",
    offeredTitle: "A fi lọ̀ ọ́",
    businessesTitle: "Àwọn iṣẹ́ òwò rẹ",
    nothingTitle: "Kò sí ohun tí a ó fà lé lọ́wọ́",
    nothingBody: "Kò sí iṣẹ́ òwò kankan lórí àkọọ́lẹ̀ yìí, nítorí náà kò sí ohun tí ó dúró láàrin ìwọ àti ohunkóhun níbí.",
  },
  facilitiesLabel: "Ohun tí ilé náà ń pèsè",
  wizard: {
    hostKindLabel: "Irú olùgbàlejò wo ni ọ́?",
    businessKindLabel: "Irú iṣẹ́ òwò",
    businessName: "Orúkọ iṣẹ́ òwò tí a forúkọ rẹ̀ sílẹ̀",
    rcNumber: "Nọ́mbà RC tàbí BN",
    fullName: "Orúkọ rẹ ní kíkún",
    phone: "Fóònù rẹ",
    bank: "Báńkì",
    accountNumber: "Nọ́mbà àkọọ́lẹ̀",
    permissionsLabel: "Àwọn àṣẹ",
    review: {
      contact: "Ìkànsí",
      address: "Àdírẹ́sì",
      registration: "Ìforúkọsílẹ̀",
      representative: "Aṣojú",
      property: "Ilé",
      service: "Iṣẹ́",
      payouts: "Ìsanwó",
    },
  },
  nights: {
    firstNight: "Alẹ́ àkọ́kọ́",
    lastNight: "Alẹ́ tí ó kẹ́yìn",
    roomsOnSale: "Yàrá tí ó wà fún títà ní alẹ́ kọ̀ọ̀kan",
  },
  steps: {
    pinLabel: "Pinni lórí máàpù",
    hotelName: "Orúkọ hótẹ́ẹ̀lì",
    rcNumber: "Nọ́mbà RC",
    address: "Àdírẹ́sì",
    changeAddress: "Yí àdírẹ́sì padà",
    starRating: "Ìwọ̀n ìràwọ̀",
    roomCount: "Iye yàrá",
    roomsUnit: "yàrá",
    cancellationPolicy: "Ìlànà fífagilé",
    shortletKind: "Irú shortlet wo ni o ń kéde?",
    placeName: "Ohun tí o ń pè é",
    bedrooms: "Yàrá ìsùn",
    beds: "Ibùsùn",
    maxGuests: "Àlejò tí ó pọ̀ jù",
    nightlyPrice: "Iye fún alẹ́ kan",
    cancellation: "Fífagilé",
    freeCancellation: "Fífagilé ọ̀fẹ́",
    mealPlan: "Ohun tí alẹ́ náà ní nínú",
    restaurantName: "Orúkọ ilé oúnjẹ",
    cuisine: "Irú oúnjẹ",
    priceBand: "Ìpele iye owó",
    roomTypeName: "Orúkọ",
    roomTypePlaceholder: "Yàrá oníbùsùn méjì olówó iyebíye",
    roomKind: "Irú yàrá wo",
    roomsOfKind: "yàrá irú èyí",
    guestsUnit: "àlejò",
    openingHours: "Àkókò ìṣísílẹ̀",
    tableInventory: "Iye tábìlì",
    sittingDuration: "Gígùn ìjókòó",
  },
} satisfies NonNullable<Translation["hostWorkspace"]>;
