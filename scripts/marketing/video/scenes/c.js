/**
 * SECTION C: rows 28 to 42 (62.88 to 101.54), both films. STORYBOARD v3.1.
 *
 *   c-pay.js     28-31  paying: the lock, Signature 3 (the money path), the answered cards
 *   c-assist.js  32-34  the assistant: the "?" into the caret, the real answer, night falls
 *   c-lang.js    35-36  the pill wall, the welcome screen in four languages
 *   c-host.js    37     "Add a workspace": the rows light and lift, one at a time
 *   c-map.js     38-39  Signature 4: the Nigeria model (map3d.js)
 *   c-close.js   40-42  the mark, "Real estate, done right.", the end card and the badges
 *   c-kit.js     the shared pieces (times, motion tracks, coin, chips, phones, fonts)
 */
import { LAYOUT } from "./layout.js";
import { times, languageFonts, phone3d } from "./c-kit.js";
import { buildPay } from "./c-pay.js";
import { buildAssist } from "./c-assist.js";
import { buildLang } from "./c-lang.js";
import { buildHost } from "./c-host.js";
import { buildMap } from "./c-map.js";
import { buildClose } from "./c-close.js";

export async function build(ctx) {
  const K = times(ctx);
  const S = { K, L: LAYOUT[ctx.film] };
  await languageFonts(ctx);
  const rest = { rx: 0, ry: 0, rz: 0, fov: 24 };

  if (ctx.isMobile) {
    /* The light-studio island carries rows 28, 32-34 and the end card; its
       pose is a list of segments the rows add to. The dark-studio island
       carries rows 35-37 on night; the Android joins the island on the end card. */
    const light = ctx.scene("c-phone-light", K.r28 - 0.05, K.end + 0.1, { z: 4 });
    S.light = await phone3d(ctx, { model: "island", parent: light, env: "light", edge: "#042267" }, { fallback: rest });
    const dark = ctx.scene("c-phone-dark", K.r35 + 1.0, K.r38 + 0.02, { z: 5 });
    S.dark = await phone3d(ctx, { model: "island", parent: dark, env: "dark", edge: "#00112b" }, { fallback: rest });
    const android = ctx.scene("c-phone-android", K.r41 - 0.05, K.end + 0.1, { z: 3 });
    S.android = await phone3d(ctx, { model: "android", parent: android, env: "light", edge: "#ececfc" }, { fallback: rest });
    /* the light phone's display edge follows its screen: the lock (dark),
       the assistant (light grey), the end card's home (light) */
    ctx.onFrame((t) => {
      const edge = t < K.r29 + 0.1 ? "#042267" : t < K.r38 ? "#f3f4f1" : "#ececfc";
      if (S.light.frame.style.background !== edge) {
        S.light.frame.style.background = edge;
        S.light.screen.style.background = edge;
      }
    });
  } else {
    const desk = ctx.scene("c-phone-desk", K.r41 - 0.05, K.end + 0.1, { z: 4 });
    S.deskPhone = await phone3d(ctx, { model: "island", parent: desk, env: "light", edge: "#ececfc" }, { fallback: rest });
  }

  await buildPay(ctx, S);
  await buildAssist(ctx, S);
  await buildLang(ctx, S);
  await buildHost(ctx, S);
  await buildMap(ctx, S);
  await buildClose(ctx, S);
}
