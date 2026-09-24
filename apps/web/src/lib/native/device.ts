"use client";

import { looksNative } from "./platform";

/**
 * STORE-04: THE NATIVE HALF OF SHARE, HAPTICS AND CAMERA CAPTURE.
 *
 * Each function asks `looksNative()` first and imports nothing on the web,
 * the same rule `boot.ts` sets: a visitor to the website pays for none of
 * this. In the shell the plugin is reached through `Capacitor.registerPlugin`
 * by name (`Share`, `Haptics`, `Camera`), which is how `components/app/push/
 * enrol.ts` reaches push, so the plugin packages are needed by `cap sync` and
 * never by the web bundle. A binary built without one of them rejects the
 * call, and every function here then answers "not handled" so the caller
 * falls back to what the website does.
 */

type Registry = { registerPlugin: <T>(name: string) => T; isPluginAvailable: (name: string) => boolean };

async function plugin<T>(name: string): Promise<T | null> {
  if (!looksNative()) return null;
  try {
    const { Capacitor } = (await import("@capacitor/core")) as unknown as { Capacitor: Registry };
    if (!Capacitor.isPluginAvailable(name)) return null;
    return Capacitor.registerPlugin<T>(name);
  } catch {
    return null;
  }
}

type SharePlugin = {
  share: (options: { title?: string; text?: string; url?: string; dialogTitle?: string }) => Promise<unknown>;
};

/**
 * The system share sheet. `"shared"` or `"cancelled"` when the native sheet
 * handled it; `"unhandled"` on the website or a binary without the plugin,
 * where the caller uses `navigator.share` or the clipboard as before.
 */
export async function nativeShare(input: {
  title?: string;
  text?: string;
  url?: string;
}): Promise<"shared" | "cancelled" | "unhandled"> {
  const share = await plugin<SharePlugin>("Share");
  if (!share) return "unhandled";
  try {
    await share.share({ ...input, dialogTitle: "Share" });
    return "shared";
  } catch (error) {
    /* The plugin rejects with "Share canceled" when the person closes the
       sheet, which is an answer, not a failure. */
    const message = error instanceof Error ? error.message : String(error);
    return /cancel/i.test(message) ? "cancelled" : "unhandled";
  }
}

type HapticsPlugin = {
  impact: (options: { style: "LIGHT" | "MEDIUM" | "HEAVY" }) => Promise<void>;
  notification: (options: { type: "SUCCESS" | "WARNING" | "ERROR" }) => Promise<void>;
};

/**
 * A tap the hand can feel. On iOS `navigator.vibrate` does nothing, which is
 * why `Button`'s pulse was silent on the platform that needs it most.
 * Returns true when the native engine took it.
 */
export async function nativeHaptic(kind: "tap" | "success" | "warning" = "tap"): Promise<boolean> {
  const haptics = await plugin<HapticsPlugin>("Haptics");
  if (!haptics) return false;
  try {
    if (kind === "tap") await haptics.impact({ style: "LIGHT" });
    else await haptics.notification({ type: kind === "success" ? "SUCCESS" : "WARNING" });
    return true;
  } catch {
    return false;
  }
}

type CameraPlugin = {
  getPhoto: (options: {
    quality: number;
    resultType: "base64";
    source: "CAMERA";
    width: number;
    correctOrientation: boolean;
    saveToGallery: boolean;
  }) => Promise<{ base64String?: string; format?: string }>;
};

/** Whether the running shell can open its own camera. */
export async function canCapturePhoto(): Promise<boolean> {
  return (await plugin<CameraPlugin>("Camera")) !== null;
}

/**
 * Open the camera and hand back the photograph as a `File`, so it goes
 * through exactly the upload path a picked file does. Null when the person
 * cancelled or the shell has no camera plugin.
 *
 * Base64 rather than a file URI: with the app loaded from the live origin, a
 * `capacitor://localhost` file URL is cross-origin to the page and cannot be
 * read back.
 */
export async function capturePhoto(): Promise<File | null> {
  const camera = await plugin<CameraPlugin>("Camera");
  if (!camera) return null;
  try {
    const photo = await camera.getPhoto({
      quality: 85,
      resultType: "base64",
      source: "CAMERA",
      /* Listing photos must be at least MIN_PHOTO_WIDTH wide and are shown at
         most around 2,000 across; 2,400 keeps every detail and the upload
         small on a metered bundle. */
      width: 2400,
      correctOrientation: true,
      saveToGallery: false,
    });
    return photoFile(photo.base64String, photo.format);
  } catch {
    return null;
  }
}

/** Base64 from the camera plugin to a `File`. Exported for its test. */
export function photoFile(base64: string | undefined, format: string | undefined): File | null {
  if (!base64) return null;
  const extension = (format ?? "jpeg").toLowerCase() === "png" ? "png" : "jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new File([bytes], `camera-${Date.now()}.${extension === "png" ? "png" : "jpg"}`, {
    type: `image/${extension}`,
  });
}
