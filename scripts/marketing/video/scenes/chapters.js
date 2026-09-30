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
  { start: b(53), end: b(71), parts: [["Talk straight to the ", false], ["lister", true]] },
  { start: b(74.6), end: b(85), parts: [["Book a ", false], ["room", true]] },
  { start: b(88), end: b(94), parts: [["Reserve a ", false], ["table", true]] },
  { start: b(94.3), end: b(109), parts: [["Checked by a ", false], ["person", true]] },
  { start: b(121), end: b(126), parts: [["Straight to the ", false], ["owner", true]] },
  { start: b(129), end: b(138), parts: [["Ask ", false], ["anything", true]] },
  { start: b(141.3), end: b(148), parts: [["Speaks your ", false], ["language", true]] },
  { start: b(148), end: b(159.5), parts: [["Put it on ", false], ["Vallo", true]] },
];

/** The ground by time: "dark" (night navy) or "light" (mist), for the pill and captions. */
export const GROUND = [
  /* v3.1: one night opening, one long daylight act (the Stays and restaurant
     chapter wear a warm wash but stay light), one night act as the contrast
     beat and finale, and the white end card. */
  { start: 0, end: b(15), theme: "dark" },
  { start: b(15), end: b(138), theme: "light" },
  { start: b(138), end: b(166), theme: "dark" },
  { start: b(166), end: b(176) + 1, theme: "light" },
];

export const groundAt = (t) => (GROUND.find((g) => t >= g.start && t < g.end) ?? GROUND[0]).theme;
