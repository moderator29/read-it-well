import { createHmac } from "node:crypto";

/**
 * THE NIN, HANDLED WITHOUT BEING KEPT (V-49).
 *
 * A virtual NIN is a sixteen-character token the applicant generates on the
 * NIN-linked phone (`*346*3*<NIN>*<merchant code>#`); it is merchant-specific,
 * single-use and expires in 72 hours, which is why it is safe to ask for. The
 * NIN it resolves to is eleven digits and is NEVER stored: it is turned into
 * an HMAC under a server-held key, so a second account presenting the same
 * NIN can be recognised, and nobody holding the database can recover it.
 */

export function normaliseVnin(raw: string): string {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}

export function isVnin(raw: string): boolean {
  return /^[A-Z0-9]{16}$/.test(normaliseVnin(raw));
}

export function isNin(raw: string): boolean {
  return /^\d{11}$/.test(raw);
}

/** HMAC-SHA256 of the NIN, hex. Throws on a key too short to be a secret. */
export function ninHmac(nin: string, key: string): string {
  if (key.length < 32) throw new Error("NIN HMAC key missing or too short");
  if (!isNin(nin)) throw new Error("not a NIN");
  return createHmac("sha256", key).update(nin).digest("hex");
}
