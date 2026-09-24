/**
 * THE ARRIVAL CHECK, in English. V-91.
 *
 * Its own module for the reason `price-check.en.ts` gives: `en.ts` is written
 * by several workers at once, and a namespace in its own file touches it with
 * one import and one line.
 *
 * Nothing here promises a refund or a payout decision: a report puts the stay
 * in front of the team with the photos, and the team decides. The sentences
 * say exactly that.
 *
 * The other three locales inherit these through `withFallback`.
 */
export const arrivalCheckEn = {
  title: "Is it as listed?",
  lede: "You have arrived. Tell us if the place matches the listing. This stays open until {time}.",
  yes: "Yes, it is as listed",
  no: "No, something is wrong",
  reasonLabel: "What is wrong?",
  reasons: {
    not_as_listed: "It is not the place in the listing",
    no_access: "I cannot get in",
  },
  photosLabel: "Photos, taken now",
  photosHint: "Take at least one photo that shows the problem: the door, the room, the meter. Up to {max}.",
  takePhoto: "Take a photo",
  photoCount: "{count} of {max} photos added",
  noteLabel: "Anything else (optional)",
  send: "Send the report",
  back: "Back",
  uploadFailed: "That photo did not upload. Try again.",
  failed: "We could not send this just now. Try again. If you cannot get in and feel unsafe, call 112.",
  readFailed: "We could not load the arrival check just now. Refresh in a minute. If you cannot get in and feel unsafe, call 112.",
  closedOrAnswered: "The arrival check for this stay is closed.",
  answeredYes: "You told us it was as listed at {time}.",
  answeredReport: "You reported this stay at {time}. Our team has your photos and will contact you. Your reference is {reference}.",
  answeredReportNoRef: "You reported this stay at {time}. Our team has your photos and will contact you.",
  admin: {
    title: "Arrival check",
    asListed: "The guest said it was as listed.",
    reported: "The guest reported: {reason}.",
    photos: "Photo {n}",
    note: "Guest's note",
  },
} as const;
