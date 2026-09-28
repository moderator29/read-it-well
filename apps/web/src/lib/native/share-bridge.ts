"use client";

/**
 * `navigator.share` FOR THE ANDROID SHELL. Native release audit, 28 September 2026.
 *
 * Android System WebView does not implement the Web Share API. Seven share
 * controls on the platform (profile, story, feed, post, receipt code, safety
 * share, listing status) test `typeof navigator.share === "function"` and fall
 * back to the clipboard, so inside the Android app every one of them copied a
 * link instead of opening the share sheet a person expects from an app. Only
 * the listing's own share asked the plugin directly (`device.ts`).
 *
 * Rather than teach seven components about Capacitor, the shell supplies the
 * missing API itself, backed by the Share plugin, with the Web Share contract
 * the callers already handle: it resolves when shared and rejects with an
 * `AbortError` DOMException when the person dismisses the sheet.
 *
 * Installed ONLY by `boot.ts`, after the authoritative native check, and ONLY
 * when the web view has no `navigator.share` of its own, so iOS (whose
 * WKWebView has one) and every browser are untouched. The teardown removes
 * exactly what it added.
 */

type SharePlugin = {
  share: (options: { title?: string; text?: string; url?: string; dialogTitle?: string }) => Promise<unknown>;
};

export type ShareData = { title?: string; text?: string; url?: string };

/** Pure: the Web Share function over a plugin, for `share-bridge.test.ts`. */
export function webShareOver(plugin: SharePlugin): (data?: ShareData) => Promise<void> {
  return async (data?: ShareData) => {
    const input = data ?? {};
    if (!input.title && !input.text && !input.url) {
      throw new TypeError("share() needs a title, text or url");
    }
    try {
      await plugin.share({ title: input.title, text: input.text, url: input.url, dialogTitle: "Share" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/cancel/i.test(message)) throw new DOMException("Share canceled", "AbortError");
      throw new DOMException(message || "Share failed", "NotAllowedError");
    }
  };
}

export async function startShareBridge(): Promise<() => void> {
  const nav = navigator as Navigator & { share?: unknown; canShare?: unknown };
  if (typeof nav.share === "function") return () => undefined;

  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isPluginAvailable("Share")) return () => undefined;
  const plugin = Capacitor.registerPlugin<SharePlugin>("Share");

  const share = webShareOver(plugin);
  const canShare = (data?: ShareData) => Boolean(data && (data.title || data.text || data.url));
  Object.defineProperty(nav, "share", { value: share, configurable: true, writable: true });
  const addedCanShare = typeof nav.canShare !== "function";
  if (addedCanShare) {
    Object.defineProperty(nav, "canShare", { value: canShare, configurable: true, writable: true });
  }

  return () => {
    if (nav.share === share) delete (nav as { share?: unknown }).share;
    if (addedCanShare && nav.canShare === canShare) delete (nav as { canShare?: unknown }).canShare;
  };
}
