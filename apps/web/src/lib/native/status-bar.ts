"use client";

import { StatusBar, Style } from "@capacitor/status-bar";
import { CHROME_COLOUR } from "@/lib/theme/chrome";

/**
 * Keep the system status bar in step with the page.
 *
 * THERE IS ONE THEME AND THIS FILE GOT SIMPLER ON 23 SEPTEMBER 2026, when the
 * founder removed light mode. It used to watch `data-theme` on the root
 * element through a `MutationObserver` in a module of its own and repaint
 * whenever somebody switched, because an unmanaged bar left near-black chrome
 * with white glyphs sitting directly above a #F4F5F7 page. Nothing switches
 * any more, so the observer, the `AppTheme` union it carried and the module
 * that owned both are deleted.
 *
 * `capacitor.config.ts` already starts the bar dark, so this is now a
 * belt-and-braces first paint rather than a correction: it costs one call and
 * it means the runtime and the config cannot drift.
 *
 * THE NAMING TRAP IN THIS PLUGIN, WHICH IS BACKWARDS FROM WHAT IT READS LIKE
 * AND IS THE REASON THE ONE REMAINING CALL IS COMMENTED AT ALL. `Style.Dark`
 * does not mean "a dark bar". It means "light text, for a dark background",
 * which is what this platform's only theme wants. Reading it the natural way
 * produces a bar whose glyphs are invisible against it.
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

async function paint(): Promise<void> {
  try {
    await StatusBar.setStyle({ style: Style.Dark });
  } catch {
    /* Nothing useful to do. The bar keeps whatever it had, which is at worst
       the value the config set at launch. */
  }

  try {
    await StatusBar.setBackgroundColor({ color: CHROME_COLOUR });
  } catch {
    /* iOS, and Android 15 and above. See the note in the header: on both of
       those the colour behind the bar comes from the page itself. */
  }
}

/**
 * Paint once. The teardown is kept in the signature, and is a no-op, because
 * every caller already stores and calls it and a signature change here would
 * be churn in files this has nothing to say about.
 */
export function startStatusBar(): () => void {
  void paint();
  return () => {};
}
