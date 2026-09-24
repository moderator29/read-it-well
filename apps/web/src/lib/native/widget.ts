import { looksNative } from "./platform";

/**
 * HANDING THE WIDGET ITS TOKEN. V-98, the JavaScript half.
 *
 * In the native app only, once per install, the app mints a device-bound
 * token (`mintWidgetToken`) and hands it, with this deployment's origin, to
 * the native `ValloWidget` plugin, which keeps it in the keystore or the
 * keychain App Group for the Android Glance and iOS WidgetKit widgets. Those
 * native widgets are not built yet; until they are, the plugin is absent and
 * nothing is minted, so no token exists that nothing holds.
 */

type WidgetPlugin = { setToken(options: { token: string; origin: string }): Promise<void> };

const HANDED = "vallo.widget.handed";

export async function handWidgetToken(mint: () => Promise<{ token: string } | { error: string }>): Promise<"handed" | "skipped"> {
  if (typeof window === "undefined" || !looksNative()) return "skipped";
  try {
    if (window.localStorage.getItem(HANDED) === "1") return "skipped";
  } catch {
    return "skipped";
  }
  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable("ValloWidget")) return "skipped";
  const minted = await mint().catch(() => ({ error: "failed" }));
  if (!("token" in minted)) return "skipped";
  const plugin = Capacitor.registerPlugin<WidgetPlugin>("ValloWidget");
  try {
    await plugin.setToken({ token: minted.token, origin: window.location.origin });
    window.localStorage.setItem(HANDED, "1");
    return "handed";
  } catch {
    return "skipped";
  }
}
