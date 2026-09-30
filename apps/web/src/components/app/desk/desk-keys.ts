/**
 * THE DESKS' SHARED KEY LAYER (C6), the rules half, pure and tested.
 *
 * Promoted from the support desk's own keys (`app/admin/support/SupportKeys`),
 * so every desk speaks the same keys:
 *   j / k   next and previous row (`[data-desk-row]`)
 *   Enter   open the focused row (its first link)
 *   a       put focus on Approve or Accept (`[data-desk-approve]`)
 *   x       put focus on Decline or Reject (`[data-desk-decline]`)
 *   g then a letter   jump to a desk (the map is the caller's)
 *   ?       the list; Escape closes it
 * a and x only FOCUS the control: the person still presses it, and every
 * decline opens its own confirmation, so a key never acts blind. Never while
 * typing, never with a modifier.
 */
export type DeskKeyAction =
  | { kind: "next" }
  | { kind: "prev" }
  | { kind: "open" }
  | { kind: "approve" }
  | { kind: "decline" }
  | { kind: "go-prefix" }
  | { kind: "jump"; href: string }
  | { kind: "help" }
  | { kind: "close" };

export type DeskKeyInput = {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  targetTag: string | null;
  targetEditable: boolean;
  /** A "g" was pressed moments ago. */
  awaitingJump: boolean;
};

export function deskKeyFor(input: DeskKeyInput, jumps: Readonly<Record<string, string>>): DeskKeyAction | null {
  if (input.metaKey || input.ctrlKey || input.altKey) return null;
  if (input.key === "Escape") return { kind: "close" };
  const tag = (input.targetTag ?? "").toUpperCase();
  if (input.targetEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return null;
  const key = input.key.length === 1 ? input.key.toLowerCase() : input.key;
  if (input.awaitingJump) {
    const href = jumps[key];
    return href ? { kind: "jump", href } : null;
  }
  switch (key) {
    case "j":
      return { kind: "next" };
    case "k":
      return { kind: "prev" };
    case "Enter":
      /* Only when a row itself has focus; a focused button keeps its own Enter. */
      return tag === "TR" || tag === "LI" || tag === "ARTICLE" ? { kind: "open" } : null;
    case "a":
      return { kind: "approve" };
    case "x":
      return { kind: "decline" };
    case "g":
      return Object.keys(jumps).length > 0 ? { kind: "go-prefix" } : null;
    case "?":
      return { kind: "help" };
    default:
      return null;
  }
}

/** The row index j or k lands on, from the one focused now (-1 for none). */
export function stepRow(count: number, at: number, direction: 1 | -1): number {
  if (count === 0) return -1;
  if (at < 0) return direction === 1 ? 0 : count - 1;
  return Math.min(count - 1, Math.max(0, at + direction));
}

/** The console's desk jumps: g then q, l, k, s, b, p, a. */
export const CONSOLE_JUMPS: Readonly<Record<string, string>> = {
  q: "/admin/queue",
  l: "/admin/listings",
  k: "/admin/kyc",
  s: "/admin/support",
  b: "/admin/bookings",
  p: "/admin/payments",
  a: "/admin/alerts",
  o: "/admin",
};

export const CONSOLE_JUMP_WORDS: Readonly<Record<string, string>> = {
  q: "Queue",
  l: "Listings",
  k: "KYC",
  s: "Support",
  b: "Bookings",
  p: "Payments",
  a: "Alerts",
  o: "Overview",
};

/** The agent workspace's jumps (C6). */
export const AGENT_JUMPS: Readonly<Record<string, string>> = {
  d: "/agent/dashboard",
  l: "/agent/listings",
  b: "/agent/bookings",
  m: "/agent/messages",
  e: "/agent/earnings",
};

export const AGENT_JUMP_WORDS: Readonly<Record<string, string>> = {
  d: "Dashboard",
  l: "Listings",
  b: "Bookings",
  m: "Messages",
  e: "Earnings",
};
