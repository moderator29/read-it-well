/**
 * The TypeScript half of `scripts/build-email-objects.mjs`. That script bundles
 * this file with esbuild (resolving the `@/` alias to `apps/web/src`) and runs
 * it once with node; it prints one JSON object on stdout:
 *
 *   { objects: the names in EMAIL_OBJECTS,
 *     glyphs:  each EMAIL_GLYPHS key mapped to the static SVG markup of its
 *              UiIcon line glyph, drawn at 16px with `currentColor`, which the
 *              build script then colours and rasterises }
 *
 * Both lists are in `apps/web/src/lib/email/icons.ts`, so adding an object or
 * a glyph there and rerunning the build is the whole change. It is not meant
 * to be run on its own.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { EMAIL_GLYPHS, EMAIL_OBJECTS } from "@/lib/email/icons";

const glyphs: Record<string, string> = {};
for (const [key, name] of Object.entries(EMAIL_GLYPHS)) {
  glyphs[key] = renderToStaticMarkup(<UiIcon name={name} size={16} />);
}
process.stdout.write(JSON.stringify({ objects: EMAIL_OBJECTS, glyphs }));
