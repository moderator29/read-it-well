/** The referral film's chapter pill and ground, from its own clock (films/referral/timeline.json). */
const T = await fetch("/video/films/referral/timeline.json", { cache: "no-store" }).then((r) => r.json());
const s = (i) => T.sentences.find((x) => x.i === i).start;
const e = (i) => T.sentences.find((x) => x.i === i).end;

export const CHAPTERS = [
  { start: s(2) - 0.1, end: s(3) - 0.1, parts: [["Share your ", false], ["link", true]] },
  { start: s(3) - 0.1, end: s(4) - 0.1, parts: [["Eighty naira ", false], ["a friend", true]] },
  { start: s(4) - 0.1, end: s(5) - 0.1, parts: [["A real ", false], ["person", true]] },
  { start: s(5) - 0.1, end: s(6) - 0.1, parts: [["Watch it ", false], ["climb", true]] },
  { start: s(6) - 0.1, end: s(7) - 0.1, parts: [["Withdraw at ", false], ["₦1,000", true]] },
  { start: s(7) - 0.1, end: e(7) + 0.4, parts: [["No limit, ", false], ["no catch", true]] },
];

export const groundAt = () => "dark";
