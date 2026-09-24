/**
 * "SHOW ME" (V-69): a renter asks the lister for one specific clip in the
 * thread, and the clip arrives with the time it was sent.
 *
 * The clip is an UPLOAD from the lister's phone: there is no in-app camera
 * on this branch, and nothing here says "captured in Vallo". What is shown
 * is true: when it was asked, and how long after that the clip arrived.
 * Pure and tested.
 */

export const SHOW_ME_ITEMS = ["tap", "bathroom", "meter", "window", "road", "generator", "other"] as const;
export type ShowMeItem = (typeof SHOW_ME_ITEMS)[number];

export function isShowMeItem(value: unknown): value is ShowMeItem {
  return typeof value === "string" && (SHOW_ME_ITEMS as readonly string[]).includes(value);
}

/** The words the database may answer with; each one is said in full. */
export const SHOW_ME_RESULTS = [
  "ok",
  "off",
  "signed-out",
  "not-yours",
  "blocked",
  "bad-item",
  "too-many",
  "already",
  "expired",
  "bad-path",
  "too-long",
  "failed",
] as const;
export type ShowMeResult = (typeof SHOW_ME_RESULTS)[number];

export function readShowMeResult(value: unknown): ShowMeResult {
  return typeof value === "string" && (SHOW_ME_RESULTS as readonly string[]).includes(value)
    ? (value as ShowMeResult)
    : "failed";
}

/** The longest clip the thread takes, in seconds. */
export const SHOW_ME_MAX_SECONDS = 30;

export type ShowMeRequest = {
  id: string;
  item: ShowMeItem;
  note: string | null;
  status: "open" | "answered";
  createdAt: string;
  expiresAt: string;
  answeredAt: string | null;
  clipSeconds: number | null;
  /** A short-lived signed URL for the clip, when answered and readable. */
  clipUrl: string | null;
};

/** What a request is now, at `now`: waiting, answered, or expired unanswered. */
export function showMeState(request: Pick<ShowMeRequest, "status" | "expiresAt">, now: Date): "open" | "answered" | "expired" {
  if (request.status === "answered") return "answered";
  return Date.parse(request.expiresAt) > now.getTime() ? "open" : "expired";
}

/** "1 hour 10 minutes", "25 minutes", "2 days": how long after the ask a clip came. */
export function elapsedText(fromIso: string, toIso: string, copy: { minutes: string; hours: string; days: string }): string {
  const minutes = Math.max(1, Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 60_000));
  if (minutes < 60) return copy.minutes.replace("{n}", String(minutes));
  const hours = Math.round(minutes / 60);
  if (hours < 48) return copy.hours.replace("{n}", String(hours));
  return copy.days.replace("{n}", String(Math.round(hours / 24)));
}

/** A clip's storage path: inside the request's own folder, which the database checks. */
export function clipPath(requestId: string, fileId: string, fileName: string): string {
  const ext = /\.(mp4|mov|webm)$/i.exec(fileName)?.[1]?.toLowerCase() ?? "mp4";
  return `${requestId}/${fileId}.${ext}`;
}
