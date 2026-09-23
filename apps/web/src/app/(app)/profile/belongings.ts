import { formatMoney, formatNumber, getDictionary, type Dictionary, type Locale } from "@vallo/i18n";
import type { Workspace } from "@/lib/supply/workspaces";
import type { WorkspaceKind } from "@/lib/supply/roles";
import { ROLE_COPY, type RoleState } from "@/components/roles/roles";

/**
 * THE PROFILE'S BELONGINGS, AS PURE FUNCTIONS.
 *
 * `50E032EA` draws four rows (My Bookings, Saved, Wallet, Inspections) and a
 * Switch role row under them. The render carries no number on any of them. The
 * founder's brief for this surface allows one, on the right of a row, only where
 * the database actually returns it. So every figure below arrives as a number
 * or as `null`, and `null` means "we could not read it", which draws NOTHING.
 * A failed read that drew "0 saved" would be telling somebody with forty saved
 * homes that they have none.
 *
 * Kept free of `server-only` so the unit tests can run them in Node and so the
 * client body can call them with the locale it already holds. Every word comes
 * from `socialProfile.accountPage` in `packages/i18n`.
 */

export type AccountPageCopy = Dictionary["socialProfile"]["accountPage"];

/** The account page's words in the reader's language. */
export function accountCopy(locale: Locale): AccountPageCopy {
  return getDictionary(locale).socialProfile.accountPage;
}

/** A person's badge tier as `public.person_badge` publishes it; null is none. */
export type BadgeTier = "gold" | "platinum" | null;

/** Reads a `person_badge.tier` value; anything else (none, missing) is no badge. */
export function badgeTierFrom(value: unknown): BadgeTier {
  return value === "gold" || value === "platinum" ? value : null;
}

/** What the four rows can say about themselves. `null` is "unknown", never zero. */
export type BelongingsFacts = {
  /** PENDING or CONFIRMED stays whose check out is still ahead, as a guest. */
  upcomingBookings: number | null;
  /** Saved listings plus saved hotels and restaurants. */
  saved: number | null;
  /**
   * The wallet balance in kobo, or null when the account has no wallet row yet
   * or the read failed. A wallet that exists with nothing in it IS zero, and
   * says so.
   */
  walletMinor: number | null;
  walletCurrency: string;
  /** Requests this person made that are still alive: asked, proposed or booked in. */
  openInspections: number | null;
};

export const NO_FACTS: BelongingsFacts = {
  upcomingBookings: null,
  saved: null,
  walletMinor: null,
  walletCurrency: "NGN",
  openInspections: null,
};

/**
 * The quiet value at the right of a row, or null for no value at all.
 *
 * A count of zero draws nothing too, on purpose: "0 upcoming" is a fact, but
 * it is a fact the row's own words already cover, and four zeros down the
 * right hand edge of a new account read as a scoreboard of what they have not
 * done. The wallet is the exception: a balance of nothing is still a balance,
 * and it is the one number on this screen somebody opens it to check.
 */
export function rowValue(
  kind: "bookings" | "saved" | "wallet" | "inspections",
  facts: BelongingsFacts,
  locale: Locale,
): string | null {
  const copy = accountCopy(locale);
  switch (kind) {
    case "bookings":
      return countLabel(facts.upcomingBookings, copy.upcoming, locale);
    case "saved":
      return countLabel(facts.saved, copy.saved, locale);
    case "inspections":
      return countLabel(facts.openInspections, copy.open, locale);
    case "wallet":
      return facts.walletMinor === null
        ? null
        : formatMoney(facts.walletMinor, locale, facts.walletCurrency);
  }
}

function countLabel(value: number | null, pattern: string, locale: Locale): string | null {
  if (value === null || value <= 0) return null;
  return pattern.replace("{count}", formatNumber(value, locale));
}

/* ----------------------------------------------------------- Switch role */

/** The key of the word a person would use for each kind of workspace. */
const KIND_WORD: Record<WorkspaceKind, keyof AccountPageCopy> = {
  owner: "roleOwner",
  agent: "roleAgent",
  firm: "roleFirm",
  host: "roleHost",
  console: "roleAdmin",
};

/**
 * The line under "Switch role", built from what the account actually holds.
 *
 * The render reads "Change between user, agent or admin". That sentence is
 * only true of somebody who is an agent AND on the operations team, which is
 * very nearly nobody, so it is never printed as a constant. Somebody holding
 * one workspace reads "Change between user and agent"; somebody holding the
 * console and an agent workspace reads the render's own sentence; somebody
 * holding nothing is told what the sheet can start, because the sheet always
 * carries "Add a workspace" and that is the truth about it.
 *
 * Duplicate kinds (two firms) name the kind once.
 */
export function switchRoleLine(
  workspaces: readonly Pick<Workspace, "kind">[],
  locale: Locale = "en",
): string {
  const copy = accountCopy(locale);
  const kinds: string[] = [];
  for (const workspace of workspaces) {
    const word = copy[KIND_WORD[workspace.kind]];
    if (!kinds.includes(word)) kinds.push(word);
  }
  if (kinds.length === 0) return copy.switchNone;
  const words = [copy.roleUser, ...kinds];
  if (words.length === 2) {
    const [a = "", b = ""] = words;
    return copy.switchTwo.replace("{a}", a).replace("{b}", b);
  }
  const last = words.pop() ?? "";
  return copy.switchMany.replace("{list}", words.join(", ")).replace("{last}", last);
}

/* ------------------------------------------------------------ ?switch= */

/**
 * Where `/profile?switch=owner` (and `=professional`) should land.
 *
 * Those links are real and live: `/agents` redirects to the first one, and the
 * home and search empty states link to it. They used to open the old role
 * sheet on the owner explanation. The profile no longer carries that sheet (the
 * Switch role row opens the workspace sheet the dock opens), so the link is
 * answered here, with the same three truths the old sheet told:
 *
 *   not set up         the setup for that role
 *   set up, waiting    where the application stands
 *   set up, verified   the workspace itself
 *
 * Returns null for anything else, which leaves the page alone.
 */
export function switchParamTarget(
  asked: string | string[] | undefined,
  roles: readonly RoleState[],
): string | null {
  const id = typeof asked === "string" ? asked : null;
  if (id !== "owner" && id !== "professional") return null;
  const role = roles.find((r) => r.id === id);
  if (!role || !role.setUp) return ROLE_COPY[id].setup.actionHref;
  if (!role.verified) return "/profile/application";
  return ROLE_COPY[id].href;
}
