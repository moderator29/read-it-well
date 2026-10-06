/**
 * Session 3's shared labels for the ported components in `components/ui`
 * (DragToConfirm, SlidePagination, Unfold, BatchTray, LiveIsland, AIResponse,
 * ActionSheetIllustrated). Every one of those components takes its words as
 * props and has no default, so a caller reads them from here rather than
 * each surface inventing its own "Slide to confirm".
 *
 * English only: ha, ig and yo fall back to it through `withFallback` until a
 * translator supplies a line. Money sentences never live here.
 */
export const experienceUiEn = {
  slideToConfirm: "Slide to confirm",
  confirming: "Confirming",
  confirmed: "Confirmed",
  /** DragToConfirm with money, after the first keyboard or screen-reader activation (D49.2). */
  pressAgain: "Press again to confirm",
  previousPage: "Previous page",
  nextPage: "Next page",
  page: "Page {n}",
  showDetails: "Show details",
  hideDetails: "Hide details",
  clearSelection: "Clear selection",
  notNow: "Not now",
  stop: "Stop",
  thinking: "Thinking",
};
