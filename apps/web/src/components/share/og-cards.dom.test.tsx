import { readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { doorImage } from "@/app/s/[token]/door-image";
import { doorCardFromRow, doorLines, type DoorRow } from "@/lib/share/door";
import { PAGE_CARDS, pageCardImage } from "@/lib/site/page-card";

/**
 * THE CARDS AS WHATSAPP GETS THEM (W3, round 5).
 *
 * Renders the real cards (`next/og`, the bundled faces) and reads the pixels,
 * not the source, for the two things a chat app decides on its own:
 *
 *   1. The bytes. Every card leaves as a JPEG under 100KB. The door's listing
 *      card with a full-size photograph was a 477KB PNG.
 *   2. The square. Composing or forwarding, WhatsApp shows a square cut from
 *      the centre (x 285 to 915 of 1200). On a card of words nothing bright
 *      may stand outside that square above the foot row, or the thumbnail
 *      shows half a headline.
 *
 * Rendering is a DOM-project test only because this project compiles JSX;
 * it opens no browser.
 */

const WEB = join(__dirname, "..", "..", "..");
const copy = getDictionary("en").frontDoor.door;

/* The fixture `/preview/door/image` draws, with an address the card must not print. */
const row = {
  state: "listing",
  listing_id: "3f0e1c1a-0000-4000-8000-000000000001",
  reference: "VL-7K4MQP",
  is_demo: false,
  title: "Two bedroom flat with a prepaid meter",
  area: "Yaba",
  city: "Lagos",
  state_name: "Lagos",
  state_code: "LA",
  property_type: "apartment",
  listing_intent: "rent",
  bedrooms: 2,
  rent_amount_minor: 250000000,
  rent_period: "year",
  caution_deposit_minor: 25000000,
  agency_fee_minor: 25000000,
  legal_fee_minor: 25000000,
  total_move_in_cost_minor: 325000000,
  photo_path: "/brand/photos/living-room-day.jpg",
  address: "14 Admiralty Way",
} as unknown as DoorRow;

/* The full-size photograph, as a real upload would be. */
const PHOTO = `data:image/jpeg;base64,${readFileSync(join(WEB, "public/brand/photos/living-room-day.jpg")).toString("base64")}`;

async function bytesOf(response: Response) {
  return { type: response.headers.get("content-type"), bytes: Buffer.from(await response.arrayBuffer()) };
}

/** The brightest pixel outside the centre square, above the foot row. */
async function brightestOutsideSquare(bytes: Buffer): Promise<number> {
  const { data, info } = await sharp(bytes).greyscale().raw().toBuffer({ resolveWithObject: true });
  let max = 0;
  for (let y = 20; y < 550; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (x >= 270 && x < 930) continue;
      max = Math.max(max, data[y * info.width + x]!);
    }
  }
  return max;
}

const BUDGET = 100 * 1024;

describe("the share cards, as a chat app receives them", () => {
  const listing = doorCardFromRow(row);
  if (!listing || listing.kind !== "listing") throw new Error("fixture");
  const lines = doorLines(listing, copy, "en");

  it("sends a listing with its full-size photograph as a JPEG under 100KB", async () => {
    const { type, bytes } = await bytesOf(await doorImage({ kind: "listing", card: listing, lines, photo: PHOTO }, copy));
    expect(type).toBe("image/jpeg");
    expect(bytes.subarray(0, 2).toString("hex")).toBe("ffd8");
    expect(bytes.byteLength).toBeLessThanOrEqual(BUDGET);
    const meta = await sharp(bytes).metadata();
    expect([meta.width, meta.height]).toEqual([1200, 630]);
  });

  const wordCards: [string, () => Promise<Response>][] = [
    ["a listing with no photograph", () => doorImage({ kind: "listing", card: listing, lines, photo: null }, copy)],
    [
      "an example listing",
      async () => {
        const example = doorCardFromRow({ ...row, is_demo: true } as DoorRow);
        if (example?.kind !== "example") throw new Error("fixture");
        return doorImage({ kind: "example", card: example }, copy);
      },
    ],
    ["a door that cannot be read", () => doorImage({ kind: "mark" }, copy)],
    ...Object.entries(PAGE_CARDS).map(
      ([key, card]) => [`the ${key} page`, () => pageCardImage(card)] as [string, () => Promise<Response>],
    ),
  ];

  for (const [name, render] of wordCards) {
    it(`keeps ${name} inside the centre square, as a small JPEG`, async () => {
      const { type, bytes } = await bytesOf(await render());
      expect(type).toBe("image/jpeg");
      expect(bytes.byteLength).toBeLessThanOrEqual(BUDGET);
      /* White type is 255; the glow and the canvas stay far below this. */
      expect(await brightestOutsideSquare(bytes)).toBeLessThan(110);
    });
  }
});
