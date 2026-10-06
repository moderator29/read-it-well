import sharp from "sharp";
import { OG_CANVAS } from "@/lib/price-check/og-palette";

/**
 * THE UNFURL CARD AS A JPEG, UNDER A BUDGET (W3, round 5).
 *
 * `ImageResponse` writes PNG and only PNG. For a card of words that is right:
 * flat colour and type compress well and stay sharp, about 50KB. For a card
 * with a listing's photograph in it, PNG was the wrong format by a factor of
 * five: the door's listing card measured 477KB, which is a 477KB download
 * every time the link is pasted, for every person in the group, on a network
 * that charges by the megabyte, and above the roughly 300KB beyond which some
 * unfurlers quietly drop the picture altogether.
 *
 * So every card leaves as a JPEG, encoded here with the `sharp` the app
 * already ships (`lib/images/scrub.ts`), at the best quality that fits
 * `OG_JPEG_BUDGET`. A card of words keeps full colour resolution (4:4:4) so
 * its type has clean edges; a photograph takes 4:2:0, which the eye does not
 * see in a picture and which is a quarter of its colour data.
 */

/** Under 100KB on the slowest network the product is written for. */
export const OG_JPEG_BUDGET = 95 * 1024;

/** Tried in order; the first that fits is kept, so the card is as good as the budget allows. */
export const OG_JPEG_QUALITIES = [84, 78, 72, 66, 60] as const;

export type OgEncoded = { bytes: Buffer; quality: number };

export async function encodeOgCard(png: ArrayBuffer | Buffer, options: { photo: boolean }): Promise<OgEncoded> {
  const input = Buffer.isBuffer(png) ? png : Buffer.from(png);
  let last: OgEncoded | null = null;
  for (const quality of OG_JPEG_QUALITIES) {
    const bytes = await sharp(input)
      .flatten({ background: OG_CANVAS })
      .jpeg({ quality, mozjpeg: true, chromaSubsampling: options.photo ? "4:2:0" : "4:4:4" })
      .toBuffer();
    last = { bytes, quality };
    if (bytes.byteLength <= OG_JPEG_BUDGET) return last;
  }
  /* The lowest rung is still a picture; a card is never refused for size. */
  return last!;
}
