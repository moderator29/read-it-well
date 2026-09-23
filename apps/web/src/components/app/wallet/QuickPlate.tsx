import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";

/**
 * The plate on a quick-action card: the render's own art, the glass tiles
 * cropped from the governing renders into the shared pack (`send-plane-tile`
 * is the Send Money plate of 6AF37222 itself; `person-card`, `card-tile` and
 * `shield-check-tile` are the same register's tiles from 7F96BE6C and
 * 50E032EA). Dark only: the paper drawing went with light mode (founder item
 * 2, 23 September).
 */
export function QuickPlate({ art }: { art: BrandIconName }) {
  return (
    <span className="nf-wallet-quick__plate" aria-hidden="true">
      <span className="nf-wallet-quick__art">
        <BrandIcon name={art} fill />
      </span>
    </span>
  );
}
