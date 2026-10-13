import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { AuthGate } from "@/components/auth/AuthGate";
import { panelClass } from "@/components/ui/Panel";
import type { UiIconName } from "@/design-system/icons/UiIcon";
import "@/app/css/catalogue.css";

/**
 * THE DESKTOP SUMMARY CARD (founder's reference, 13 October 2026).
 *
 * From `lg` the listing is two columns: the photographs and the details on the
 * left, and this card on the right, sticky, holding the three things a person
 * acts on: the price with what it buys, who listed it, and the one primary
 * action. On a phone the same three live in the lead block, the "Listed by"
 * section and the pinned foot, so this card is drawn from `lg` only and the
 * foot stands down there (`ListingStickyBar sidePanelFromLg`).
 *
 * Every part is passed in already resolved by the page: the figure is the
 * page's own formatted figure, the lister row is `ListingAgentCard` with the
 * same `lister`, and the action is the same href the foot carries, so the two
 * can never quote or do different things.
 */
export function ListingSummaryCard({
  price,
  note,
  lister,
  action,
  secondary,
  gate = "inspect",
}: {
  /** The headline figure with its unit, as the lead block draws it. */
  price: ReactNode;
  /** One line under the price (the move-in total on a tenancy), or nothing. */
  note?: ReactNode;
  /** The "Listed by" row, or nothing when the page has no lister to show. */
  lister?: ReactNode;
  action: { label: string; href: string; icon?: UiIconName };
  /** The quiet second action (the move-in breakdown, or the conversation). */
  secondary?: { label: string; href: string; icon?: UiIconName } | null;
  /** What signing in is for, when a guest presses the action. */
  gate?: "inspect" | "pay" | "message";
}) {
  return (
    <section className={panelClass({ variant: "card", className: "nf-detail-summary" })} data-testid="detail-summary">
      <div className="nf-detail-summary__price">{price}</div>
      {note ? <div className="nf-detail-summary__note">{note}</div> : null}
      {lister ? <div className="nf-detail-summary__lister">{lister}</div> : null}
      <AuthGate action={gate}>
        <ButtonLink
          href={action.href}
          variant="primary"
          size="lg"
          full
          leadingIcon={action.icon}
          className="nf-detail-summary__action"
          data-testid="summary-action"
        >
          {action.label}
        </ButtonLink>
      </AuthGate>
      {secondary ? (
        <ButtonLink
          href={secondary.href}
          variant="secondary"
          full
          leadingIcon={secondary.icon}
          className="mt-xs"
          data-testid="summary-secondary"
        >
          {secondary.label}
        </ButtonLink>
      ) : null}
    </section>
  );
}
