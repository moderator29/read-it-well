/**
 * The chapter pills and the ground's light or dark, from STORYBOARD.md
 * ("The look"). Times are beats on the one clock; a chapter's pill appears
 * once its opening big words have shrunk into the PILL box (layout.js).
 */
const B = 60 / 104;
const b = (k) => k * B;

export const CHAPTERS = [
  { start: b(28.1), end: b(36), parts: [["Find a ", false], ["home", true]] },
  { start: b(36), end: b(53), parts: [["The full cost, ", false], ["up front", true]] },
  { start: b(58), end: b(71), parts: [["Talk to the ", false], ["owner", true]] },
  { start: b(74), end: b(85), parts: [["Book a ", false], ["room", true]] },
  { start: b(88), end: b(94), parts: [["Reserve a ", false], ["table", true]] },
  { start: b(94.3), end: b(109), parts: [["Checked by a ", false], ["person", true]] },
  { start: b(115), end: b(126), parts: [["Straight to the ", false], ["owner", true]] },
  { start: b(129), end: b(138), parts: [["Ask ", false], ["anything", true]] },
  { start: b(140.4), end: b(148), parts: [["Speaks your ", false], ["language", true]] },
  { start: b(148), end: b(159.5), parts: [["Put it on ", false], ["Vallo", true]] },
];

/** The ground by time: "dark" (night navy) or "light" (mist), for the pill and captions. */
export const GROUND = [
  { start: 0, end: b(15), theme: "dark" },
  { start: b(15), end: b(85), theme: "light" },
  { start: b(85), end: b(94), theme: "dark" },
  { start: b(94), end: b(134), theme: "light" },
  { start: b(134), end: b(166), theme: "dark" },
  { start: b(166), end: b(176) + 1, theme: "light" },
];

export const groundAt = (t) => (GROUND.find((g) => t >= g.start && t < g.end) ?? GROUND[0]).theme;
