/**
 * SECTION C: rows 28 to 42 (62.88 to 101.54), both films. See STORYBOARD.md.
 *
 *   c-pay.js     28-31  paying: the passcode, Signature 3 (the money path), the answered cards
 *   c-assist.js  32-34  the assistant: the "?" into the caret, the real answer, day to night
 *   c-lang.js    35-36  the pill wall, the welcome screen in four languages
 *   c-host.js    37     "Add a workspace": the rows lift; the house icon falls
 *   c-map.js     38-39  Signature 4: the Nigeria model (map3d.js)
 *   c-close.js   40-42  the mark, "Real estate, done right.", the end card and the badges
 *   c-kit.js     the shared pieces (times, motion tracks, coin, chips, phones)
 */
import { LAYOUT } from "./layout.js";
import { times, languageFonts, phone3d } from "./c-kit.js";
import { buildPay } from "./c-pay.js";
import { buildAssist } from "./c-assist.js";

export async function build(ctx) {
  const K = times(ctx);
  const S = { K, L: LAYOUT[ctx.film] };
  await languageFonts(ctx);

  if (ctx.isMobile) {
    /* One light-studio island phone carries rows 28, 32-34 and the end card:
       its pose is a list of segments that each row adds to. */
    const root = ctx.scene("c-phone-light", K.r28 - 0.05, K.end + 0.1, { z: 4 });
    S.light = await phone3d(ctx, { model: "island", parent: root, env: "light", edge: "#ececfc" }, { fallback: { rx: 0, ry: 0, rz: 0, fov: 24 } });
  }

  window.__cS = S;
  await buildPay(ctx, S);
  await buildAssist(ctx, S);
}
