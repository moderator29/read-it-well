import type { Translation } from "../../fallback";

/* MACHINE DRAFT, 30 September 2026. Needs a native Yoruba speaker's review
   (review-status.ts). */
export const deskYo = {
  sidebar: {
    main: "Àkọ́kọ́",
    hostDesk: "Ibi iṣẹ́ olùgbàlejò",
    agentDesk: "Ibi iṣẹ́ aṣojú",
  },
  today: {
    title: "Òní",
    needsYou: "Ohun tí ó nílò rẹ lónìí",
    nothing: "Kò sí ohun tí ó nílò rẹ lónìí.",
    needsAttention: "Ó nílò àfiyèsí",
    seeNumbers: "Wo àwọn nọ́mbà",
    viewAll: "Wo gbogbo {count}",
    openList: "Ṣí àkójọ náà",
    sumLine: "Ìkà kọ̀ọ̀kan ń so mọ́ àkójọ tí ó ti wá.",
  },
  figure: {
    day: "Ọjọ́",
    week: "Ọ̀sẹ̀",
    month: "Oṣù",
    viewings: {
      title: "Ìbéèrè láti wo ilé",
      day: "Ìbéèrè láti wo ilé lónìí",
      week: "Ìbéèrè láti wo ilé ní ọjọ́ 7 sẹ́yìn",
      month: "Ìbéèrè láti wo ilé ní ọjọ́ 30 sẹ́yìn",
      emptyDay: "Kò sí ìbéèrè láti wo ilé lónìí síbẹ̀.",
      emptyWeek: "Kò sí ìbéèrè láti wo ilé ní ọjọ́ 7 sẹ́yìn.",
      emptyMonth: "Kò sí ìbéèrè láti wo ilé ní ọjọ́ 30 sẹ́yìn.",
    },
    bookings: {
      title: "Yàrá tí a gbà sílẹ̀",
      day: "Yàrá tí a gbà sílẹ̀ lónìí",
      week: "Yàrá tí a gbà sílẹ̀ ní ọjọ́ 7 sẹ́yìn",
      month: "Yàrá tí a gbà sílẹ̀ ní ọjọ́ 30 sẹ́yìn",
      emptyDay: "Kò sí yàrá tí a gbà sílẹ̀ lónìí síbẹ̀.",
      emptyWeek: "Kò sí yàrá tí a gbà sílẹ̀ ní ọjọ́ 7 sẹ́yìn.",
      emptyMonth: "Kò sí yàrá tí a gbà sílẹ̀ ní ọjọ́ 30 sẹ́yìn.",
    },
  },
  range: {
    label: "Àkókò",
    d7: "Ọjọ́ 7 sẹ́yìn",
    d30: "Ọjọ́ 30 sẹ́yìn",
    d90: "Ọjọ́ 90 sẹ́yìn",
  },
  host: {
    kpi: {
      arriving: "Àwọn tí ń dé lónìí",
      staying: "Àwọn tí ń sùn lálẹ́ yìí",
      requests: "Ìbéèrè tí ń dúró",
      unread: "Ìránṣẹ́ tí a kò tíì kà",
    },
    unit: {
      arriving: { other: "àlejò" },
      requests: { other: "ìbéèrè" },
      unread: { other: "ìránṣẹ́" },
    },
    pipeline: "Ìfipamọ́ ní ìbámu pẹ̀lú ipò",
    pipelineTotal: "ìfipamọ́",
    stage: {
      requested: "A ti béèrè",
      confirmed: "A ti fìdí múlẹ̀",
      checkedIn: "Wọ́n wà níbẹ̀ báyìí",
      completed: "Ó ti parí",
    },
    newListing: "Fi iṣẹ́ òwò kún un",
    attention: {
      request: "Ìbéèrè ìfipamọ́ láti ọ̀dọ̀ {guest}",
      table: "Ìbéèrè tábìlì láti ọ̀dọ̀ {guest}",
      draft: "A kò tíì fi ìbéèrè ránṣẹ́",
      draftSub: "Nǹkan {count} ló kù láti fi kún un",
      stopped: "Ṣí i láti ka àkọsílẹ̀ olùyẹ̀wò",
    },
  },
  agent: {
    kpi: {
      live: "Àkọsílẹ̀ tí ó wà láàyè",
      inspections: "Ìbéèrè àyẹ̀wò",
      review: "Lábẹ́ àyẹ̀wò",
      unread: "Ìránṣẹ́ tí a kò tíì kà",
    },
    pipeline: "Àkọsílẹ̀ ní ìbámu pẹ̀lú ipò",
    pipelineTotal: "àkọsílẹ̀",
    stage: {
      draft: "Àkọ̀pamọ́",
      review: "Lábẹ́ àyẹ̀wò",
      live: "Ó wà láàyè",
      other: "A dá a dúró tàbí a tì í",
    },
  },
  admin: {
    kpi: {
      queue: "Ìlà iṣẹ́ tí ó ṣí",
      reviews: "Àyẹ̀wò tí ó yẹ",
      alerts: "Ìkìlọ̀",
      tickets: "Tíkẹ́ẹ̀tì ìrànlọ́wọ́",
    },
    pipeline: "Iṣẹ́ ní ìbámu pẹ̀lú tábìlì",
    pipelineTotal: "ń dúró",
  },
  confirm: {
    close: "Tì",
    cancel: "Fagilé",
    next: "Ohun tí ó kàn",
    everyone: "Ohun tí olúkúlùkù ń gbà",
    total: "Àpapọ̀",
  },
} satisfies NonNullable<Translation["desk"]>;
