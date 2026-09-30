/**
 * C13: the acknowledgement's words on the alerts desk. Staff-only console
 * copy, kept English like the drift section beside it (see STAFF_ENGLISH in
 * packages/i18n/src/review-status.ts for the same decision elsewhere), and
 * out of the shared dictionary so this lane does not edit en.ts.
 */
export const ACK_COPY = {
  button: "I have this",
  /** "{who}" and "{when}" are filled by the card. */
  by: "Acknowledged by {who}, {when}.",
  byUnknown: "Acknowledged {when}.",
} as const;
