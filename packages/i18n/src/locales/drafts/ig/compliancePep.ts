import type { Translation } from "../../fallback";

/* MACHINE DRAFT, 30 September 2026. Needs a native Igbo speaker's review
   (review-status.ts). Only `question`, the part a lister reads; the staff
   lane stays English by decision (STAFF_ENGLISH). */
export const compliancePepIg = {
  question: {
    title: "Ajụjụ anyị na-ajụ onye ọ bụla na-edepụta",
    body: "Iwu Naịjirịa megidere ịsa ego na-ajụ onye ọ bụla na-edepụta ma ya onwe ya, onye ezinụlọ ya ma ọ bụ enyi ya nke ọma ji ma ọ bụ jirila ọkwa ọha dị elu: dịka ọmụmaatụ minista, kọmishọna, gọvanọ, onye omebe iwu, onye ọka ikpe ukwu, onye isi ndị agha ma ọ bụ ndị uwe ojii, onye ọrụ otu ndọrọ ndọrọ ọchịchị, ma ọ bụ onye isi ụlọ ọrụ gọọmentị.",
    legend: "Nke a ọ kọwara gị, onye ezinụlọ gị ma ọ bụ enyi gị nke ọma?",
    yes: "Ee",
    no: "Mba",
    who: "Ọ bụ onye?",
    self: "Mụ onwe m",
    family: "Onye ezinụlọ",
    associate: "Enyi nke ọma",
    role: "Kedu ọkwa, na ebee",
    rolePlaceholder: "Dịka ọmụmaatụ, Kọmishọna Ọrụ, Steeti Ogun, 2019 ruo 2023",
    save: "Chekwaa azịza m",
    saving: "Na-echekwa",
    saved: "Echekwala ya. Daalụ.",
    answered: "Ị zara nke a na {date}. Ọ bụrụ na gị, onye ezinụlọ gị ma ọ bụ enyi gị nke ọma nara ọkwa dị otu a, gwa anyị ebe a.",
    again: "Gwa anyị gbasara ọkwa ọhụrụ",
    chooseOne: "Họrọ ee ma ọ bụ mba.",
    whoNeeded: "Kwuo onye ọ bụ.",
    roleNeeded: "Kwuo kedu ọkwa, na ebee.",
    failed: "Echekwaghị azịza gị. Biko nwaa ọzọ.",
    unavailable: "Enweghị ike ibugo ajụjụ a ugbu a. Megharịa ibe ahụ ka ị nwaa ọzọ.",
    payoutFirst: "Zaa ajụjụ gbasara ọkwa ọha na ibe a tupu ị tinye akaụntụ nnata ego.",
    banner: "Otu ajụjụ na-eche gị: ma gị, onye ezinụlọ gị ma ọ bụ enyi gị nke ọma ji ọkwa ọha dị elu. Ọ gaghị ewe oge.",
    bannerLink: "Zaa ya",
    checkFailed: "Anyị enweghị ike ịlele nke ahụ ugbu a. Echekwaghị ihe ọ bụla; biko nwaa ọzọ n'oge na-adịghị anya.",
  },
} satisfies NonNullable<Translation["compliancePep"]>;
