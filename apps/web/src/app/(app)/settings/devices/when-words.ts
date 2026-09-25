import type { Dictionary } from "@vallo/i18n/core";
import type { SessionWhen } from "@/lib/security/when";

/*
 * Shared by the devices screen and the new sign-in alert, so both say "today
 * at 10:00" in the same words from the same dictionary keys.
 */

/** "{when}" filled from the shape `sessionWhen` returns, in the reader's words. */
export function phrase(template: string, when: SessionWhen, t: Dictionary): string {
  const copy = t.settings.devices;
  const words =
    when.kind === "now"
      ? copy.whenNow
      : when.kind === "minutes"
        ? copy.whenMinutes.replace("{count}", String(when.minutes))
        : when.kind === "today"
          ? copy.whenToday.replace("{time}", when.time)
          : when.kind === "yesterday"
            ? copy.whenYesterday.replace("{time}", when.time)
            : when.kind === "date"
              ? when.date
              : "";
  /* An unusable timestamp draws no line at all rather than a sentence with a
     hole in it. There is nothing useful to say and saying half of it is worse. */
  return words.length === 0 ? "" : template.replace("{when}", words);
}
