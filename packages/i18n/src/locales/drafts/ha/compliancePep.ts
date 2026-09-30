import type { Translation } from "../../fallback";

/* MACHINE DRAFT, 30 September 2026. Needs a native Hausa speaker's review
   (review-status.ts). Only `question`, the part a lister reads; the staff
   lane stays English by decision (STAFF_ENGLISH). */
export const compliancePepHa = {
  question: {
    title: "Tambayar da muke yi wa duk mai sanya kaya",
    body: "Dokokin Najeriya na yaƙi da safarar kuɗi suna tambayar kowane mai sanya kaya ko shi, ɗan uwansa ko abokinsa na kusa yana riƙe ko ya taɓa riƙe babban muƙamin gwamnati: misali minista, kwamishina, gwamna, ɗan majalisa, babban alƙali, babban jami'in soja ko 'yan sanda, jami'in jam'iyya, ko shugaban kamfanin gwamnati.",
    legend: "Shin wannan ya shafe ka, ɗan uwanka ko abokinka na kusa?",
    yes: "E",
    no: "A'a",
    who: "Wane ne?",
    self: "Ni",
    family: "Ɗan uwa",
    associate: "Aboki na kusa",
    role: "Wane muƙami, kuma a ina",
    rolePlaceholder: "Misali, Kwamishinan Ayyuka, Jihar Ogun, 2019 zuwa 2023",
    save: "Ajiye amsata",
    saving: "Ana ajiyewa",
    saved: "An ajiye. Mun gode.",
    answered: "Ka amsa wannan a {date}. Idan kai, ɗan uwanka ko abokinka na kusa ya karɓi irin wannan muƙamin, faɗa mana a nan.",
    again: "Faɗa mana game da sabon muƙami",
    chooseOne: "Zaɓi e ko a'a.",
    whoNeeded: "Faɗi ko wane ne.",
    roleNeeded: "Faɗi wane muƙami, kuma a ina.",
    failed: "Ba a ajiye amsarka ba. Da fatan a sake gwadawa.",
    unavailable: "Ba a iya loda wannan tambayar yanzu ba. Sabunta shafin don sake gwadawa.",
    payoutFirst: "Amsa tambayar game da muƙaman gwamnati a wannan shafin kafin ka ƙara asusun karɓar kuɗi.",
    banner: "Tambaya ɗaya tana jiranka: ko kai, ɗan uwanka ko abokinka na kusa yana riƙe da babban muƙamin gwamnati. Ba za ta ɗauki lokaci ba.",
    bannerLink: "Amsa ta",
    checkFailed: "Ba mu iya duba wannan yanzu ba. Ba a ajiye komai ba; da fatan a sake gwadawa nan ba da jimawa ba.",
  },
} satisfies NonNullable<Translation["compliancePep"]>;
