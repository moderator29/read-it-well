import { formatNumber, type Dictionary, type Locale } from "@vallo/i18n";

type ShelfCopy = Dictionary["catalogue"]["shelf"];

/**
 * The results header's sentence.
 *
 * A PAGE IS NOT A TOTAL (OPS-11). The shelf pages by keyset, and the true
 * total is not known without counting rows the in-memory matcher may still
 * refuse, so a page of a longer list says what it shows and that more follow.
 * "24 properties found" over a list of three hundred is the ceiling problem
 * the paging removed, back in the header. The number is always the cards on
 * this page, which is what `data-count` and the browser checks read.
 */
export function shelfCountLine(
  state: { count: number; narrowed: boolean; more: boolean; later: boolean },
  copy: ShelfCopy,
  locale: Locale,
): string {
  const { count, narrowed, more, later } = state;
  if (count === 0) return narrowed ? copy.foundNone : "";
  const shown = formatNumber(count, locale);
  if (more) return (later ? copy.foundLaterPage : copy.foundPage).replace("{count}", shown);
  if (later) return copy.foundLastPage.replace("{count}", shown);
  return count === 1 ? copy.foundOne : copy.found.replace("{count}", shown);
}
