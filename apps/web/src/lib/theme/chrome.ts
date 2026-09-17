/**
 * The colour of the chrome ABOVE the page, in both themes, and the one place
 * it is written down.
 *
 * FOUR THINGS PAINT THIS AND NONE OF THEM CAN READ A TOKEN.
 *
 *   `viewport.themeColor`        a `<meta>` tag, serialised on the server
 *   the before-paint script      runs before the stylesheet, on purpose
 *   `manifest.ts`                a JSON document
 *   `capacitor.config.ts`        read by a native plugin at install time
 *
 * Every one of them is emitted where no CSS has run, so a `var()` in any of
 * them resolves to nothing, which for a colour means "paint nothing" and on a
 * status bar means a white strip above a near-black page. That is why these are
 * literals, and it is also why they need a single home: four serialisation
 * points with no stylesheet between them will drift, and nothing will report it
 * because there is no stylesheet to report it to.
 *
 * WHY THIS IS NOT `--nf-surface-canvas`, MEASURED RATHER THAN ASSERTED. The
 * chrome abuts the TOP of the page, and the top of the page is the sticky glass
 * header, not the canvas behind it. Sampled at 390 in dark: the canvas computes
 * to #000010 and the header's fill samples #090919. #010118 sits between them
 * and nearer the header, which is the surface it actually touches. Somebody
 * chose this value correctly and recorded only that it matched, so the next
 * person to reach for the obvious token would have moved the chrome nine units
 * away from the thing it abuts. In light the two answers coincide, which is why
 * only the dark value ever looked arbitrary.
 *
 * NO `"use client"` HERE, DELIBERATELY. `lib/native/theme.ts` carries that
 * directive because it owns a `MutationObserver`, and `manifest.ts` is a server
 * route. Two plain constants and a type belong below that boundary so both
 * sides can read them without either one pulling the other's runtime in.
 *
 * `capacitor.config.ts` is the one consumer that still writes the value out by
 * hand, because it sits outside `src` and is read by tooling rather than by the
 * app. Its comment points here. If these values move, that file moves with them.
 */

export type AppTheme = "dark" | "light";

export const CHROME_COLOUR: Record<AppTheme, string> = {
  dark: "#010118",
  light: "#F4F5F7",
};
