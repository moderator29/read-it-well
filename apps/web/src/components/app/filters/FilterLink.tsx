import Link from "next/link";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * The filter control for surfaces that have nothing to filter yet.
 *
 * The landing hero and the personal home both carry a search bar, but neither
 * holds a result pool, and a price range built from no listings would be a
 * guess dressed as a fact. So here the control is a link rather than a drawer:
 * it carries whatever has been typed through to /search and asks that page to
 * open its filters, where the bounds are computed from real candidates.
 *
 * It is deliberately the same glass square as the drawer's own opener on
 * /search, so the control means one thing everywhere it appears.
 */
export function FilterLink({ label }: { label: string }) {
  return (
    <Link
      href="/search?filters=open"
      prefetch
      aria-label={label}
      data-testid="filters-link"
      className="nf-icon-btn nf-icon-btn--square h-[3.25rem] w-[3.25rem] shrink-0"
    >
      <UiIcon name="sliders" size={18} />
    </Link>
  );
}
