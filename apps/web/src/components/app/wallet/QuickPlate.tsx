import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { MoneyGlyph, type MoneyGlyphName } from "./MoneyGlyph";

/**
 * The plate on a quick-action card, in two drawings, one per theme.
 *
 * At night it is the render's own art: the glass tiles cropped from the
 * governing renders into the shared pack (`send-plane-tile` is the Send
 * Money plate of 6AF37222 itself; `person-card`, `card-tile` and
 * `shield-check-tile` are the same register's tiles from 7F96BE6C and
 * 50E032EA). On paper those untwinned tiles would sit on the pack's navy
 * chip, a dark square punched into a white card, so the paper theme draws
 * the same glyph as a stroke on a brand-tinted plate instead. CSS shows one
 * and hides the other; both are in the markup, so nothing flashes.
 */
export function QuickPlate({
  art,
  glyph,
  uiIcon,
}: {
  art: BrandIconName;
  glyph?: MoneyGlyphName;
  uiIcon?: UiIconName;
}) {
  return (
    <span className="nf-wallet-quick__plate" aria-hidden="true">
      <span className="nf-wallet-quick__art">
        <BrandIcon name={art} fill />
      </span>
      <span className="nf-wallet-quick__stroke">
        {glyph ? <MoneyGlyph name={glyph} size={20} /> : uiIcon ? <UiIcon name={uiIcon} size={20} /> : null}
      </span>
    </span>
  );
}

