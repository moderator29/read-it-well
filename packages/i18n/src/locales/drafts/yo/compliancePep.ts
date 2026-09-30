import type { Translation } from "../../fallback";

/* MACHINE DRAFT, 30 September 2026. Needs a native Yoruba speaker's review
   (review-status.ts). Only `question`, the part a lister reads; the staff
   lane stays English by decision (STAFF_ENGLISH). */
export const compliancePepYo = {
  question: {
    title: "Ìbéèrè tí a ń bi gbogbo ẹni tí ó ń polówó",
    body: "Àwọn òfin Nàìjíríà lòdì sí fífọ owó ń béèrè lọ́wọ́ gbogbo ẹni tí ó ń polówó bóyá àwọn, ọmọ ẹbí wọn tàbí alábàáṣiṣẹ́ tímọ́tímọ́ di ipò gíga ìjọba mú tàbí ti dì í mú rí: fún àpẹẹrẹ mínísítà, kọmíṣọ́nà, gómìnà, aṣòfin, adájọ́ àgbà, ọ̀gá àgbà ológun tàbí ọlọ́pàá, olóyè ẹgbẹ́ òṣèlú, tàbí olórí ilé iṣẹ́ ìjọba.",
    legend: "Ṣé èyí ṣàpèjúwe rẹ, ọmọ ẹbí rẹ tàbí alábàáṣiṣẹ́ tímọ́tímọ́ rẹ?",
    yes: "Bẹ́ẹ̀ ni",
    no: "Rárá",
    who: "Ta ni?",
    self: "Èmi",
    family: "Ọmọ ẹbí",
    associate: "Alábàáṣiṣẹ́ tímọ́tímọ́",
    role: "Ipò wo, àti níbo",
    rolePlaceholder: "Fún àpẹẹrẹ, Kọmíṣọ́nà fún Iṣẹ́, Ìpínlẹ̀ Ògùn, 2019 sí 2023",
    save: "Fi ìdáhùn mi pamọ́",
    saving: "Ó ń fipamọ́",
    saved: "A ti fi pamọ́. A dúpẹ́.",
    answered: "O dáhùn èyí ní {date}. Tí ìwọ, ọmọ ẹbí rẹ tàbí alábàáṣiṣẹ́ tímọ́tímọ́ rẹ bá gba irú ipò bẹ́ẹ̀, sọ fún wa níbí.",
    again: "Sọ fún wa nípa ipò tuntun",
    chooseOne: "Yan bẹ́ẹ̀ ni tàbí rárá.",
    whoNeeded: "Sọ ẹni tí ó jẹ́.",
    roleNeeded: "Sọ ipò wo, àti níbo.",
    failed: "A kò fi ìdáhùn rẹ pamọ́. Jọ̀wọ́ gbìyànjú lẹ́ẹ̀kan sí i.",
    unavailable: "A kò lè gbé ìbéèrè yìí wá báyìí. Tún ojú ìwé náà ṣí láti gbìyànjú lẹ́ẹ̀kan sí i.",
    payoutFirst: "Dáhùn ìbéèrè nípa ipò ìjọba lórí ojú ìwé yìí kí o tó fi àkáǹtì ìgbowó kún un.",
    banner: "Ìbéèrè kan ń dúró dè ọ́: bóyá ìwọ, ọmọ ẹbí rẹ tàbí alábàáṣiṣẹ́ tímọ́tímọ́ rẹ di ipò gíga ìjọba mú. Kò ní pẹ́.",
    bannerLink: "Dáhùn rẹ̀",
    checkFailed: "A kò lè ṣàyẹ̀wò èyí báyìí. A kò fi nǹkan kan pamọ́; jọ̀wọ́ gbìyànjú lẹ́ẹ̀kan sí i láìpẹ́.",
  },
} satisfies NonNullable<Translation["compliancePep"]>;
