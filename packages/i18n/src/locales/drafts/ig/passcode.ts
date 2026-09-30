import type { Translation } from "../../fallback";

/* MACHINE DRAFT, 30 September 2026. Needs a native Igbo speaker's review
   (review-status.ts). "Nọmba nzuzo" is the passcode, kept apart from
   "okwuntughe", the password, as the rest of ig.ts writes it. */
export const passcodeIg = {
  welcomeBack: "Nnọọ ọzọ, {name}",
  welcomeBackNoName: "Nnọọ ọzọ",
  enterCode: "Tinye nọmba nzuzo gị",
  lockedTitle: "Vallo akpọchiri akpọchi",
  wrong: "Nke ahụ abụghị nọmba nzuzo gị.",
  wrongLeft: {
    other: "Nke ahụ abụghị nọmba nzuzo gị. Ị fọdụrụ ịnwale {count} tupu obere ezumike.",
  },
  wrongLastBeforeSignOut: {
    other: "Nke ahụ abụghị nọmba nzuzo gị. Njehie {count} ọzọ ga-emepụ gị.",
  },
  cooldown: "Ịnwale karịrị akarị. Chere sekọnd {seconds}.",
  paced: "Ịnwale karịrị akarị site ebe a. Chere ntakịrị ma nwaa ọzọ.",
  unavailable: "Anyị enweghị ike ịlele nọmba nzuzo gị ugbu a. Nwaa ya, ma ọ bụ jiri okwuntughe gị.",
  passwordOnly: "E tinyela nọmba nzuzo gị n'ụzọ na-ezighị ezi ọtụtụ ugboro. Banye ọzọ ka ị tọọ nke ọhụrụ.",
  signInAgain: "Banye ọzọ",
  error: "Nke ahụ agaghị. Lelee njikọ gị ma nwaa ọzọ.",
  usePassword: "Jiri okwuntughe gị kama",
  signOut: "Pụọ",
  checking: "Na-enyocha",

  setupTitle: "Mepụta nọmba nzuzo gị",
  setupBody: "Ị ga-eji ya emeghe Vallo, na tupu ego agagharịa. Ọ bụghị okwuntughe gị.",
  resetTitle: "Tọọ nọmba nzuzo ọhụrụ",
  resetBody: "Ị banyere ọzọ, ya mere ị nwere ike ịhọrọ nọmba nzuzo ọhụrụ ugbu a.",
  confirmTitle: "Tinye ya ọzọ",
  confirmBody: "Pịa otu nọmba {count} ahụ iji kwado.",
  currentTitle: "Tinye nọmba nzuzo gị ugbu a",
  currentBody: "Wee họrọ nke ọhụrụ.",
  useFour: "Jiri nọmba nzuzo nwere ọnụọgụ 4",
  useSix: "Jiri nọmba nzuzo nwere ọnụọgụ 6",
  trivial: "Nke ahụ dị mfe ịkọ. Zere ịmeghachi, usoro dịka 1234 na afọ ọmụmụ gị.",
  mismatch: "Ndị ahụ adabaghị. Malite ọzọ.",
  proofRequired: "Maka nchekwa gị, banye ọzọ tupu ịgbanwe nọmba nzuzo gị.",
  saved: "Echekwala nọmba nzuzo.",
  changed: "Agbanwela nọmba nzuzo.",

  settingsRow: "Nọmba nzuzo",
  settingsRowSub: "Nọmba na-emeghe Vallo na ngwaọrụ a",
  screenTitle: "Nọmba nzuzo",
  lengthLabel: "Ogologo nọmba nzuzo",
  lengthSix: "Ọnụọgụ 6",
  lengthFour: "Ọnụọgụ 4",
  change: "Gbanwee nọmba nzuzo",
  forgot: "Ichefuru nọmba nzuzo gị? Banye site na okwuntughe gị ka ị tọọ nke ọhụrụ.",
  notSet: "Ị tọbeghị nọmba nzuzo.",
  lockNote: "Vallo na-akpọchi mgbe nkeji 5 gachara ị pụọ, na n'ime taabụ ọhụrụ ọ bụla.",

  keypadLabel: "Bọtịnụ nọmba nzuzo",
  deleteKey: "Hichapụ",
  digitsEntered: "Etinyela ọnụọgụ {count} n'ime {total}",
  moneyLocked: "Buru ụzọ meghee Vallo site na nọmba nzuzo gị. Ọ dịghị ihe a kwụrụ ụgwọ ma ọ bụ gbanwee.",
} satisfies NonNullable<Translation["passcode"]>;
