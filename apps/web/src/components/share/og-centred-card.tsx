import { OgLogo } from "./og-logo";
import { OG_BRAND, OG_CANVAS, OG_CHIP, OG_INK, OG_INK_MUTED, OG_INK_SECONDARY, ogAlpha } from "@/lib/price-check/og-palette";

/**
 * THE CARD A LINK UNFURLS AS, BUILT FOR THE PLACE IT IS SEEN (W3, round 5).
 *
 * WhatsApp shows a pasted link two ways. Sent, it draws the picture across
 * the bubble, about 300pt wide; while the message is being written, and in a
 * forwarded or quoted message, it draws a SQUARE THUMBNAIL about 88pt across,
 * cut from the CENTRE of the picture. The share card frame (`og-share-card`)
 * was laid out from the left edge, so that square kept "uy or stay, without
 * the" of a headline and half a photograph. Rendered and cropped as WhatsApp
 * crops it, every card lost its subject.
 *
 * So this composition puts the one subject in the centre square (x 285 to
 * 915 of 1200) and lets only the quiet things reach the edges: the word
 * mark bottom left, a code or the address bottom right.
 *
 *   - A listing: its photograph full bleed, the figure and the place set on a
 *     scrim at the foot of it. The square keeps the room and the price.
 *   - No photograph: the brand's own light (one glow, behind the figure),
 *     never a stock picture standing in for a property.
 *   - Words only (a page, an example, a closed door): one eyebrow, one line in
 *     the display face, one supporting line, centred.
 *
 * THE BRAND'S TYPE. The display line is Poppins 600, the product's heading
 * face, with the naira sign drawn by Inter at the same weight (Poppins has no
 * U+20A6; the product's own stack falls back to Inter for it the same way).
 * Text is Inter 400. Colours are the dark tokens (`og-palette.ts`): an unfurl
 * has no theme to follow, and a chat app in dark mode is where it is seen most.
 */

export const OG_CARD_SIZE = { width: 1200, height: 630 };

/** The family stack for the display line: Poppins, then Inter's naira sign. */
export const OG_DISPLAY = "Poppins, InterNaira";

export type OgCentredInput = {
  /** A data URL already fetched with a timeout, or null for the glow. */
  photo?: string | null;
  /** A small line above the display line (a page's chip). */
  eyebrow?: string | null;
  /** The one subject: a figure, or a page's question. */
  display: string;
  /** One supporting line under it. */
  sub?: string | null;
  /** Bottom right, quiet: a listing code or the address. */
  footRight?: string | null;
};

/** The logo, bottom left: the new mark and wordmark (D81, `og-logo.tsx`). */
function WordMark() {
  return <OgLogo height={22} />;
}

/**
 * The centre square is 630 wide; the words keep 15px inside it each side, so
 * nothing the subject says is cut when WhatsApp crops to it.
 */
const SAFE_WIDTH = 600;

/** Long lines step down a size rather than wrap into a third line. */
function displaySize(text: string, photo: boolean): number {
  const base = photo ? 64 : 66;
  if (text.length > 34) return Math.round(base * 0.74);
  if (text.length > 20) return Math.round(base * 0.86);
  return base;
}

export function ogCentredCard(input: OgCentredInput) {
  const photo = input.photo ?? null;
  const size = displaySize(input.display, photo !== null);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        background: OG_CANVAS,
        fontFamily: "Inter",
      }}
    >
      {photo ? (
        // Satori draws this; there is no browser here for next/image to serve.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt=""
          width={OG_CARD_SIZE.width}
          height={OG_CARD_SIZE.height}
          style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }}
        />
      ) : (
        /* The one glow, behind the subject: light from the brand, not a
           picture of a place that is not this one. */
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 0,
            left: 0,
            width: OG_CARD_SIZE.width,
            height: OG_CARD_SIZE.height,
            backgroundImage: `radial-gradient(ellipse 620px 360px at 50% 46%, ${ogAlpha(OG_BRAND, 0.28)}, ${ogAlpha(OG_BRAND, 0)} 100%)`,
          }}
        />
      )}
      {photo ? (
        /* The scrim the words sit on: the photograph stays the photograph in
           its top half, and the foot reads as the canvas, so no text ever
           stands on a busy picture. */
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 0,
            left: 0,
            width: OG_CARD_SIZE.width,
            height: OG_CARD_SIZE.height,
            backgroundImage: `linear-gradient(180deg, ${ogAlpha(OG_CANVAS, 0)} 34%, ${ogAlpha(OG_CANVAS, 0.72)} 60%, ${ogAlpha(OG_CANVAS, 0.94)} 80%, ${OG_CANVAS} 100%)`,
          }}
        />
      ) : null}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: photo ? "flex-end" : "center",
          flex: 1,
          padding: photo ? "0 120px 18px" : "56px 120px 0",
          textAlign: "center",
        }}
      >
        {input.eyebrow ? (
          <div
            style={{
              display: "flex",
              background: OG_CHIP,
              borderRadius: 12,
              padding: "10px 20px",
              marginBottom: 28,
              color: OG_INK_SECONDARY,
              fontSize: 26,
            }}
          >
            {input.eyebrow}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            maxWidth: SAFE_WIDTH,
            color: OG_INK,
            fontFamily: OG_DISPLAY,
            fontWeight: 600,
            fontSize: size,
            lineHeight: 1.12,
            letterSpacing: -1,
            /* No single word left on a line of its own. */
            textWrap: "balance",
          }}
        >
          {input.display}
        </div>
        {input.sub ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              maxWidth: SAFE_WIDTH,
              marginTop: 18,
              color: OG_INK_SECONDARY,
              fontSize: 32,
              lineHeight: 1.3,
              textWrap: "balance",
            }}
          >
            {input.sub}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "22px 48px 34px",
          color: OG_INK_MUTED,
          fontSize: 24,
        }}
      >
        <WordMark />
        {input.footRight ? <div style={{ display: "flex" }}>{input.footRight}</div> : <div style={{ display: "flex" }} />}
      </div>
    </div>
  );
}
