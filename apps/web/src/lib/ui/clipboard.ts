/**
 * COPY AND SHARE, ONE WAY EACH (details pass, 30 September 2026).
 *
 * Eighteen components wrote to the clipboard, each with its own fallback (or
 * none) and its own idea of how to say it worked: an inline "Copied" here, a
 * button label that changed there, nothing at all in four places. These are
 * the mechanics; `use-copy.ts` adds the one toast and the one haptic.
 *
 * `copyText` tries the async clipboard, then the old `execCommand` path
 * (older Android web views, an iframe without the permission), and says
 * whether either worked. `shareOrCopy` opens the native share sheet where
 * there is one (the Web Share API, which the Capacitor shell bridges to the
 * system sheet through `lib/native/share-bridge.ts`), treats a cancelled
 * sheet as nothing happening, and falls back to the clipboard.
 */
import { nativeShare } from "@/lib/native/device";

function copyByExecCommand(text: string): boolean {
  try {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.top = "-1000px";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    const done = document.execCommand("copy");
    document.body.removeChild(field);
    return done;
  } catch {
    return false;
  }
}

export async function copyText(text: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* Denied or unavailable: the old path below. */
  }
  return copyByExecCommand(text);
}

export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

export type SharePayload = { url: string; title?: string; text?: string };

export async function shareOrCopy(payload: SharePayload): Promise<ShareOutcome> {
  if (typeof window === "undefined") return "failed";
  /* STORE-04: inside the app, the operating system's own sheet first. */
  const native = await nativeShare(payload);
  if (native !== "unhandled") return native;
  if (typeof navigator.share === "function") {
    try {
      await navigator.share(payload);
      return "shared";
    } catch (error) {
      /* A closed sheet is the person changing their mind, not a failure. */
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
      /* NotAllowedError and friends: the clipboard is the same link. */
    }
  }
  return (await copyText(payload.url)) ? "copied" : "failed";
}
