/**
 * The mailbox an address delivers to, for COUNTING only (never for sending).
 *
 * Mirrors `private.canonical_email_parts` (migration 20260923163049) for
 * Gmail: dots and a `+tag` in the local part reach the same inbox, and
 * googlemail.com is gmail.com. For every other domain a `+tag` is dropped
 * too: most providers treat it as a sub-address, and where one does not, two
 * addresses are merely counted together, which is the safe way for a cap to
 * be wrong.
 */
export function mailboxKey(address: string): string {
  const clean = address.trim().toLowerCase();
  const at = clean.lastIndexOf("@");
  if (at <= 0 || clean.indexOf("@") !== at) return clean;
  let local = clean.slice(0, at);
  let domain = clean.slice(at + 1);
  const plus = local.indexOf("+");
  if (plus >= 0) local = local.slice(0, plus);
  if (domain === "gmail.com" || domain === "googlemail.com") {
    local = local.replaceAll(".", "");
    domain = "gmail.com";
  }
  return `${local}@${domain}`;
}
