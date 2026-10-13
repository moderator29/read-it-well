import { buildShowcase } from "../showcase/common.js";
export async function build(ctx) { await buildShowcase(ctx, { platform: "android", theme: "light" }); }
