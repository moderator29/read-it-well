import { readFile } from "node:fs/promises";
import { ImageResponse } from "next/og";
import { getDictionary, DEFAULT_LOCALE } from "@vallo/i18n";
import { listStates } from "@/lib/places/queries";
import { shareById } from "@/lib/price-check/queries";
import { shareLines } from "@/lib/price-check/share-card";
import { shareCardCopy } from "@/components/app/price/share-copy";
import { OG_CANVAS, OG_INK_MUTED } from "@/lib/price-check/og-palette";
import { ogShareCard } from "@/components/share/og-share-card";
import { countFill } from "@/lib/ui/meter";

/**
 * THE CARD AS AN IMAGE, GENERATED AT REQUEST TIME FROM THE STORED ROW.
 *
 * ---------------------------------------------------------------------------
 * NO IMAGE IS EVER GENERATED FOR A CHECK THAT REFUSED, AND THAT IS STRUCTURAL.
 *
 * An image is a claim and a refusal has nothing to claim. There is no branch
 * below that draws a refusal, because there is no way to reach this file
 * without a `price_check_shares` row, and a row cannot exist without three
 * positive figures and a listing count of at least three: the check
 * constraints on that table refuse anything else, and `shareAreaSchema` refuses
 * it again before the wire. A card whose row cannot be read produces the plain
 * Vallo mark and no figures at all, which is the honest picture of nothing.
 *
 * ---------------------------------------------------------------------------
 * AND NO IMAGE EVER CARRIES AN ADDRESS.
 *
 * `shareLines` is the only thing that puts words on this picture and its only
 * input is an `AreaShare`, which has no address, latitude, longitude, listing
 * id or hint field, because the table behind it has no such column. The scope
 * enum has two labels and neither is a property. A check constraint refuses an
 * area string shaped like a street address. This file could not draw an
 * address if it were written to.
 *
 * That matters more here than anywhere else in the feature, because an image
 * is the artefact that survives forwarding best: it is screenshotted, saved,
 * and re-sent by people who never opened the link. Against 7,825 Nigerians
 * kidnapped in the year to June 2026, an address beside a naira figure is a
 * target selection document, and an image of one is a target selection
 * document that cannot be deleted.
 *
 * ---------------------------------------------------------------------------
 * DARK, IN THE BLUE FAMILY, AT THE TOKEN VALUES.
 *
 * Satori renders this outside the DOM, with no stylesheet and no cascade, so
 * `var(--nf-surface-canvas)` resolves to nothing and for a colour that means
 * paint nothing. The six values therefore have to be literals, and they live
 * in `lib/price-check/og-palette.ts` rather than here: this is a `.tsx`, and
 * `apps/web/vitest.config.ts` aliases `react` at its react-server entry, so
 * nothing in this file can be loaded by the test suite. `og-palette.test.ts`
 * reads `packages/design-tokens/src/tokens.css` and holds every one of them to
 * the token it was copied from, which is what makes the copy honest.
 *
 * One image, dark only. An OG card has no theme to respond to: it is rendered
 * once on a server and shown inside somebody else's chat app.
 */

export const alt = "Area asking prices on Vallo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * THE FONT TRAVELS WITH THE IMAGE, AND THE NAIRA SIGN IS WHY.
 *
 * The first render of this card printed the money as a TOFU BOX: "Asking [] 7.5m
 * to [] 9m a year", on the one artefact in this product whose entire job is to
 * carry a figure out of the product and be forwarded.
 *
 * WHAT CAUSED IT, because the cause decides the fix. Satori ships no system
 * font fallback, so `@vercel/og` fetches one PER MISSING GLYPH at render time,
 * over the network, from Google. That request answered 400 for U+20A6 and the
 * renderer drew the box. Geist, the font `@vercel/og` bundles, has no naira
 * sign either: it carries 726 codepoints, including the euro, and not this one.
 * The bundled Inter subsets in `public/fonts` cannot help, because Google's
 * `latin` and `latin-ext` unicode ranges both exclude U+20A6 - a browser covers
 * it from a system font, and there is no system here.
 *
 * So the fix is not a retry or a fallback string. An image route that fetches a
 * font from a third party every time it renders has a network dependency in the
 * middle of a picture of somebody's money, and its failure mode is silent and
 * only visible inside somebody else's chat app. The font is read from beside
 * this file instead: unsubsetted Inter, 2,474 codepoints, U+20A6 among them,
 * the same typeface the product is set in. `new URL(..., import.meta.url)` is
 * the pattern Next bundles as an asset, so it is present in the deployment
 * rather than resolved from the working directory at runtime.
 *
 * Inter is under the SIL Open Font License; the licence is beside the file.
 *
 * READ AND NOT FETCHED. `fetch()` of a `file:` URL throws "not implemented"
 * in Node, which is what the first attempt at this did; `readFile` takes a URL
 * object directly. The `new URL(..., import.meta.url)` form is kept because it
 * is what makes the bundler trace the file into the deployment, rather than
 * leaving it to be resolved against a working directory that is not the same
 * on a serverless function as it is here.
 *
 * ONE WEIGHT, DELIBERATELY. Hierarchy on this card is carried by SIZE and
 * COLOUR, which is what it is carried by on the screen the card came from. A
 * second weight would be another 143KB in a serverless bundle to say something
 * 62px against 28px already says.
 */
const FONT = new URL("./Inter-Regular.woff", import.meta.url);

async function interRegular(): Promise<ArrayBuffer> {
  const file = await readFile(FONT);
  return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const share = await shareById(id);

  /*
   * THE LOCALE IS NOT READ FROM A COOKIE HERE AND MUST NOT BE.
   *
   * This image is fetched by a crawler, a chat app's link unfurler or a
   * messaging server, none of which carry the reader's cookies. `getLocale()`
   * would answer with whatever the fallback is anyway, and reading it would
   * imply the picture varies per reader when it cannot. One image per card, in
   * the default locale, stated rather than accidental.
   */
  const t = getDictionary(DEFAULT_LOCALE);

  const font = await interRegular();
  const fonts = [{ name: "Inter", data: font, weight: 400 as const, style: "normal" as const }];

  if (share === null) {
    /* NO FIGURES, NO CLAIM. The mark and nothing else. */
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: OG_CANVAS,
            color: OG_INK_MUTED,
            fontFamily: "Inter",
            fontSize: 44,
            letterSpacing: -0.5,
          }}
        >
          Vallo
        </div>
      ),
      { ...size, fonts },
    );
  }

  const states = await listStates();
  const stateName = states.find((row) => row.code === share.stateCode)?.name ?? share.stateCode;
  const lines = shareLines(share, shareCardCopy(t), DEFAULT_LOCALE, stateName);

  /*
   * THE SHARE CARD FRAME (spec section 10, plan item 23), the same card the
   * share door's area face draws: the headline, the range as the figure at
   * one size from end to end (a range whose middle is emphasised is a point
   * estimate with decoration, so the midpoint is not drawn at all), one meter
   * bar per listing it came from with the count as its word, and EVERY FIGURE
   * PRINTS THE COUNT IT CAME FROM, on the image as on the screen, because the
   * image is the part that travels.
   */
  return new ImageResponse(
    ogShareCard({
      ...size,
      title: lines.headline,
      chip: t.priceCheck.share.cardChip,
      figure: lines.range,
      meter: { filled: countFill(lines.count), word: lines.meterWord },
      checks: [{ tone: "success", label: lines.basis }],
      honest: lines.footer,
    }),
    { ...size, fonts },
  );
}
