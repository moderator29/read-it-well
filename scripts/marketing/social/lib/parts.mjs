/* Real components of the live screens, by name, as crop boxes in capture px
 * (mobile captures are 1320 x 2682 at 3x). Posts lift these off the phone
 * and float them around it (see fun.mjs lift). Checked on a contact sheet:
 * node scripts/marketing/social/parts-sheet.mjs */
import { lift } from "./fun.mjs";
import { screenToPost } from "./phones.mjs";

export const PARTS = {
  /* property */
  "move-in-card": { id: "listing", x: 36, y: 1480, w: 1248, h: 625 },
  "for-rent-chip": { id: "listing", x: 44, y: 752, w: 290, h: 92 },
  "cost-rent": { id: "listing-cost", x: 30, y: 648, w: 1260, h: 352 },
  "cost-agency": { id: "listing-cost", x: 30, y: 985, w: 1260, h: 280 },
  "cost-caution": { id: "listing-cost", x: 30, y: 1785, w: 1260, h: 360 },
  "home-tiles": { id: "home", x: 100, y: 1500, w: 1120, h: 330 },
  "home-hero": { id: "home", x: 100, y: 705, w: 1120, h: 750 },
  "search-chips": { id: "search", x: 36, y: 405, w: 1000, h: 150 },
  "search-card": { id: "search", x: 44, y: 1030, w: 604, h: 1200 },
  /* stays and tables */
  "dates": { id: "stays-dates", x: 36, y: 730, w: 1248, h: 262 },
  "guests": { id: "stays-dates", x: 36, y: 1020, w: 620, h: 240 },
  "show-prices": { id: "stays-dates", x: 40, y: 1290, w: 1240, h: 150 },
  "stay-price": { id: "stay", x: 90, y: 1570, w: 520, h: 100 },
  "stay-chips": { id: "stay", x: 100, y: 1405, w: 1120, h: 140 },
  "stay-amenities": { id: "stay", x: 100, y: 1700, w: 1110, h: 106 },
  "stays-hotels": { id: "stays", x: 40, y: 1424, w: 604, h: 416 },
  "stays-shortlets": { id: "stays", x: 674, y: 1424, w: 604, h: 416 },
  "stays-restaurants": { id: "stays", x: 40, y: 1872, w: 604, h: 416 },
  "opens-chip": { id: "restaurant", x: 140, y: 948, w: 376, h: 68 },
  "restaurant-chips": { id: "restaurant", x: 140, y: 1498, w: 1050, h: 156 },
  "restaurant-card": { id: "restaurants", x: 46, y: 588, w: 1232, h: 1056 },
  /* people and messages */
  "enquiry": { id: "thread", x: 36, y: 355, w: 1250, h: 220 },
  "owner-header": { id: "thread", x: 60, y: 180, w: 780, h: 172 },
  "thread-bubble": { id: "thread", x: 112, y: 2206, w: 1036, h: 246 },
  "ask-bubble": { id: "assistant-caution", x: 508, y: 400, w: 640, h: 218 },
  "answer-bubble": { id: "assistant-caution", x: 200, y: 660, w: 1036, h: 880 },
  "ask-chip": { id: "assistant-caution", x: 44, y: 2238, w: 730, h: 170 },
  /* account */
  "passcode-dots": { id: "passcode-create", x: 360, y: 1425, w: 600, h: 105 },
  "passcode-note": { id: "passcode-create", x: 150, y: 1520, w: 1020, h: 110 },
  "key-1": { id: "passcode-create", x: 212, y: 1655, w: 240, h: 240 },
  "key-5": { id: "passcode-create", x: 530, y: 1930, w: 240, h: 240 },
  "key-9": { id: "passcode-create", x: 850, y: 2200, w: 240, h: 240 },
  "lock-badge": { id: "passcode-create", x: 500, y: 840, w: 320, h: 320 },
  "verify-steps": { id: "verification", x: 36, y: 490, w: 1250, h: 190 },
  "id-card": { id: "verification", x: 48, y: 1276, w: 1230, h: 760 },
  "workspace-hotel": { id: "host-start", x: 36, y: 985, w: 1250, h: 262 },
  "workspace-shortlet": { id: "host-start", x: 36, y: 1296, w: 1250, h: 262 },
  "workspace-restaurant": { id: "host-start", x: 36, y: 1604, w: 1250, h: 262 },
  "workspace-owner": { id: "host-start", x: 36, y: 2044, w: 1250, h: 262 },
  /* welcome */
  "pill-property": { id: "welcome-1", x: 50, y: 322, w: 520, h: 160 },
  "pill-stays": { id: "welcome-1", x: 590, y: 1578, w: 680, h: 170 },
  "toggle": { id: "welcome-1", x: 384, y: 1810, w: 556, h: 126 },
  "signup-button": { id: "sign-up", x: 44, y: 1200, w: 1232, h: 178 },
  "welcome4-total": { id: "welcome-4", x: 112, y: 1368, w: 1096, h: 372 },
  "pay-on-vallo": { id: "welcome-3", x: 180, y: 1750, w: 960, h: 185 },
  "inspection-ask": { id: "welcome-3", x: 50, y: 318, w: 670, h: 250 },
  "inspection-yes": { id: "welcome-3", x: 800, y: 925, w: 470, h: 118 },
  "vallo-record": { id: "welcome-2", x: 60, y: 1540, w: 740, h: 195 },
};

/** Lift a named part (see PARTS) as a floating body. */
export function part(name, opts) {
  const p = PARTS[name];
  if (!p) throw new Error(`unknown part '${name}'`);
  return lift(p.id, { x: p.x, y: p.y, w: p.w, h: p.h }, opts);
}

/**
 * Lift a named part straight off its own place on a phone's screen: the flat
 * card covers the component where the phone shows it, a touch bigger and
 * nearer the camera. `grow` scales it, dx / dy nudge it (post px).
 */
export function partOff(name, layer, { grow = 1.12, dx = 0, dy = -14, rot: extra = 0, ...opts } = {}) {
  const p = PARTS[name];
  if (!p) throw new Error(`unknown part '${name}'`);
  const tl = screenToPost(layer, p.x, p.y);
  const tr = screenToPost(layer, p.x + p.w, p.y);
  const br = screenToPost(layer, p.x + p.w, p.y + p.h);
  const bl = screenToPost(layer, p.x, p.y + p.h);
  const cx = (tl.x + tr.x + br.x + bl.x) / 4 + dx;
  const cy = (tl.y + tr.y + br.y + bl.y) / 4 + dy;
  const top = Math.hypot(tr.x - tl.x, tr.y - tl.y);
  const bot = Math.hypot(br.x - bl.x, br.y - bl.y);
  const w = Math.round(Math.max(top, bot) * grow);
  const h = (w * p.h) / p.w;
  const rot = (Math.atan2(tr.y - tl.y + (br.y - bl.y), tr.x - tl.x + (br.x - bl.x)) * 180) / Math.PI + extra;
  return lift(p.id, { x: p.x, y: p.y, w: p.w, h: p.h }, { ...opts, x: cx - w / 2, y: cy - h / 2, w, rot });
}
