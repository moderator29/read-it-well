/**
 * The one way to reach a person, and the one place that decides what it is.
 *
 * This module used to hand out `support@rentme.ng`. **That mailbox does not
 * exist.** Six surfaces printed it as a live link, and two of them were
 * Privacy and Terms, which is where somebody goes to exercise a data right
 * under the NDPA. A wrong domain sends mail to the wrong place; an address
 * with no mailbox behind it sends it nowhere, silently, and the person who
 * wrote it believes they have asked. That is worse than the vallo.com
 * split this file was originally written to fix.
 *
 * So the module hands out a **channel** rather than an address.
 *
 * With no mailbox configured, every one of those surfaces points at
 * `/contact`, which is not a placeholder: the form there writes a real
 * `support_tickets` row under RLS, an admin reads it in the console at
 * `/admin/support`, and a reply notifies the person who sent it. It is a
 * working channel today, which a mailto is not.
 *
 * Set `NEXT_PUBLIC_SUPPORT_EMAIL` the day the mailbox is real and all six
 * surfaces become `mailto:` again, with no other edit anywhere. That is the
 * whole reason this is one module and not six string literals.
 */

const CONFIGURED = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "";

/**
 * The address, when there is one. **Null is the normal case today**, so any
 * caller that renders this must handle null rather than assuming a string.
 */
export const SUPPORT_EMAIL: string | null = CONFIGURED.length > 0 ? CONFIGURED : null;

/** Where "contact support" goes: the mailbox when configured, the form when not. */
export const SUPPORT_HREF: string = SUPPORT_EMAIL ? `mailto:${SUPPORT_EMAIL}` : "/contact";

/**
 * What the link says.
 *
 * Reads as a sentence either way: "write to support@rentme.ng" and "write to
 * us through the contact form" both work where they are used, so no caller has
 * to branch on which world it is in.
 */
export const SUPPORT_LABEL: string = SUPPORT_EMAIL ?? "the contact form";

/**
 * The same, for a sentence built in a server action where no link is possible.
 * `lib/profile/actions.ts` puts this in the account-deletion fallback.
 */
export const SUPPORT_SENTENCE: string = SUPPORT_EMAIL
  ? `email ${SUPPORT_EMAIL}`
  : "open the contact form at rentme.ng/contact";

/**
 * Kept as a named export because five surfaces already import it, and because
 * an external link needs `target="_blank"` where an internal one must not have
 * it. True only when a real mailbox is configured.
 */
export const SUPPORT_IS_EMAIL: boolean = SUPPORT_EMAIL !== null;

/** @deprecated Use `SUPPORT_HREF`, which is correct with no mailbox too. */
export const SUPPORT_MAILTO: string = SUPPORT_HREF;
