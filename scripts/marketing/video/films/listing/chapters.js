/** The listing film's chapter pill and ground, from its own clock (films/listing/timeline.json). */
const T = await fetch("/video/films/listing/timeline.json", { cache: "no-store" }).then((r) => r.json());
const s = (i) => T.sentences.find((x) => x.i === i).start;
const e = (i) => T.sentences.find((x) => x.i === i).end;

export const CHAPTERS = [
  { start: s(2) - 0.1, end: s(3) - 0.1, parts: [["No agency ", false], ["fee", true]] },
  { start: s(3) - 0.1, end: s(4) - 0.1, parts: [["Put it ", false], ["up", true]] },
  { start: s(4) - 0.1, end: s(5) - 0.1, parts: [["The whole cost, ", false], ["shown", true]] },
  { start: s(5) - 0.1, end: s(6) - 0.1, parts: [["Inspect, then ", false], ["agree", true]] },
  { start: s(6) - 0.1, end: s(7) - 0.1, parts: [["Paid to your ", false], ["bank", true]] },
  { start: s(7) - 0.1, end: e(8) + 0.4, parts: [["Vallo never ", false], ["holds it", true]] },
];

export const groundAt = () => "dark";
