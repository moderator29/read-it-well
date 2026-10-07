/**
 * The document sheet's class names and print attribute, as pure functions, so
 * the unit project can test them without rendering (the component itself is
 * TSX and imports two stylesheets, which the node test project cannot load).
 *
 * THE TWO KINDS (D28.1, D34).
 *
 *   document  an agreement's terms, a statement: Card radius, solid rules
 *   receipt   money that has already moved: the serrated tear top and
 *             bottom, square corners, dashed ledger rules
 *
 * Neither kind is a theme. The member's theme governs the page; the sheet is
 * light paper on it in both themes (document.css says how).
 */
export type DocumentKind = "document" | "receipt";

export function documentSheetClass(kind: DocumentKind = "document", className?: string): string {
  return ["nf-doc", kind === "receipt" ? "nf-doc--receipt" : "", className ?? ""].filter(Boolean).join(" ");
}

/**
 * The attribute print.css keys on. One printable sheet per page: print.css
 * prints the marked sheet and removes everything that neither is it, sits in
 * it, nor contains it, so two marked sheets would print as one run of both.
 */
export const DOC_PRINT_ATTR = "data-doc-print" as const;

/** The class a child of a printable sheet carries to stay off the paper. */
export const DOC_NO_PRINT_CLASS = "nf-doc-noprint" as const;

/** The row's class: an ordinary key and value, a sentence, or the total. */
export function documentRowClass(variant: "value" | "prose" | "total" = "value"): string {
  return variant === "value" ? "nf-doc__row" : `nf-doc__row nf-doc__row--${variant}`;
}

/**
 * A confirmation or a state, in words with a shape. `done` is the filled
 * circle in the document's accent ink; anything not done is the hollow circle
 * in muted ink. There is no third look for "failed": a document states what
 * is true, and a step that did not happen is simply not done.
 */
export function documentStateClass(done: boolean): string {
  return `nf-doc__state ${done ? "nf-doc__state--done" : "nf-doc__state--waiting"}`;
}
