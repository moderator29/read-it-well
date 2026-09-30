/**
 * Desktop rows 23 and 24 (49.04 to 54.23), storyboard v3.2, on the mist.
 *   D23  "Going out" in navy over "tonight?" filled with a warm restaurant
 *        photo (1.3x at most, its edges feathered), centred on the frame's
 *        axis in the electric ring, clear of the pill and the captions;
 *        from 50.19 the camera pushes through the "o" of "tonight?".
 *   D24  d-restaurant-lt rises at WINDOW_LEFT, its notice readable; on
 *        "reserve" the Table for 2 card arrives in RIGHT_PANEL with its
 *        Example chip; it holds to 53.86 and flies off (it never becomes a
 *        role chip); the window turns away as the chapter ends.
 */
import { NAVY, INK2, ramp, mix, showDuring, glassCard, iconPlate, exampleChip } from "./b-kit.js";
import { goingTitle } from "./b-m-out.js";
import { CW, CH } from "./b-desktop.js";

export async function deskOut(ctx, S, T) {
  const { L } = S;
  const RP = L.RIGHT_PANEL;

  /* ==================== D23 ==================== */
  const layer = ctx.scene("b-d-going", T.r23 - 0.05, T.r24 + 0.3, { z: 30 });
  ctx.sfx("whoosh_short", T.r23, { offset: -2 });
  goingTitle(ctx, layer, T, { id: "b-d-going", CX: 960, CY: 480, R: 360, maxSize: 170, feather: { x: 60, y: 240 }, tPush: ctx.beat(87) });

  /* ==================== D24 ==================== */
  const wvT = S.wvT;
  const LEFT = S.LEFT;
  const full = { viewTop: 0, viewH: CH, viewLeft: 0, viewW: CW };
  S.page("d-restaurant-lt", [[T.r24 - 0.32, T.r25]]);
  wvT.to(T.r24 - 0.13, 0.001, { cx: LEFT.cx, cy: LEFT.cy + 760, s: LEFT.s, ry: 0, opacity: 1, ...full }, "none");
  wvT.to(T.r24 - 0.12, 0.6, { cy: LEFT.cy }, "glide");                                   // rises through the "o"
  const tOff = ctx.beat(93.36);   // 53.86: the card holds, labelled, from its arrival to here
  const tTurn = ctx.beat(93.43);  // 53.90
  wvT.to(T.r24 + 0.5, tTurn - T.r24 - 0.5, { cy: LEFT.cy - 10 }, "drift");              // a slow drift while the card holds
  wvT.to(tTurn, 0.33, { cx: LEFT.cx - 240, ry: -48, opacity: 0 }, "power2.in");         // turns away as the chapter ends

  /* the Table for 2 card: free-standing, in RIGHT_PANEL */
  const TW = 520;
  const card = glassCard(ctx, S.cards, { w: TW, radius: 32, shadow: "l", style: { display: "flex", flexDirection: "column", gap: "16px", padding: "32px 34px 30px", visibility: "hidden" } });
  const top = ctx.el("div", { style: { display: "flex", alignItems: "center", gap: "18px" } }, card);
  iconPlate(ctx, top, "utensils", { size: 72 });
  ctx.el("div", { text: "Table for 2", style: { font: "600 44px/1.05 Poppins, Inter, sans-serif", letterSpacing: "-0.025em", color: NAVY, whiteSpace: "nowrap" } }, top);
  ctx.el("div", { html: "Tonight, 8:00 PM<br>Harbour Lights Kitchen", style: { font: "500 28px/1.36 Inter, sans-serif", color: INK2, whiteSpace: "nowrap" } }, card);
  exampleChip(ctx, ctx.el("div", {}, card), { size: 22 }); // labelled from its arrival
  const tIn = T.reserve;
  ctx.sfx("pop", tIn);
  showDuring(ctx, card, [[tIn, tOff + 0.4]]);
  const X = RP.x + (RP.w - TW) / 2;
  const Y = 340;
  ctx.onFrame((t) => {
    if (t < tIn || t > tOff + 0.4) return;
    const k = ramp(ctx, t, tIn, tIn + 0.5, "back.out(1.5)");
    const off = ramp(ctx, t, tOff, tOff + 0.34, "power3.in");
    const bob = Math.sin((t - tIn) * 2.1) * 3 * ramp(ctx, t, tIn + 0.5, tIn + 0.9);
    const x = mix(ctx.W + 40, X, k) + off * 760;
    const y = Y + bob - off * 560;
    card.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${(mix(6, 0, k) + off * 18).toFixed(2)}deg)`;
    card.style.opacity = String((1 - off * 0.3).toFixed(3));
  });
}
