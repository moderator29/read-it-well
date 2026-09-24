import { getDictionary, DEFAULT_LOCALE } from "@vallo/i18n";
import { doorLines, doorUtilities, stayLines } from "@/lib/share/door";
import { doorPhotoUrl, readDoor, stayDoorPhotoUrl } from "@/lib/share/queries";
import { photoData, statusImage } from "../door-image";

/**
 * `/s/<token>/status` (V-71): the door's card as a 9:16 WhatsApp Status
 * picture. Public like the door, because it IS the door's card at another
 * size: the same row through the same `readDoor`, the same words, area only,
 * no phone, no address, no sharer. A door that cannot be read draws the mark.
 */
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const read = await readDoor(token);
  const t = getDictionary(DEFAULT_LOCALE);
  const copy = t.frontDoor.door;
  if (read.state !== "open" || read.card.kind === "gone" || read.card.kind === "price_area") {
    return statusImage({ kind: "mark" }, copy, null);
  }
  const card = read.card;
  if (card.kind === "example") return statusImage({ kind: "example", card }, copy, null);
  if (card.kind === "stay") {
    return statusImage(
      { kind: "listing", card, lines: stayLines(card, copy), photo: await photoData(stayDoorPhotoUrl(card.photoPath)) },
      copy,
      null,
    );
  }
  const image = await statusImage(
    {
      kind: "listing",
      card,
      lines: doorLines(card, copy, DEFAULT_LOCALE),
      photo: await photoData(doorPhotoUrl(card.photoPath)),
    },
    copy,
    doorUtilities(card, t.frontDoor.status),
  );
  image.headers.set("content-disposition", `inline; filename="vallo-status-${card.reference ?? "listing"}.png"`);
  return image;
}
