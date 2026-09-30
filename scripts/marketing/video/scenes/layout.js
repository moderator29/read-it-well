/**
 * The handoff boxes from STORYBOARD.md ("Frames, safe zones, captions").
 * A carried object lands on exactly these pixels on both sides of a cut, so
 * every section uses these names, never its own numbers, for the shared boxes.
 * Phones: { cx, cy, height } in stage px (height at zero rotation).
 */
export const LAYOUT = {
  mobile: {
    PHONE_HERO: { cx: 540, cy: 820, height: 1400 },
    PHONE_LOW: { cx: 540, cy: 1180, height: 1180 },
    CAPTIONS: { y: 1290, top: 1230, bottom: 1360 },
    SAFE: { top: 285, bottom: 1635, left: 44, right: 940 },
    /* The three question cards: frame one, and the answered row (row 31). */
    CARDS_OPEN: [
      { x: 70, y: 360, w: 630, h: 190, r: -5 },
      { x: 330, y: 640, w: 680, h: 190, r: 4 },
      { x: 110, y: 920, w: 680, h: 190, r: -3 },
    ],
    CARD_SLOT: [
      { x: 60, y: 700, w: 300, h: 360 },
      { x: 390, y: 700, w: 300, h: 360 },
      { x: 720, y: 700, w: 300, h: 360 },
    ],
    /* The receipt of signature 1 (rows 11 to 13). */
    RECEIPT: { x: 90, y: 200, w: 900, h: 980 },
    /* The Property | Stays pill at full size (row 19). */
    PILL: { x: 60, y: 700, w: 960, h: 400 },
  },
  desktop: {
    WINDOW_HERO: { x: 320, y: 64, width: 1280 },
    WINDOW_LEFT: { x: 80, y: 150, width: 1020 },
    RIGHT_PANEL: { x: 1160, y: 150, w: 680, h: 677 },
    PHONE_SIDE: { cx: 1480, cy: 520, height: 860 },
    CAPTIONS: { y: 960, top: 915, bottom: 1005 },
    CARDS_OPEN: [
      { x: 120, y: 250, w: 640, h: 170, r: -4 },
      { x: 300, y: 470, w: 640, h: 170, r: 3 },
      { x: 160, y: 690, w: 640, h: 170, r: -2 },
    ],
    CARD_SLOT: [
      { x: 150, y: 330, w: 520, h: 300 },
      { x: 700, y: 330, w: 520, h: 300 },
      { x: 1250, y: 330, w: 520, h: 300 },
    ],
    RECEIPT: { x: 1160, y: 150, w: 680, h: 760 },
    PILL: { x: 360, y: 390, w: 1200, h: 300 },
  },
};

/** The three questions of the spine and their answers (FACTS.md). */
export const QUESTIONS = [
  { q: "What will it really cost?", a: "₦26,100,000 to move in. Seen before a single call." },
  { q: "Who am I talking to?", a: "Checked by a real person at Vallo." },
  { q: "Where does my money go?", a: "Straight to the owner, through Paystack." },
];
