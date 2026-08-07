"use client";

import { StatusBar, Style } from "@capacitor/status-bar";
import { CHROME_COLOUR, currentTheme, watchTheme, type AppTheme } from "./theme";

/**
 * Keep the system status bar in step with the theme the person chose.
 *
 * `capacitor.config.ts` starts the bar dark, because dark is the platform's
 * default theme and the operating system does not override it. That covers the
 * launch and nothing after it. The moment somebody switches to the paper
 * theme, an unmanaged bar leaves near-black chrome with white glyphs sitting
 * directly above a #F4F5F7 page, or the reverse for somebody switching back,
 * and both look like a bug in a way people notice immediately even when they
 * cannot say what is wrong.
 *
 * THE NAMING TRAP IN THIS PLUGIN, WHICH IS BACKWARDS FROM WHAT IT READS LIKE.
 * `Style.Dark` does not mean "a dark bar". It means "light text, for a dark
 * background", so it is what the NAVY theme wants. `Style.Light` means dark
 * text for a light background, which is what the PAPER theme wants. Reading
 * these the natural way produces a bar whose glyphs are invisible against it,
 * which is the exact defect this file exists to prevent, so the mapping is
 * written out once here and never inlined at a call site.
 *
 * WHY `setBackgroundColor` IS ALLOWED TO FAIL AND `setStyle` IS NOT. The
 * background call is Android only, and the plugin documents it as unavailable
 * on Android 15 and above, where the system draws the bar edge to edge over
 * the application rather than letting it own a strip. On iOS the bar has no
 * background of its own at all; what shows through it is the page, which is
 * why the navy canvas and the `themeColor` declarations in the root layout are
 * the real answer there. So a rejection from that call is an expected outcome
 * on several perfectly healthy devices and is swallowed. The style call is the
 * one that decides whether the glyphs can be read, and it is attempted on
 * every platform.
 */

async function paint(theme: AppTheme): Promise<void> {
  try {
    await StatusBar.setStyle({ style: theme === "light" ? Style.Light : Style.Dark });
  } catch {
    /* Nothing useful to do. The bar keeps whatever it had, which is at worst
       the value the config set at launch. */
  }

  try {
    await StatusBar.setBackgroundColor({ color: CHROME_COLOUR[theme] });
  } catch {
    /* iOS, and Android 15 and above. See the note in the header: on both of
       those the colour behind the bar comes from the page itself. */
  }
}

/**
 * Paint once for the theme in force right now, then repaint on every change.
 * Returns the teardown.
 *
 * The first paint is not redundant with the config. The config value is
 * correct only for somebody who has never chosen the paper theme; anyone who
 * has launches with a light page under a bar the config set to dark, and this
 * corrects it within the first frame of the runtime starting.
 */
export function startStatusBar(): () => void {
  void paint(currentTheme());
  return watchTheme((theme) => {
    void paint(theme);
  });
}
