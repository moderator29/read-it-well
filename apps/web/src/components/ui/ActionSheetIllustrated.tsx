"use client";

import Link from "next/link";
import "@/app/css/ported.css";
import { Button } from "@/components/ui/Button";
import { Icon3D, type Icon3DName } from "@/components/ui/Icon3D";
import { IconPlate, type IconPlateTone } from "@/components/ui/IconPlate";
import { PendingRing } from "@/components/ui/PendingRing";
import { Sheet } from "@/components/ui/Sheet";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { cn } from "@/lib/cn";

/**
 * THE ILLUSTRATED ACTION SHEET (north star section 15.2, reference 43).
 *
 * The best sheet pattern in the reference set, and it replaces the generic list
 * sheet wherever a person chooses between a few related actions. Anatomy, top to
 * bottom, exactly as the north star lists it:
 *
 *   1. a clay object on a soft radial ground (an `Icon3D`, 96px, decorative);
 *   2. a title in display type;
 *   3. one line of body;
 *   4. rows separated by hairlines, each a small round tinted glyph plate, a
 *      label and a chevron;
 *   5. a single quiet dismiss.
 *
 * USE IT FOR: Manage your circle in the referral hub, Add a workspace, Create,
 * Share, Invite, Manage payout accounts, Manage a tenancy, and the per-feature
 * onboarding's final panel.
 *
 * IT COMPOSES `Sheet`, IT DOES NOT REPLACE IT. Everything about being a sheet
 * (the portal, the scrim and its blur ramp, the rise at 380ms on the spring, the
 * drag handle and flick to close, the focus trap and its return, Escape, Back,
 * the scroll lock, the safe-area inset) is `Sheet`'s and is inherited unchanged.
 * This file owns only what is inside. The visible title here is the dialog's
 * name: `Sheet` is given `hideTitle`, which keeps the same text as its
 * accessible name, so there is one title on screen and one in the tree.
 *
 * ROWS ARE LINKS OR ACTIONS. A row with `href` is a real link; otherwise a
 * button that calls `onSelect`. Choosing a row closes the sheet, because a sheet
 * of choices has done its job once one is made. A row may carry a `hint` (one
 * quiet line, e.g. a count the caller owns). Row glyph plates are the round
 * tinted `IconPlate` (reference 44's content rows); `tone` picks the tint, and
 * `danger` rows use the rose plate and label, never glowing.
 *
 * THE RADIAL GROUND is a tint of the brand (`--nf-brand-tint-*`), fading to
 * transparent, so it is quiet in both themes and is not a second glow.
 *
 * COPY is entirely the caller's: title, body, row labels and the dismiss label.
 * There is no default text and no default row. The sheet never invents an option.
 *
 * TOUCH: every row is at least 56px tall and the dismiss is the 44px button.
 */

export type ActionSheetRow = {
  id: string;
  label: string;
  /** One quiet line under the label. */
  hint?: string;
  icon: UiIconName;
  tone?: IconPlateTone;
  href?: string;
  onSelect?: () => void;
  danger?: boolean;
  /** The row's own work is under way: it says so (`aria-busy`, the held
      pending ring in the chevron's place) and takes no second tap. */
  pending?: boolean;
};

export function ActionSheetIllustrated({
  open,
  onOpenChange,
  title,
  body,
  object,
  rows,
  dismissLabel,
  className,
  testId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** One line. */
  body?: string;
  /** The clay object at the top. */
  object: Icon3DName;
  rows: readonly ActionSheetRow[];
  /** The single quiet dismiss, e.g. the locale's "Not now". */
  dismissLabel: string;
  className?: string;
  testId?: string;
}) {
  const choose = (row: ActionSheetRow) => {
    row.onSelect?.();
    onOpenChange(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      hideTitle
      detents={[0.92]}
      className={cn("nf-asi", className)}
      testId={testId}
    >
      <div className="nf-asi__head">
        <div className="nf-asi__ground" aria-hidden="true">
          <Icon3D name={object} size={96} />
        </div>
        <p className="nf-asi__title">{title}</p>
        {body ? <p className="nf-asi__body">{body}</p> : null}
      </div>
      <ul className="nf-asi__rows">
        {rows.map((row) => {
          const inner = (
            <>
              <IconPlate shape="round" size="sm" tone={row.danger ? "danger" : (row.tone ?? "brand")}>
                <UiIcon name={row.icon} size={20} />
              </IconPlate>
              <span className="nf-asi__text">
                <span className="nf-asi__label">{row.label}</span>
                {row.hint ? <span className="nf-asi__hint">{row.hint}</span> : null}
              </span>
              {row.pending ? (
                <PendingRing size={20} className="nf-asi__chevron" data-testid={`asi-pending-${row.id}`} />
              ) : (
                <UiIcon name="chevron-right" size={20} className="nf-asi__chevron" />
              )}
            </>
          );
          return (
            <li key={row.id} className="nf-asi__li">
              {row.href ? (
                <Link
                  href={row.href}
                  className="nf-asi__row"
                  data-danger={row.danger || undefined}
                  onClick={() => choose(row)}
                >
                  {inner}
                </Link>
              ) : (
                <button
                  type="button"
                  className="nf-asi__row"
                  data-danger={row.danger || undefined}
                  disabled={row.pending || undefined}
                  aria-busy={row.pending || undefined}
                  onClick={() => choose(row)}
                >
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <div className="nf-asi__dismiss">
        <Button variant="quiet" size="md" full onClick={() => onOpenChange(false)}>
          {dismissLabel}
        </Button>
      </div>
    </Sheet>
  );
}
