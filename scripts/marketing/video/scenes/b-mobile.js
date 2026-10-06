/**
 * Section b, mobile film (rows 14 to 27, 30.58 to 62.88), storyboard v3.2.
 *
 * Layers (z): the ground 0, the phone 10, bodies and cards 20, big type 30,
 * the pointer 40. One light phone, always h 1400 (PHONE_HERO or PHONE_HIGH,
 * pushes go beyond and return), carries every row on the mist; rows 19 to
 * 24 add a 14% warm light at the top of the frame.
 */
import { orb } from "../engine/components.js";
import { clock, mist, phone3d, ramp, WARM_TOP } from "./b-kit.js";
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
    keep: w(8, "keep"), conversation: w(8, "conversation"), one: w(8, "one"), place: w(8, "place"), placeEnd: we(8, "place"),
    planning: w(9, "Planning"), a9: w(9, "a"), trip: w(9, "trip"),
    browse: w(10, "Browse"), hotels: w(10, "hotels"), shortlets: w(10, "shortlets"), resorts: w(10, "resorts"), pick: w(10, "pick"), dates: w(10, "dates"),
    and10: w(10, "and", 2), book: w(10, "book"), room: w(10, "room"), few: w(10, "few"), taps: w(10, "taps"),
    going: w(11, "Going"), out: w(11, "out"), tonight: w(11, "tonight"),
    find: w(12, "Find"), restaurant: w(12, "restaurant"), love: w(12, "love"), reserve: w(12, "reserve"), table: w(12, "table"), seconds: w(12, "seconds"),
    owners: w(13, "Owners"), hosts: w(13, "hosts"), hotels13: w(13, "hotels"), restaurants: w(13, "restaurants"), verified: w(13, "verified"), mark: w(13, "mark"),
    checked: w(13, "checked"), real: w(13, "real"), person: w(13, "person"), vallo13: w(13, "Vallo"), so: w(13, "so"), who: w(13, "who"), dealing: w(13, "dealing"), with: w(13, "with", 2),
    withEnd: we(13, "with", 2),
  };
}

export async function buildMobile(ctx) {
  const T = times(ctx);
  const S = { T };

  /* ---------- the ground: mist throughout; rows 19 to 24 add a 14% warm light at the top (v3.2) ---------- */
  const ground = ctx.scene("b-m-ground", T.r14, T.end, { z: 0 });
  mist(ctx, ground);
  S.warm = ctx.el("div", { class: "fill", style: { background: WARM_TOP, opacity: "0", visibility: "hidden" } }, ground);
  /* It comes up with the FLIP press (row 19) and goes as row 25 opens. */
  ctx.onFrame((t) => {
    const a = ramp(ctx, t, T.planning, T.planning + 0.6, "power2.inOut") * (1 - ramp(ctx, t, T.r25 - 0.34, T.r25 + 0.06, "power2.inOut"));
    S.warm.style.visibility = a > 0.001 ? "inherit" : "hidden";
    S.warm.style.opacity = a.toFixed(3);
  });
  S.ground = ground;

  /* ---------- the phone ---------- */
  const phones = ctx.scene("b-m-phone", T.r14, T.end, { z: 10 });
  S.phones = phones;
  S.pL = await phone3d(ctx, { model: "island", parent: phones, env: "light", edge: "#f3f4f1" });

  /* ---------- the glossy pointer ---------- */
  const pointer = ctx.scene("b-m-pointer", T.r14, T.end, { z: 40 });
  S.pointer = pointer;
  S.orb = orb(ctx, pointer);

  /* Captions are off where the same words are big on screen. */
  /* Each gap covers exactly the caption lines (they open 0.12 s before their first word). */
  ctx.hideCaptions(T.r14 - 0.14, T.right - 0.12);   // "Talk straight to the owner, / the landlord or the agent,"
  ctx.hideCaptions(40.4, 41.2);                        // round 5: off the drawer's "Switch to Stays" ("one place." is short and plain)
  ctx.hideCaptions(T.planning - 0.14, T.browse - 0.12); // row 19 is "off": "Planning a trip?" ("one place." has faded by 41.12)
  ctx.hideCaptions(T.going - 0.14, T.find - 0.12);  // row 23 is "off": "Going out tonight?"
  ctx.hideCaptions(T.owners - 0.14, T.mark - 0.12); // the role chips: "Owners, hosts, hotels and / restaurants with the verified"

  await talk(ctx, S, T);
  await switcher(ctx, S, T);
  await stays(ctx, S, T);
  await goingOut(ctx, S, T);
  await checked(ctx, S, T);
}
