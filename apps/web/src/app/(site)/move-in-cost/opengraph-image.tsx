import { PAGE_CARD_SIZE, PAGE_CARD_TYPE, PAGE_CARDS, pageCardImage } from "@/lib/site/page-card";

/** A13: this page family's own share card (`lib/site/page-card.tsx`). */
export const alt = PAGE_CARDS.moveIn.figure;
export const size = PAGE_CARD_SIZE;
export const contentType = PAGE_CARD_TYPE;

export default function Image() {
  return pageCardImage(PAGE_CARDS.moveIn);
}
