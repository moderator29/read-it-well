/* Where everything lives. The social build reads only from the repo and writes
 * its finished images to docs/marketing/social/ and its intermediates to a
 * cache folder (SOCIAL_CACHE, or the system temp folder). */
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const SOCIAL = join(HERE, "..");
export const MARKETING = join(SOCIAL, "..");
export const REPO = join(MARKETING, "..", "..");
export const NM = join(MARKETING, "node_modules");
export const SOURCE = join(REPO, "docs", "marketing", "source");
export const SCREENS = join(REPO, "docs", "marketing", "screens");
export const OUT = join(REPO, "docs", "marketing", "social");
export const PUBLIC = join(REPO, "apps", "web", "public");
export const BRAND = join(PUBLIC, "brand");
export const FONTS = join(PUBLIC, "fonts");
export const CACHE = process.env.SOCIAL_CACHE || join(tmpdir(), "vallo-social");
export const CHROMIUM = process.env.SOCIAL_CHROMIUM || "/opt/pw-browsers/chromium";

for (const d of [OUT, CACHE, join(CACHE, "html"), join(CACHE, "phones"), join(CACHE, "img")]) mkdirSync(d, { recursive: true });
