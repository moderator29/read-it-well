/**
 * ONE TOAST FOR THE WHOLE APP (details pass, 30 September 2026).
 *
 * The component `Toast` gave the platform one material, but every caller
 * still mounted its own copy wherever it happened to sit in the tree, so two
 * toasts could stack, a toast fired inside a sheet was painted where that
 * sheet put it, and nothing could be swiped away. This is the other half: one
 * store, one host (`components/ui/ToastHost.tsx`, mounted once in the root
 * layout), one placement above the dock, one timing, dismiss by swipe.
 *
 *   toast("Link copied")                     neutral, polite
 *   toast("Saved", { tone: "success" })      a check, polite
 *   toast("That failed", { tone: "error" })  announced at once, longer dwell
 *   toast("Hidden", { action: { label: "Undo", run } })
 *
 * The newest message replaces the one on screen: a toast is "what just
 * happened", and a queue of them is a log nobody asked for.
 *
 * Framework free and safe to import on the server (nothing runs until a
 * caller shows something in a browser).
 */

export type ToastTone = "neutral" | "success" | "error";

export type ToastAction = { label: string; run: () => void };

export type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
  action?: ToastAction;
  /** How long it stays, in ms. The host pauses the clock while it is touched. */
  durationMs: number;
  "data-testid"?: string;
};

export type ToastOptions = {
  tone?: ToastTone;
  action?: ToastAction;
  durationMs?: number;
  "data-testid"?: string;
};

/** Long enough to read a sentence; an error or an undo gets longer. */
export const TOAST_DWELL_MS = 4000;
export const TOAST_DWELL_LONG_MS = 6000;

/** The dwell a message gets when the caller does not name one. */
export function dwellFor(tone: ToastTone, hasAction: boolean): number {
  return tone === "error" || hasAction ? TOAST_DWELL_LONG_MS : TOAST_DWELL_MS;
}

type Listener = (item: ToastItem | null) => void;

let current: ToastItem | null = null;
let nextId = 1;
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener(current);
}

function show(message: string, options: ToastOptions = {}): number {
  const tone = options.tone ?? "neutral";
  const item: ToastItem = {
    id: nextId++,
    message,
    tone,
    durationMs: options.durationMs ?? dwellFor(tone, Boolean(options.action)),
    ...(options.action ? { action: options.action } : {}),
    ...(options["data-testid"] ? { "data-testid": options["data-testid"] } : {}),
  };
  current = item;
  emit();
  return item.id;
}

/** Take a message down. With an id, only if it is still the one showing. */
export function dismissToast(id?: number): void {
  if (!current) return;
  if (id !== undefined && current.id !== id) return;
  current = null;
  emit();
}

export function subscribeToast(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function currentToast(): ToastItem | null {
  return current;
}

type ToastFn = ((message: string, options?: ToastOptions) => number) & {
  success: (message: string, options?: Omit<ToastOptions, "tone">) => number;
  error: (message: string, options?: Omit<ToastOptions, "tone">) => number;
  dismiss: typeof dismissToast;
};

export const toast: ToastFn = Object.assign(
  (message: string, options?: ToastOptions) => show(message, options),
  {
    success: (message: string, options?: Omit<ToastOptions, "tone">) =>
      show(message, { ...options, tone: "success" }),
    error: (message: string, options?: Omit<ToastOptions, "tone">) =>
      show(message, { ...options, tone: "error" }),
    dismiss: dismissToast,
  },
);

/**
 * Whether a swipe has gone far enough, or fast enough, to take the toast down.
 * Pure, so the gesture's one decision is tested without a pointer.
 */
export function swipeDismisses(distancePx: number, velocityPxPerMs: number): boolean {
  return Math.abs(distancePx) > 64 || Math.abs(velocityPxPerMs) > 0.45;
}
