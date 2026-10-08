import { OgLogo } from "@/components/share/og-logo";
import { ImageResponse } from "next/og";
import { DEFAULT_LOCALE, getDictionary } from "@vallo/i18n";
import { shareCardCopy } from "@/components/app/price/share-copy";
import { areaAsking } from "@/lib/price-check/queries";
import { shareLines } from "@/lib/price-check/share-card";
import { publicAskingRows, resolveAreaPage, rowAsShare } from "@/lib/areas/pages";
import { areaPricePages } from "@/lib/areas/queries";
import { OG_BRAND, OG_CANVAS, OG_INK, OG_INK_MUTED, OG_INK_SECONDARY } from "@/lib/price-check/og-palette";
import { interRegular } from "@/app/s/[token]/door-image";

/**
 * THE AREA PAGE'S CARD (V-82 carry-over): what an unfurler draws when an
 * area price page is pasted. The same read and the same words as the page
 * (`areaAsking`, `publicAskingRows`, `shareLines`): the neighbourhood (a
 * closed-list name, rule 10), up to three asking ranges with their counts,
 * and "asking prices". No listing, no photograph, no address. An area that
 * has no page draws the mark alone, the honest picture of nothing.
 *
 * The locale is the default: an unfurler carries no cookie.
 */

export const alt = "What homes in this area are asking on Vallo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: OG_CANVAS,
        padding: 64,
        fontFamily: "Inter",
        borderTop: `10px solid ${OG_BRAND}`,
      }}
    >
      {children}
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ state: string; area: string }> }) {
  const { state, area } = await params;
  const t = getDictionary(DEFAULT_LOCALE);
  const fonts = [{ name: "Inter", data: await interRegular(), weight: 400 as const, style: "normal" as const }];
  const pages = await areaPricePages();
  const found = pages === null ? null : resolveAreaPage(state, area, pages);
  const asked = found ? await areaAsking(found.stateCode, null, found.area, "rent", null, null) : null;
  const rows = asked === null ? [] : publicAskingRows(asked).slice(0, 3);

  if (!found || rows.length === 0) {
    return new ImageResponse(
      (
        <Frame>
          <OgLogo height={34} />
          <div style={{ display: "flex" }} />
        </Frame>
      ),
      { ...size, fonts },
    );
  }

  const cardCopy = shareCardCopy(t);
  const title = t.frontDoor.areas.title.replace("{place}", `${found.area}, ${found.stateName}`);
  return new ImageResponse(
    (
      <Frame>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <OgLogo height={26} />
          <div style={{ display: "flex", marginTop: 16, color: OG_INK, fontSize: 52, lineHeight: 1.15 }}>{title}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {rows.map((row) => {
            const lines = shareLines(rowAsShare(found, row), cardCopy, DEFAULT_LOCALE, found.stateName);
            return (
              <div key={`${row.propertyType}-${row.bedrooms}`} style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", color: OG_INK_SECONDARY, fontSize: 24 }}>{lines.headline}</div>
                <div style={{ display: "flex", color: OG_INK, fontSize: 34 }}>{lines.range}</div>
                <div style={{ display: "flex", color: OG_INK_MUTED, fontSize: 20 }}>{lines.basis}</div>
              </div>
            );
          })}
        </div>
      </Frame>
    ),
    { ...size, fonts },
  );
}
