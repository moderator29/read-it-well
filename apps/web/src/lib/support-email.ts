/**
 * The one address a person can write to.
 *
 * There were two, on different domains. `(site)/privacy`, `(site)/terms`,
 * `(site)/help` and `(site)/contact` all printed `support@naijafinds.com`,
 * while `lib/profile/actions.ts`, `components/site/MobileMenu.tsx` and the mail
 * client's own `DEFAULT_FROM` used `hello@rentme.ng`.
 *
 * `naijafinds` is the workspace and package name this repository grew up with.
 * The product is RentMe and its domain is `rentme.ng`, which is the domain the
 * platform actually sends from, so that is the one that stays.
 *
 * This mattered most on the two pages nobody reads until something has gone
 * wrong. Privacy and Terms are where somebody goes to exercise a data right
 * under the NDPA, and both were sending them to a domain the product does not
 * use.
 *
 * `NEXT_PUBLIC_SUPPORT_EMAIL` overrides it, so pointing every page at a real
 * mailbox is one environment variable rather than seven edits, and the edits
 * cannot drift apart again.
 */
export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "support@rentme.ng";

/** `mailto:` for the same address, so no caller builds the scheme by hand. */
export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;
