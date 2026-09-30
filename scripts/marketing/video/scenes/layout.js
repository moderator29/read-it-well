/**
 * The handoff boxes from STORYBOARD.md ("Frames, safe zones, captions").
 * A carried object lands on exactly these pixels on both sides of a cut, so
 * every section uses these names, never its own numbers, for the shared boxes.
 * Phones: { cx, cy, height } in stage px (height at zero rotation).
 */
export const LAYOUT = {
  mobile: {
    PHONE_HERO: { cx: 540, cy: 760, height: 1300 },
    PHONE_HIGH: { cx: 540, cy: 640, height: 1180 },
    PILL: { cx: 540, top: 236, bottom: 316 },
    CAPTIONS: { y: 1290, top: 1230, bottom: 1360 },
    SAFE: { top: 285, bottom: 1635, left: 44, right: 940 },
    /* Frame one's three question cards, and the answered row (row 31). */
    CARDS_OPEN: [
      { x: 80, y: 330, w: 620, h: 170, r: -5 },
      { x: 380, y: 540, w: 620, h: 170, r: 4 },
      { x: 120, y: 750, w: 620, h: 170, r: -3 },
    ],
    CARD_SLOT: [
      { x: 60, y: 360, w: 300, h: 360 },
      { x: 390, y: 360, w: 300, h: 360 },
      { x: 720, y: 360, w: 300, h: 360 },
    ],
    /* The receipt of signature 1 (rows 11 to 13), clear of the pill and the captions. */
    RECEIPT: { x: 90, y: 340, w: 900, h: 860 },
    /* The Property | Stays switch at full size (row 19). */
    PILL_SWITCH: { x: 60, y: 520, w: 960, h: 360 },
  },
  desktop: {
    WINDOW_HERO: { x: 160, y: 120, width: 1600 },
    WINDOW_LEFT: { x: 80, y: 150, width: 1020 },
    RIGHT_PANEL: { x: 1160, y: 150, w: 680, h: 730 },
    PHONE_SIDE: { cx: 1460, cy: 540, height: 900 },
    PILL: { cx: 960, top: 36, bottom: 96 },
    CAPTIONS: { y: 960, top: 915, bottom: 1005 },
    CARDS_OPEN: [
      { x: 140, y: 260, w: 600, h: 160, r: -4 },
      { x: 320, y: 480, w: 600, h: 160, r: 3 },
      { x: 180, y: 700, w: 600, h: 160, r: -2 },
    ],
    CARD_SLOT: [
      { x: 150, y: 150, w: 520, h: 300 },
      { x: 700, y: 150, w: 520, h: 300 },
      { x: 1250, y: 150, w: 520, h: 300 },
    ],
    RECEIPT: { x: 560, y: 140, w: 800, h: 740 },
    PILL_SWITCH: { x: 360, y: 390, w: 1200, h: 300 },
  },
};

/** The three questions of the spine and their answers (FACTS.md). */
export const QUESTIONS = [
  { q: "What will it really cost?", a: "₦26,100,000 to move in. Seen before a single call." },
  { q: "Who am I talking to?", a: "Checked by a real person at Vallo." },
  { q: "Where does my money go?", a: "Straight to the owner, through Paystack." },
];
