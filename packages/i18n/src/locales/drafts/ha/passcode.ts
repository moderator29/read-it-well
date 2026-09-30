import type { Translation } from "../../fallback";

/* MACHINE DRAFT, 30 September 2026. Needs a native Hausa speaker's review
   (review-status.ts). "Lambar sirri" is the passcode, kept apart from
   "kalmar sirri", the password, as the rest of ha.ts writes it. */
export const passcodeHa = {
  welcomeBack: "Barka da dawowa, {name}",
  welcomeBackNoName: "Barka da dawowa",
  enterCode: "Shigar da lambar sirrinka",
  lockedTitle: "Vallo a kulle yake",
  wrong: "Wannan ba lambar sirrinka ba ce.",
  wrongLeft: {
    one: "Wannan ba lambar sirrinka ba ce. Sauran gwaji 1 kafin ɗan hutu.",
    other: "Wannan ba lambar sirrinka ba ce. Sauran gwaji {count} kafin ɗan hutu.",
  },
  wrongLastBeforeSignOut: {
    one: "Wannan ba lambar sirrinka ba ce. Kuskure 1 kuma zai fitar da kai.",
    other: "Wannan ba lambar sirrinka ba ce. Kurakurai {count} kuma za su fitar da kai.",
  },
  cooldown: "Gwaji ya yi yawa. Jira daƙiƙa {seconds}.",
  paced: "Gwaji ya yi yawa daga nan. Jira kaɗan ka sake gwadawa.",
  unavailable: "Ba mu iya duba lambar sirrinka yanzu ba. Sake gwadawa, ko ka yi amfani da kalmar sirrinka.",
  passwordOnly: "An shigar da lambar sirrinka ba daidai ba sau da yawa. Sake shiga don saita sabuwa.",
  signInAgain: "Sake shiga",
  error: "Hakan bai tafi ba. Duba haɗinka ka sake gwadawa.",
  usePassword: "Yi amfani da kalmar sirrinka maimakon haka",
  signOut: "Fita",
  checking: "Ana dubawa",

  setupTitle: "Ƙirƙiri lambar sirrinka",
  setupBody: "Da ita za ka buɗe Vallo, kuma kafin kuɗi su motsa. Ba kalmar sirrinka ba ce.",
  resetTitle: "Saita sabuwar lambar sirri",
  resetBody: "Ka sake shiga, don haka za ka iya zaɓar sabuwar lambar sirri yanzu.",
  confirmTitle: "Sake shigar da ita",
  confirmBody: "Rubuta lambobi {count} iri ɗaya don tabbatarwa.",
  currentTitle: "Shigar da lambar sirrinka ta yanzu",
  currentBody: "Sannan ka zaɓi sabuwar.",
  useFour: "Yi amfani da lambar sirri mai lambobi 4",
  useSix: "Yi amfani da lambar sirri mai lambobi 6",
  trivial: "Wannan ya yi sauƙin tsammani. Guji maimaitawa, jerin lambobi kamar 1234 da shekarar haihuwarka.",
  mismatch: "Waɗannan ba su yi daidai ba. Fara daga farko.",
  proofRequired: "Don tsaronka, sake shiga kafin ka canza lambar sirrinka.",
  saved: "An adana lambar sirri.",
  changed: "An canza lambar sirri.",

  settingsRow: "Lambar sirri",
  settingsRowSub: "Lambar da ke buɗe Vallo a wannan na'urar",
  screenTitle: "Lambar sirri",
  lengthLabel: "Tsawon lambar sirri",
  lengthSix: "Lambobi 6",
  lengthFour: "Lambobi 4",
  change: "Canza lambar sirri",
  forgot: "Ka manta lambar sirrinka? Shiga da kalmar sirrinka don saita sabuwa.",
  notSet: "Ba ka saita lambar sirri ba tukuna.",
  lockNote: "Vallo yana kullewa bayan minti 5 da ka tafi, da kuma a kowane sabon shafi.",

  keypadLabel: "Maɓallan lambar sirri",
  deleteKey: "Goge",
  digitsEntered: "An shigar da lambobi {count} cikin {total}",
  moneyLocked: "Da farko ka buɗe Vallo da lambar sirrinka. Ba a caji ko canza komai ba.",
} satisfies NonNullable<Translation["passcode"]>;
