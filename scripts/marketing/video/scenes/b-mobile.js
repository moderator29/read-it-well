/**
 * Section b, mobile film (rows 14 to 27, 30.58 to 62.88).
 *
 * Layers (z): the ground 0, the phones 10, bodies and cards 20, big type 30,
 * the pointer 40. One light phone carries rows 14 to 22 and 26; a dark one
 * carries row 24 (the night chapter).
 */
import { orb } from "../engine/components.js";
import { clock, mist, warm, night, bokeh, phone3d, ramp } from "./b-kit.js";
import { talk } from "./b-m-talk.js";
import { switcher } from "./b-m-switch.js";
import { stays } from "./b-m-stays.js";
import { goingOut } from "./b-m-out.js";
import { checked } from "./b-m-checked.js";

/** The section's clock: rows and the spoken words it lands on. */
export function times(ctx) {
  const { b, w, we } = clock(ctx);
  return {
    r14: b(53), r15: b(58), r16: b(61), r17: b(64), r18: b(67), r19: b(71), r20: b(74), r21: b(79), r22: b(82),
    r23: b(85), r24: b(88), r25: b(94), r26: b(100), r27: b(105), end: b(109),
    owner: w(7, "owner"), landlord: w(7, "landlord"), agent: w(7, "agent"), right: w(7, "right"), inside: w(7, "inside"), the7: w(7, "the", 4), app: w(7, "app"),
    share: w(8, "Share"), listings: w(8, "listings"), chat: w(8, "chat"), plan: w(8, "plan"), inspection: w(8, "inspection"),
    keep: w(8, "keep"), conversation: w(8, "conversation"), one: w(8, "one"), place: w(8, "place"),
    planning: w(9, "Planning"), a9: w(9, "a"), trip: w(9, "trip"),
    browse: w(10, "Browse"), hotels: w(10, "hotels"), shortlets: w(10, "shortlets"), resorts: w(10, "resorts"), pick: w(10, "pick"), dates: w(10, "dates"),
    and10: w(10, "and"), book: w(10, "book"), room: w(10, "room"), few: w(10, "few"), taps: w(10, "taps"),
    going: w(11, "Going"), out: w(11, "out"), tonight: w(11, "tonight"),
    find: w(12, "Find"), restaurant: w(12, "restaurant"), love: w(12, "love"), reserve: w(12, "reserve"), table: w(12, "table"), seconds: w(12, "seconds"),
    owners: w(13, "Owners"), hosts: w(13, "hosts"), hotels13: w(13, "hotels"), restaurants: w(13, "restaurants"), verified: w(13, "verified"), mark: w(13, "mark"),
    checked: w(13, "checked"), real: w(13, "real"), person: w(13, "person"), vallo13: w(13, "Vallo"), so: w(13, "so"), who: w(13, "who"), dealing: w(13, "dealing"), with: w(13, "with"),
    withEnd: we(13, "with"),
  };
}

export async function buildMobile(ctx) {
  const T = times(ctx);
  const S = { T };

  /* The ground: mist, then the warm wash (rows 19 to 22), then night (22 to 24), then mist again. */
  const ground = ctx.scene("b-m-ground", T.r14, T.end + 0.02, { z: 0 });
  mist(ctx, ground);
  S.warm = warm(ctx, ground);
  S.night = ctx.el("div", { class: "fill", style: { opacity: "0" } }, ground);
  night(ctx, S.night, { y: 46, glow: 0.2 });
  S.bokeh = ctx.el("div", { class: "fill" }, S.night);
  bokeh(ctx, S.bokeh, { area: { x: -80, y: -60, w: 1240, h: 2040 }, count: 18, seed: 23, t0: T.r22 });
  S.ground = ground;

  /* The warm wash: hidden until the switch (row 19) wipes it in; gone once night has come. */
  ctx.onFrame((t) => {
    const p = ramp(ctx, t, T.planning, T.planning + 0.5, "power2.inOut");
    const edge = -30 + p * 160;
    const on = t >= T.planning && t < T.r23 + 0.05;
    S.warm.style.visibility = on ? "visible" : "hidden";
    if (!on) return;
    const mask = p >= 1 ? "none" : `linear-gradient(90deg, #000 0%, #000 ${edge.toFixed(2)}%, transparent ${(edge + 30).toFixed(2)}%)`;
    S.warm.style.webkitMaskImage = mask;
    S.warm.style.maskImage = mask;
  });

  /* Night comes as the result cards lift away (row 22) and goes as the chips land (row 25). */
  ctx.tl.fromTo(S.night, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power2.inOut", immediateRender: false }, T.r23 - 0.5);
  ctx.tl.fromTo(S.night, { opacity: 1 }, { opacity: 0, duration: 0.42, ease: "power2.inOut", immediateRender: false }, T.r25 - 0.4);

  /* The phones (each waits for the ones before it to load). */
  const phones = ctx.scene("b-m-phone", T.r14, T.end + 0.02, { z: 10 });
  S.phones = phones;
  S.pL = await phone3d(ctx, { model: "island", parent: phones, env: "light", edge: "#f3f4f1" });
  S.pD = await phone3d(ctx, { model: "island", parent: phones, env: "dark", edge: "#0a1024" });
  S.pD.pose.opacity = 0;

  /* The glossy pointer, over everything but the pill. */
  const pointer = ctx.scene("b-m-pointer", T.r14, T.end + 0.02, { z: 40 });
  S.pointer = pointer;
  S.orb = orb(ctx, pointer);
  ctx.gsap.set(S.orb, { x: 1180, y: 1100, opacity: 0 });

  await talk(ctx, S, T);
  await switcher(ctx, S, T);
  await stays(ctx, S, T);
  await goingOut(ctx, S, T);
  await checked(ctx, S, T);
}
