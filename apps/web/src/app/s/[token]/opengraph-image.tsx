import { getDictionary, DEFAULT_LOCALE } from "@vallo/i18n";
import { listStates } from "@/lib/places/queries";
import { shareById } from "@/lib/price-check/queries";
import { shareLines } from "@/lib/price-check/share-card";
import { shareCardCopy } from "@/components/app/price/share-copy";
import { doorLines, stayLines } from "@/lib/share/door";
import { doorPhotoUrl, readDoor, stayDoorPhotoUrl } from "@/lib/share/queries";
import { doorImage, photoData } from "./door-image";

/**
 * THE DOOR'S CARD AS AN IMAGE (V-07): what WhatsApp, Telegram and iMessage
 * draw when a door is pasted.
 *
 * It reads the same row as the page through the same `readDoor`, so the image
 * and the page cannot disagree and an unfurler is shown nothing a person is
 * not. Its words come from `doorLines`, the one place that decides them, and
 * it is drawn by `door-image.tsx`.
 *
 * NO ADDRESS, NO SHARER, NO EXAMPLE PRICE. An example card has no title,
 * place, photo or figure to draw, so it draws "Example listing" and the code.
 * A door that is missing, revoked, unpublished or unreachable draws the mark
 * and nothing else, which is the honest picture of nothing.
 *
 * THE CODE IS LARGE (V-08): a screenshot of this card on WhatsApp Status
 * carries no link, and the code is how it still leads back.
 *
 * The locale is the default and not read from a cookie: an unfurler carries
 * none, so one image per door, stated rather than accidental.
 */

export const alt = "A home on Vallo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const read = await readDoor(token);
  const t = getDictionary(DEFAULT_LOCALE);
  const copy = t.frontDoor.door;

  if (read.state !== "open" || read.card.kind === "gone") return doorImage({ kind: "mark" }, copy);
  const card = read.card;

  if (card.kind === "price_area") {
    const share = await shareById(card.shareId);
    if (share === null) return doorImage({ kind: "mark" }, copy);
    const states = await listStates();
    const stateName = states.find((row) => row.code === share.stateCode)?.name ?? share.stateCode;
    return doorImage({ kind: "area", lines: shareLines(share, shareCardCopy(t), DEFAULT_LOCALE, stateName) }, copy);
  }
  if (card.kind === "example") return doorImage({ kind: "example", card }, copy);
  if (card.kind === "stay") {
    return doorImage(
      { kind: "listing", card, lines: stayLines(card, copy), photo: await photoData(stayDoorPhotoUrl(card.photoPath)) },
      copy,
    );
  }

  return doorImage(
    {
      kind: "listing",
      card,
      lines: doorLines(card, copy, DEFAULT_LOCALE),
      photo: await photoData(doorPhotoUrl(card.photoPath)),
    },
    copy,
  );
}
