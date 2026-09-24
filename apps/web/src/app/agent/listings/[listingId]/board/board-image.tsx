import { ImageResponse } from "next/og";
import type { BoardLines } from "@/lib/listings/board";
import { interRegular } from "@/app/s/[token]/door-image";
import { OG_BRAND, OG_CANVAS, OG_INK, OG_INK_MUTED, OG_PANEL } from "@/lib/price-check/og-palette";

/**
 * THE BOARD AS A PICTURE (V-08): a square for a sign-writer and an A3 for a
 * printer, drawn from `BoardLines` alone, which has no field for a phone
 * number, a price, a name or an address. The code is the largest thing on it,
 * in wide tracking, because it is read from a moving car and copied by hand.
 *
 * Dark, in the brand's canvas and ink at their token values (Satori resolves
 * no custom property; `og-palette.test.ts` holds them to `tokens.css`).
 */

export const BOARD_SIZES = {
  square: { width: 1080, height: 1080 },
  a3: { width: 1754, height: 2480 },
} as const;

export type BoardFormat = keyof typeof BOARD_SIZES;

export async function boardImage(lines: BoardLines, hint: string, format: BoardFormat): Promise<ImageResponse> {
  const size = BOARD_SIZES[format];
  const k = size.width / 1080;
  const fonts = [{ name: "Inter", data: await interRegular(), weight: 400 as const, style: "normal" as const }];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          background: OG_CANVAS,
          padding: 72 * k,
          fontFamily: "Inter",
          border: `${12 * k}px solid ${OG_BRAND}`,
        }}
      >
        <div style={{ display: "flex", color: OG_INK, fontSize: 190 * k, letterSpacing: 6 * k }}>{lines.banner}</div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", color: OG_INK, fontSize: 92 * k }}>{lines.shape}</div>
          <div style={{ display: "flex", marginTop: 12 * k, color: OG_INK_MUTED, fontSize: 64 * k }}>{lines.onVallo}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              background: OG_PANEL,
              borderRadius: 28 * k,
              padding: `${28 * k}px ${48 * k}px`,
              color: OG_INK,
              fontSize: 132 * k,
              letterSpacing: 14 * k,
            }}
          >
            {lines.code}
          </div>
          <div style={{ display: "flex", marginTop: 24 * k, color: OG_INK_MUTED, fontSize: 40 * k }}>{hint}</div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
