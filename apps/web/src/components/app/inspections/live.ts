/**
 * Whether a notification's link is about an inspection. The two hrefs are
 * the ones `private.notify_inspection_change` writes; a query string or a
 * deeper path still counts, a lookalike prefix does not.
 */
export function isInspectionHref(href: string | null | undefined): boolean {
  if (!href) return false;
  return /^\/(agent\/)?inspections(?:[/?#]|$)/.test(href);
}
