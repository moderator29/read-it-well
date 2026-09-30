import { readFile } from "node:fs/promises";
import { ImageResponse } from "next/og";
import type { Dictionary } from "@vallo/i18n/core";
import type { ShareLines } from "@/lib/price-check/share-card";
import type { DoorCard, DoorLines } from "@/lib/share/door";
import {
  OG_BRAND,
  OG_CANVAS,
  OG_INK,
  OG_INK_MUTED,
  OG_INK_SECONDARY,
  OG_PANEL,
} from "@/lib/price-check/og-palette";
import { ogShareCard } from "@/components/share/og-share-card";
import { countFill } from "@/lib/ui/meter";

/**
 * THE DOOR'S IMAGE, DRAWN FROM ALREADY-DECIDED WORDS (V-07).
 *
 * `opengraph-image.tsx` reads the door and chooses a face; this draws it. Kept
 * apart so the harness at `/preview/door/image` draws every face against
 * fixtures: the live door has no real listing to draw until one exists, and a
 * picture that leaves the product must be looked at before it does.
 *
 * The inputs are a `DoorCard` and its worded lines, which have no field for an
 * address, a coordinate, an estate or a person, so nothing here can draw one.
 * The palette is the Price Check card's token values (Satori resolves no
 * custom property; `og-palette.test.ts` holds them to `tokens.css`), and the
 * font travels beside the file because the naira sign is in no font Satori
 * could otherwise reach.
 */

export const DOOR_IMAGE_SIZE = { width: 1200, height: 630 };

export type DoorImageFace =
  | { kind: "mark" }
  | {
      kind: "area";
      lines: ShareLines;
      /** The chip's word ("Price Check"); the card frame's head. */
      chip?: string;
    }
  | { kind: "example"; card: Extract<DoorCard, { kind: "example" }> }
  | {
      kind: "listing";
      /** A listing, or a stay, which has no code and whose headline is the dates line. */
      card: Extract<DoorCard, { kind: "listing" | "stay" }>;
      lines: DoorLines;
      /** A data URL, already fetched with a timeout, or null. */
      photo: string | null;
    };

const FONT = new URL("./Inter-Regular.woff", import.meta.url);

/** The bundled Inter, which carries the naira sign. Shared with the V-08 board. */
export async function interRegular(): Promise<ArrayBuffer> {
  const file = await readFile(FONT);
  return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
}

/**
 * The photograph, fetched with a short timeout and embedded rather than handed
 * to Satori as a URL: a slow storage response must cost the card its picture,
 * never the whole card.
 */
export async function photoData(url: string | null, origin?: string): Promise<string | null> {
  if (url === null) return null;
  const absolute = url.startsWith("/") && origin ? `${origin.replace(/\/+$/, "")}${url}` : url;
  if (!/^https?:\/\//.test(absolute)) return null;
  try {
    const response = await fetch(absolute, { signal: AbortSignal.timeout(2500) });
    if (!response.ok) return null;
    const type = response.headers.get("content-type") ?? "";
    if (!/^image\/(jpeg|png|webp)/.test(type)) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > 4_000_000) return null;
    return `data:${type.split(";")[0]};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

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
      }}
    >
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: 0,
          left: 0,
          width: 1200,
          height: 6,
          background: OG_BRAND,
        }}
      />
      {children}
    </div>
  );
}

function Code({ code }: { code: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignSelf: "flex-start",
        background: OG_PANEL,
        borderRadius: 16,
        padding: "14px 28px",
        color: OG_INK,
        fontSize: 44,
        letterSpacing: 8,
      }}
    >
      {code}
    </div>
  );
}

/** The sanctioned word for an example (`lib/listings/types.ts`), on the chip. */
const EXAMPLE_CHIP = "Example";


function face(input: DoorImageFace, copy: Dictionary["frontDoor"]["door"]) {
  if (input.kind === "mark") {
    return (
      <Frame>
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", color: OG_INK_MUTED, fontSize: 44 }}>
          Vallo
        </div>
      </Frame>
    );
  }
  if (input.kind === "area") {
    /* THE SHARE CARD FRAME (spec section 10): the headline, the range as the
       figure, one meter bar per listing it came from with the count as its
       word, the basis as the honest line and the standing footer under it. */
    const lines = input.lines;
    return ogShareCard({
      ...DOOR_IMAGE_SIZE,
      title: lines.headline,
      chip: input.chip ?? copy.areaEyebrow,
      figure: lines.range,
      meter: { filled: countFill(lines.count), word: lines.meterWord },
      checks: [{ tone: "success", label: lines.basis }],
      honest: lines.footer,
    });
  }
  /*
   * THE EXAMPLE AND THE LISTING FACES ON THE SHARE CARD FRAME (plan item 23;
   * spec section 10), the frame the area face already wears, so every link
   * Vallo unfurls is one card. An example says "Example" in the chip and in
   * its title, with the agreed sentence and no figure; a listing carries its
   * own photograph in the well, the title, the stated figure (or, with none,
   * the line that says to ask), the bedrooms and the area, and its code in
   * the foot. Every word arrives already decided by `doorLines`.
   */
  if (input.kind === "example") {
    const stay = input.card.stay;
    return ogShareCard({
      ...DOOR_IMAGE_SIZE,
      title: stay ? copy.stay.example : copy.example,
      chip: EXAMPLE_CHIP,
      honest: stay ? copy.stay.exampleBody : copy.exampleBody,
      footRight: input.card.reference ? `${copy.codeLabel} ${input.card.reference}` : null,
    });
  }
  const { card, lines, photo } = input;
  const sub = [lines.bedrooms, card.place].filter(Boolean).join(" · ");
  return ogShareCard({
    ...DOOR_IMAGE_SIZE,
    title: lines.title.length > 60 ? `${lines.title.slice(0, 57)}...` : lines.title,
    figure: lines.headline,
    honest: lines.headline ? lines.second : copy.askForPrice,
    footnote: sub || null,
    footRight: card.kind === "listing" && card.reference ? `${copy.codeLabel} ${card.reference}` : null,
    photo,
  });
}

export async function doorImage(input: DoorImageFace, copy: Dictionary["frontDoor"]["door"]): Promise<ImageResponse> {
  const fonts = [{ name: "Inter", data: await interRegular(), weight: 400 as const, style: "normal" as const }];
  return new ImageResponse(face(input, copy), { ...DOOR_IMAGE_SIZE, fonts });
}

/* ------------------------------------------------------ V-71, the Status */

export const STATUS_IMAGE_SIZE = { width: 1080, height: 1920 };

/**
 * THE STATUS PICTURE (V-71): the door's card at 9:16, for a WhatsApp Status.
 * A Status carries no link, so the listing code is the largest thing on it
 * after the figure, and the lister shares their own door link beside it. The
 * same inputs as the door card: area and state only, no phone, no address, no
 * sharer. An example draws "Example listing" and no figure.
 */
export async function statusImage(
  input: DoorImageFace,
  copy: Dictionary["frontDoor"]["door"],
  utilities: string | null,
): Promise<ImageResponse> {
  const fonts = [{ name: "Inter", data: await interRegular(), weight: 400 as const, style: "normal" as const }];
  const frame = (children: React.ReactNode) => (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: OG_CANVAS,
        padding: 88,
        fontFamily: "Inter",
        borderTop: `12px solid ${OG_BRAND}`,
      }}
    >
      {children}
    </div>
  );
  if (input.kind !== "listing") {
    const example = input.kind === "example";
    return new ImageResponse(
      frame(
        <>
          {/* One brand mark only: the word at the top. The mark-only face
              (a door that cannot be read) is that word and nothing else. */}
          <div style={{ display: "flex", color: OG_INK_MUTED, fontSize: 40, letterSpacing: 6 }}>VALLO</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {example && (
              <div style={{ display: "flex", color: OG_INK, fontSize: 96 }}>
                {input.card.stay ? copy.stay.example : copy.example}
              </div>
            )}
            {example && (
              <div style={{ display: "flex", marginTop: 28, color: OG_INK_SECONDARY, fontSize: 44, lineHeight: 1.3 }}>
                {input.card.stay ? copy.stay.exampleBody : copy.exampleBody}
              </div>
            )}
          </div>
          {example && input.card.reference ? <Code code={input.card.reference} /> : <div style={{ display: "flex" }} />}
        </>,
      ),
      { ...STATUS_IMAGE_SIZE, fonts },
    );
  }
  const { card, lines, photo } = input;
  const sub = [lines.bedrooms, card.place].filter(Boolean).join(" · ");
  return new ImageResponse(
    frame(
      <>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", color: OG_INK_MUTED, fontSize: 40, letterSpacing: 6 }}>VALLO</div>
          {photo && (
            // Satori draws this; there is no browser here for next/image to serve.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" width={904} height={680} style={{ marginTop: 48, borderRadius: 40, objectFit: "cover" }} />
          )}
          <div style={{ display: "flex", marginTop: 48, color: OG_INK, fontSize: 76, lineHeight: 1.15 }}>
            {lines.title.length > 70 ? `${lines.title.slice(0, 67)}...` : lines.title}
          </div>
          {sub && <div style={{ display: "flex", marginTop: 20, color: OG_INK_SECONDARY, fontSize: 48 }}>{sub}</div>}
          {utilities && <div style={{ display: "flex", marginTop: 16, color: OG_INK_SECONDARY, fontSize: 44 }}>{utilities}</div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", color: OG_INK, fontSize: 104, letterSpacing: -2 }}>{lines.headline ?? copy.askForPrice}</div>
          {lines.second && <div style={{ display: "flex", marginTop: 12, color: OG_INK_SECONDARY, fontSize: 52 }}>{lines.second}</div>}
          {card.kind === "listing" && card.reference && (
            <div style={{ display: "flex", marginTop: 56 }}>
              <Code code={card.reference} />
            </div>
          )}
        </div>
      </>,
    ),
    { ...STATUS_IMAGE_SIZE, fonts },
  );
}
