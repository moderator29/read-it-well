/**
 * "Sat 10 Oct" for an ISO calendar date, the way the stay page shows it.
 * UX-28: shared so the checkout says the same dates the same way, instead of
 * printing "2026-10-10" after the stay page said "Sat 10 Oct".
 *
 * Written the British way in every locale, as every date on the platform is
 * written in English words (`intlTag` in @vallo/i18n/core says why).
 */
export function stayDateLabel(iso: string | undefined): string | null {
  if (!iso) return null;
  const parsed = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(parsed);
}
