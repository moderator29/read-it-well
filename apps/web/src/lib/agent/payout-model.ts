

/** A Nigerian NUBAN is exactly ten digits. The database checks this too. */
export const NUBAN_LENGTH = 10;

export const NUBAN_RE = /^\d{10}$/;

/** Strip everything that is not a digit, so paste and spacing both work. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Display grouping for a NUBAN: 0123 456 789. The stored value stays bare, so
 * this is presentation only and never reaches the database.
 */
export function groupNuban(value: string): string {
  const digits = digitsOnly(value).slice(0, NUBAN_LENGTH);
  const parts = [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7, 10)];
  return parts.filter((p) => p.length > 0).join(" ");
}
