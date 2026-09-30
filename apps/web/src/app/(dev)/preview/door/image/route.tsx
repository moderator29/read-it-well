import { getDictionary } from "@vallo/i18n";
import { previewHarnessIsOpen } from "@/lib/preview-harness";
import { doorCardFromRow, doorLines, type DoorRow } from "@/lib/share/door";
import { doorImage, photoData } from "@/app/s/[token]/door-image";
import { boardImage } from "@/app/agent/listings/[listingId]/board/board-image";
import { boardFor } from "@/lib/listings/board";

/**
 * The door's unfurl image, every face, against a fixture (V-07). The fixture
 * carries an address and coordinates; the picture must show neither.
 * `?state=listing|example|area|mark|board|board-a3`; the last two draw the
 * V-08 TO LET board, which is flagged off in the product. Closed by the harness guard in
 * production, like every other preview.
 */
export async function GET(request: Request) {
  if (!previewHarnessIsOpen(process.env)) return new Response("Not found", { status: 404 });
  const url = new URL(request.url);
  const state = url.searchParams.get("state") ?? "listing";
  const copy = getDictionary("en").frontDoor.door;
  const row = {
    state: "listing",
    listing_id: "3f0e1c1a-0000-4000-8000-000000000001",
    reference: "VL-7K4MQP",
    is_demo: state === "example",
    title: "Two bedroom flat with a prepaid meter",
    area: "Yaba",
    city: "Lagos",
    state_name: "Lagos",
    property_type: "apartment",
    listing_intent: "rent",
    bedrooms: 2,
    rent_amount_minor: 250000000,
    rent_period: "year",
    caution_deposit_minor: 25000000,
    agency_fee_minor: 25000000,
    legal_fee_minor: 25000000,
    total_move_in_cost_minor: 325000000,
    photo_path: "/brand/photos/living-room-day-640.jpg",
    address: "14 Admiralty Way",
    latitude: 6.4412,
    longitude: 3.4721,
  } as unknown as DoorRow;
  const card = doorCardFromRow(row);
  if (state === "board" || state === "board-a3") {
    const boardCopy = getDictionary("en").frontDoor.board;
    const verdict = boardFor(
      { reference: "VL-7K4MQP", intent: "rent", propertyType: "rental", bedrooms: 2, isDemo: false },
      boardCopy,
    );
    if (verdict.state === "ready") {
      return boardImage(verdict.lines, boardCopy.typeCode, state === "board" ? "square" : "a3");
    }
  }
  if (state === "area") {
    return doorImage(
      {
        kind: "area",
        lines: {
          headline: "2 bedroom flats in Yaba",
          range: "Asking ₦1.8m to ₦2.6m a year",
          basis: "Based on 6 Vallo listings, September 2026",
          footer: "Asking prices, not sold prices. vallo.ng",
          count: 6,
          meterWord: "6 listings",
          month: "September 2026",
        },
      },
      copy,
    );
  }
  if (!card || state === "mark") return doorImage({ kind: "mark" }, copy);
  if (card.kind === "example") return doorImage({ kind: "example", card }, copy);
  if (card.kind !== "listing") return doorImage({ kind: "mark" }, copy);
  return doorImage(
    {
      kind: "listing",
      card,
      lines: doorLines(card, copy, "en"),
      photo: await photoData(card.photoPath, url.origin),
    },
    copy,
  );
}
