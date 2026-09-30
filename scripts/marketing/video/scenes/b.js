/*
 * Section b: rows 14 to 27 (30.58 to 62.88), both films. STORYBOARD.md is
 * the law; b-mobile.js and b-desktop.js hold the rows, b-kit.js the pieces
 * they share. Handoffs (A -> B, B -> C) are recorded in scenes/handoffs.md.
 */
import { buildMobile } from "./b-mobile.js";
import { buildDesktop } from "./b-desktop.js";

export async function build(ctx) {
  if (ctx.isMobile) await buildMobile(ctx);
  else await buildDesktop(ctx);
}
