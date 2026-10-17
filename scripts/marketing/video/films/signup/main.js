/*
 * THE SIGN-UP FILM, "Getting on Vallo takes about a minute" (50.7 s).
 * SKELETON: the opening frame, the opening line and the ending are in place.
 * The body (sentences 2 to 7) is built on top of this.
 */
import { anchors, ground, headline, ending, openerClock } from "../kit.js";

export async function build(ctx) {
  const M = ctx.isMobile;
  const { s, e, w } = anchors(ctx);
  void w;

  /* ---------- the opening frame (composed and still at t = 0) ---------- */
  ground(ctx, 0, s(2) + 0.1, { tone: "navy", y: 26, seed: 11 });
  const open = ctx.scene("open", 0, s(2) + 0.1, { z: 760 });
  openerClock(ctx, open, { t1: s(1) - 0.15 });
  headline(ctx, open, {
    lines: [[["Getting on Vallo", false]], [["takes about ", false], ["a minute.", true]]],
    x: M ? 60 : 160, y: M ? 430 : 230, size: M ? 100 : 104, t0: s(1) - 0.05, t1: s(2) - 0.5, stagger: 0, keyStyle: "chip",
  });
  ctx.hideCaptions(s(1) - 0.2, s(2) - 0.3);

  /* ---------- the ending ---------- */
  ending(ctx, { t0: s(9) - 0.5, tLine: s(9) + 0.15, tBadges: s(9) + 1.0, tUrl: s(9) + 1.5, t1: e(9) + 1.4 });
}
