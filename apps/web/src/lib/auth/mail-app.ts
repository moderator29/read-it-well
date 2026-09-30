/**
 * WHICH MAIL APP TO OFFER ON THE CODE SCREEN (A4, 30 September).
 *
 * A person waiting for a code is one tap from it if the screen can open
 * their inbox. Only the big webmail hosts are named, and only when the
 * address plainly belongs to one; anything else gets no button, never a
 * guess. The Gmail link opens a search for mail from Vallo, so the code is
 * the first thing on screen even when it went to Promotions or Spam.
 *
 * Pure, so it is tested without a browser.
 */
export type MailApp = { app: string; href: string };

const HOSTS: ReadonlyArray<{ domains: readonly string[]; app: MailApp }> = [
  {
    domains: ["gmail.com", "googlemail.com"],
    app: { app: "Gmail", href: "https://mail.google.com/mail/u/0/#search/from%3Avallo+in%3Aanywhere" },
  },
  {
    domains: ["outlook.com", "hotmail.com", "live.com", "msn.com", "outlook.co.uk", "hotmail.co.uk"],
    app: { app: "Outlook", href: "https://outlook.live.com/mail/0/" },
  },
  {
    domains: ["yahoo.com", "yahoo.co.uk", "ymail.com"],
    app: { app: "Yahoo Mail", href: "https://mail.yahoo.com/" },
  },
  {
    domains: ["icloud.com", "me.com", "mac.com"],
    app: { app: "iCloud Mail", href: "https://www.icloud.com/mail" },
  },
];

export function mailAppFor(address: string): MailApp | null {
  const at = address.trim().toLowerCase().lastIndexOf("@");
  if (at < 1) return null;
  const domain = address.trim().toLowerCase().slice(at + 1);
  return HOSTS.find((host) => host.domains.includes(domain))?.app ?? null;
}

/** Seconds before "Send a new code" is offered again (A4). */
export const RESEND_WAIT_SECONDS = 30;

/** The countdown line: the dictionary sentence with whole seconds in `{s}`. */
export function resendLabel(template: string, seconds: number): string {
  return template.replace("{s}", String(Math.max(0, Math.ceil(seconds))));
}
