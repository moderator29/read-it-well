"use client";

import { Sheet } from "@/components/ui/Sheet";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { panelClass } from "@/components/ui/Panel";

/**
 * The sheet every money form opens in: add money, withdraw, top up with
 * crypto. One shape, so the three movements arrive the same way.
 *
 * The portal, the focus trap, focus restoration, Escape, the backdrop and
 * the body scroll lock all belong to `<Sheet>`. The portal in particular is
 * not optional: rendered in place, a `position: fixed` panel is only ever
 * fixed to the nearest ancestor that establishes a containing block, and the
 * wallet's reveal wrappers establish several.
 */
export function MoneySheet({
  open,
  title,
  hint,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  hint: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={title}
    >
      {/* `nf-money` rides inside the portal, for the reason `ResultSheet`
          states: the sheet is mounted on the body, outside the page root the
          control law is scoped to. */}
      <div className="nf-money mx-auto w-full max-w-md">
        <div className="mb-heading flex items-start justify-between gap-md">
          <p className="nf-body-sm leading-relaxed text-[var(--nf-content-muted)]">{hint}</p>
          {/* The close button has the corner to itself: a decoy object beside
              Close, on the screen where somebody is about to move money, is
              the worst place in the product for one. */}
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="nf-icon-btn h-10 w-10 shrink-0"
          >
            <UiIcon name="close" size={20} />
          </button>
        </div>
        <div className={panelClass({ variant: "card", className: "p-card-sm sm:p-card" })}>{children}</div>
      </div>
    </Sheet>
  );
}
