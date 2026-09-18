/**
 * The people this device has sent money to lately.
 *
 * The ledger carries no recipient email on a transfer row (the leg's note is
 * "Transfer to Tunde", and the address lives only in the action that moved
 * the money), so a chip built from the statement could name a person and
 * could not address them. That is a picture of a feature. What this device
 * does know is the email the sender typed and the name the action confirmed,
 * so the chips are the last five sends made HERE, kept in this browser only.
 * Nothing is invented and nothing about another person leaves this device.
 *
 * Pure functions, tested. The storage calls live beside them and never
 * throw: a private window or blocked storage means no chips, not a crash.
 */

export const RECENT_RECIPIENTS_KEY = "nf_wallet_recent_recipients";
export const RECENT_RECIPIENTS_MAX = 5;

export type RecentRecipient = {
  email: string;
  name: string;
  /** Epoch milliseconds of the last send. */
  at: number;
};

export function parseRecentRecipients(raw: string | null | undefined): RecentRecipient[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (one): one is RecentRecipient =>
          typeof one === "object" &&
          one !== null &&
          typeof (one as RecentRecipient).email === "string" &&
          typeof (one as RecentRecipient).name === "string" &&
          typeof (one as RecentRecipient).at === "number",
      )
      .slice(0, RECENT_RECIPIENTS_MAX);
  } catch {
    return [];
  }
}

/** Newest first, one entry per address, capped. */
export function rememberRecipient(
  list: RecentRecipient[],
  next: { email: string; name: string },
  at: number = Date.now(),
): RecentRecipient[] {
  const email = next.email.trim().toLowerCase();
  if (email.length === 0) return list;
  const rest = list.filter((one) => one.email.toLowerCase() !== email);
  return [{ email, name: next.name.trim() || email, at }, ...rest].slice(0, RECENT_RECIPIENTS_MAX);
}

/** "Tunde Adebayo" gives "TA"; an address gives its first two letters. */
export function recipientInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0 && !w.includes("@"));
  if (words.length >= 2) return `${words[0]![0]}${words[1]![0]}`.toUpperCase();
  const source = words[0] ?? name.trim();
  return source.slice(0, 2).toUpperCase();
}

/** "Tunde Adebayo" gives "Tunde A."; a lone word or address is left alone. */
export function recipientShortName(name: string): string {
  const words = name.trim().split(/\s+/).filter((w) => w.length > 0);
  if (words.length >= 2) return `${words[0]} ${words[1]![0]}.`;
  return words[0] ?? name;
}

export function readRecentRecipients(): RecentRecipient[] {
  try {
    return parseRecentRecipients(window.localStorage.getItem(RECENT_RECIPIENTS_KEY));
  } catch {
    return [];
  }
}

export function writeRecentRecipients(list: RecentRecipient[]): void {
  try {
    if (list.length === 0) window.localStorage.removeItem(RECENT_RECIPIENTS_KEY);
    else window.localStorage.setItem(RECENT_RECIPIENTS_KEY, JSON.stringify(list));
  } catch {
    /* Storage refused. The send still went; only the convenience is lost. */
  }
}
