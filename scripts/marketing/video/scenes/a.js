/**
 * Section a: rows 01-13 (0.00-30.58), both films. STORYBOARD.md is the law;
 * scenes/handoffs.md records the boxes this section hands to section b.
 *
 *   mobile:  a-m-open.js (01-04)  a-m-product.js (05-10)  a-m-receipt.js (11-13)
 *   desktop: a-d-open.js (01-04)  a-d-product.js (05-10)  a-d-receipt.js (11-13)
 */
import { timesPlus, registerSound } from "./a-common.js";

export async function build(ctx) {
  const T = timesPlus(ctx);
  registerSound(ctx, T);
  if (ctx.isMobile) {
    const { buildOpenMobile } = await import("./a-m-open.js");
    const { buildProductMobile } = await import("./a-m-product.js");
    const { buildReceiptMobile } = await import("./a-m-receipt.js");
    const open = buildOpenMobile(ctx, T);
    const product = await buildProductMobile(ctx, T, open);
    buildReceiptMobile(ctx, T, product);
  } else {
    const { buildOpenDesktop } = await import("./a-d-open.js");
    const { buildProductDesktop } = await import("./a-d-product.js");
    const { buildReceiptDesktop } = await import("./a-d-receipt.js");
    const open = buildOpenDesktop(ctx, T);
    const product = await buildProductDesktop(ctx, T, open);
    buildReceiptDesktop(ctx, T, product);
  }
}
