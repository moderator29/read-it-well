/**
 * Desktop rows 23 and 24 (49.04 to 54.23), storyboard v3.2, on the mist.
 *   D23  "Going out" in navy over "tonight?" in electric (round 5), centred
 *        on the frame's axis in the electric ring; it holds 1.25 s, then
 *        lifts and fades as the window rises.
 *   D24  d-restaurant-lt rises at 0.85 of the frame (x 60-1240), its notice
 *        readable; on "reserve" the Table for 2 card arrives on the mist at
 *        the right (x 1300-1760), off the page, with its Example chip; it
 *        holds and flies off by 53.90; the window turns away.
 */
import { NAVY, INK2, ramp, mix, showDuring, glassCard, iconPlate, exampleChip } from "./b-kit.js";
import { goingTitle } from "./b-m-out.js";
import { CW, CH } from "./b-desktop.js";

export async function deskOut(ctx, S, T) {

  /* ==================== D23 ==================== */
  const layer = ctx.scene("b-d-going", T.r23 - 0.05, T.r24 + 0.3, { z: 30 });
  ctx.sfx("whoosh_short", T.r23, { offset: -2 });
  goingTitle(ctx, layer, T, { id: "b-d-going", CX: 960, CY: 480, R: 360, maxSize: 170, feather: { x: 60, y: 240 }, tPush: 50.6 });

  /* ==================== D24 ==================== */
  const wvT = S.wvT;
  const LEFT = S.WIN85; // round 5: x 60-1240 (the notice ends above y 900), "Table for 2" on the mist at its right
  const full = { viewTop: 0, viewH: CH, viewLeft: 0, viewW: CW };
  const tRise = 50.55;             // rises under the title's fade (50.60-50.75)
  S.page("d-restaurant-lt", [[tRise - 0.02, T.r25]]);
  wvT.to(tRise - 0.01, 0.001, { cx: LEFT.cx, cy: LEFT.cy + 760, s: LEFT.s, ry: 0, opacity: 1, ...full }, "none");
  wvT.to(tRise, 0.6, { cy: LEFT.cy }, "glide");                                          // rises as the title goes
  const tOff = ctx.beat(93.36);   // 53.86: the card holds, labelled, from its arrival to here
  const tTurn = ctx.beat(93.43);  // 53.90
  wvT.to(tRise + 0.62, tTurn - tRise - 0.62, { cy: LEFT.cy - 10 }, "drift");              // a slow drift while the card holds
  wvT.to(tTurn, 0.33, { cx: LEFT.cx - 240, ry: -48, opacity: 0 }, "power2.in");         // turns away as the chapter ends

  /* the Table for 2 card: free-standing, on the mist right of the window */
  const TW = 460;
  const card = glassCard(ctx, S.cards, { w: TW, radius: 32, shadow: "l", style: { display: "flex", flexDirection: "column", gap: "16px", padding: "26px 28px 24px", visibility: "hidden" } });
  const top = ctx.el("div", { style: { display: "flex", alignItems: "center", gap: "18px" } }, card);
  iconPlate(ctx, top, "utensils", { size: 64 });
  ctx.el("div", { text: "Table for 2", style: { font: "600 40px/1.05 Poppins, Inter, sans-serif", letterSpacing: "-0.025em", color: NAVY, whiteSpace: "nowrap" } }, top);
  ctx.el("div", { html: "Tonight, 8:00 PM<br>Harbour Lights Kitchen", style: { font: "500 28px/1.36 Inter, sans-serif", color: INK2, whiteSpace: "nowrap" } }, card);
  exampleChip(ctx, ctx.el("div", {}, card), { size: 22 }); // labelled from its arrival
  const tIn = T.reserve;
  ctx.sfx("pop", tIn);
  showDuring(ctx, card, [[tIn, tOff + 0.04]]);
  const X = 1300;                // on the mist, x 1300-1760, y 160-380: off the restaurant page
  const Y = 160;
  ctx.onFrame((t) => {
    if (t < tIn || t > tOff + 0.05) return;
    const k = ramp(ctx, t, tIn, tIn + 0.5, "back.out(1.5)");
    const off = ramp(ctx, t, tOff - 0.3, tOff + 0.04, "power3.in"); // round 4: out of frame by 53.90, no sliver
    const bob = Math.sin((t - tIn) * 2.1) * 3 * ramp(ctx, t, tIn + 0.5, tIn + 0.9);
    const x = mix(ctx.W + 40, X, k) + off * 1000;
    const y = Y + bob - off * 760;
    card.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${(mix(6, 0, k) + off * 18).toFixed(2)}deg)`;
    card.style.opacity = String((1 - off * 0.3).toFixed(3));
  });
}
