import type { Translation } from "../../fallback";

/* MACHINE DRAFT, 30 September 2026. Needs a native Yoruba speaker's review
   (review-status.ts). "Nọ́mbà àṣírí" is the passcode, kept apart from
   "ọ̀rọ̀ ìpamọ́", the password, as the rest of yo.ts writes it. */
export const passcodeYo = {
  welcomeBack: "Ẹ káàbọ̀ padà, {name}",
  welcomeBackNoName: "Ẹ káàbọ̀ padà",
  enterCode: "Tẹ nọ́mbà àṣírí rẹ",
  lockedTitle: "Vallo ti di títì",
  wrong: "Ìyẹn kì í ṣe nọ́mbà àṣírí rẹ.",
  wrongLeft: {
    other: "Ìyẹn kì í ṣe nọ́mbà àṣírí rẹ. Ìgbìyànjú {count} ló kù kí ìdádúró kékeré tó dé.",
  },
  wrongLastBeforeSignOut: {
    other: "Ìyẹn kì í ṣe nọ́mbà àṣírí rẹ. Àṣìṣe {count} sí i yóò mú ọ jáde.",
  },
  cooldown: "Ìgbìyànjú ti pọ̀ jù. Dúró fún ìṣẹ́jú-àáyá {seconds}.",
  paced: "Ìgbìyànjú ti pọ̀ jù láti ibí. Dúró díẹ̀ kí o tún gbìyànjú.",
  unavailable: "A kò lè ṣàyẹ̀wò nọ́mbà àṣírí rẹ báyìí. Gbìyànjú rẹ̀, tàbí lo ọ̀rọ̀ ìpamọ́ rẹ.",
  passwordOnly: "A ti tẹ nọ́mbà àṣírí rẹ ní àṣìṣe ní ọ̀pọ̀ ìgbà. Tún wọlé láti ṣètò tuntun.",
  signInAgain: "Tún wọlé",
  error: "Ìyẹn kò lọ. Ṣàyẹ̀wò ìsopọ̀ rẹ kí o tún gbìyànjú.",
  usePassword: "Lo ọ̀rọ̀ ìpamọ́ rẹ dípò",
  signOut: "Jáde",
  checking: "À ń ṣàyẹ̀wò",

  setupTitle: "Ṣẹ̀dá nọ́mbà àṣírí rẹ",
  setupBody: "Ìwọ yóò fi ṣí Vallo àti kí owó tó gbéra. Kì í ṣe ọ̀rọ̀ ìpamọ́ rẹ.",
  resetTitle: "Ṣètò nọ́mbà àṣírí tuntun",
  resetBody: "O ti tún wọlé, nítorí náà o lè yan nọ́mbà àṣírí tuntun báyìí.",
  confirmTitle: "Tún un tẹ̀",
  confirmBody: "Tẹ nọ́mbà {count} kan náà láti fi múlẹ̀.",
  currentTitle: "Tẹ nọ́mbà àṣírí rẹ lọ́wọ́lọ́wọ́",
  currentBody: "Lẹ́yìn náà yan tuntun.",
  useFour: "Lo nọ́mbà àṣírí oní-nọ́mbà 4",
  useSix: "Lo nọ́mbà àṣírí oní-nọ́mbà 6",
  trivial: "Ìyẹn rọrùn jù láti mọ̀. Yẹra fún àtúnṣe, títò bí 1234 àti ọdún ìbí rẹ.",
  mismatch: "Àwọn wọ̀nyẹn kò bára mu. Bẹ̀rẹ̀ lẹ́ẹ̀kan sí i.",
  proofRequired: "Fún ààbò rẹ, tún wọlé kí o tó yí nọ́mbà àṣírí rẹ padà.",
  saved: "A ti fi nọ́mbà àṣírí pamọ́.",
  changed: "A ti yí nọ́mbà àṣírí padà.",

  settingsRow: "Nọ́mbà àṣírí",
  settingsRowSub: "Nọ́mbà tí ó ń ṣí Vallo lórí ẹ̀rọ yìí",
  screenTitle: "Nọ́mbà àṣírí",
  lengthLabel: "Gígùn nọ́mbà àṣírí",
  lengthSix: "Nọ́mbà 6",
  lengthFour: "Nọ́mbà 4",
  change: "Yí nọ́mbà àṣírí padà",
  forgot: "Ṣé o gbàgbé nọ́mbà àṣírí rẹ? Wọlé pẹ̀lú ọ̀rọ̀ ìpamọ́ rẹ láti ṣètò tuntun.",
  notSet: "O kò tíì ṣètò nọ́mbà àṣírí.",
  lockNote: "Vallo máa ń tì lẹ́yìn ìṣẹ́jú 5 tí o bá kúrò, àti nínú gbogbo táàbù tuntun.",

  keypadLabel: "Bọ́tìnnì nọ́mbà àṣírí",
  deleteKey: "Pa rẹ́",
  digitsEntered: "A ti tẹ nọ́mbà {count} nínú {total}",
  moneyLocked: "Kọ́kọ́ ṣí Vallo pẹ̀lú nọ́mbà àṣírí rẹ. A kò gba owó kankan, a kò sì yí nǹkan kan padà.",
} satisfies NonNullable<Translation["passcode"]>;
