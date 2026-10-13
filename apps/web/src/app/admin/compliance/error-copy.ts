/**
 * THE COMPLIANCE ERROR SCREEN'S WORDS, in English.
 *
 * An error boundary is rendered by the framework with no server parent, so it
 * cannot be handed a slice of the dictionary as a prop, and reading one through
 * `@vallo/i18n` would ship the whole English dictionary (1.35 MB) to the
 * browser for three sentences. The compliance desk is staff-only and reads
 * English (the desk's own lane copy is English too), so the three lines live
 * here, kept word for word the same as `compliance.desk.unavailableTitle`,
 * `unavailableBody` and `tryAgain`; `error-copy.test.ts` holds them equal so
 * they cannot drift.
 */
export const COMPLIANCE_ERROR = {
  unavailableTitle: "This lane could not be read",
  unavailableBody: "The check could not run just now, so nothing here means clear. Try again in a moment.",
  tryAgain: "Try again",
} as const;
