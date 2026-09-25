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
  | { kind: "area"; lines: ShareLines }
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

const EYEBROW = { display: "flex", color: OG_INK_MUTED, fontSize: 26, letterSpacing: 4, textTransform: "uppercase" } as const;

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
    const lines = input.lines;
    return (
      <Frame>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={EYEBROW}>{copy.areaEyebrow}</div>
          <div style={{ display: "flex", marginTop: 24, color: OG_INK, fontSize: 60, lineHeight: 1.15 }}>{lines.headline}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", background: OG_PANEL, borderRadius: 24, borderTop: `2px solid ${OG_BRAND}`, padding: "32px 40px", color: OG_INK, fontSize: 54 }}>
            {lines.range}
          </div>
          <div style={{ display: "flex", marginTop: 22, color: OG_INK_SECONDARY, fontSize: 30 }}>{lines.basis}</div>
          <div style={{ display: "flex", marginTop: 12, color: OG_INK_MUTED, fontSize: 26 }}>{lines.footer}</div>
        </div>
      </Frame>
    );
  }
  if (input.kind === "example") {
    return (
      <Frame>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={EYEBROW}>Vallo</div>
          <div style={{ display: "flex", marginTop: 28, color: OG_INK, fontSize: 72 }}>{input.card.stay ? copy.stay.example : copy.example}</div>
          <div style={{ display: "flex", marginTop: 20, color: OG_INK_SECONDARY, fontSize: 32, lineHeight: 1.3 }}>{input.card.stay ? copy.stay.exampleBody : copy.exampleBody}</div>
        </div>
        {input.card.reference ? <Code code={input.card.reference} /> : <div style={{ display: "flex" }} />}
      </Frame>
    );
  }
  const { card, lines, photo } = input;
  const sub = [lines.bedrooms, card.place].filter(Boolean).join(" · ");
  return (
    <Frame>
      <div style={{ display: "flex", gap: 44, alignItems: "center" }}>
        {photo && (
          // Satori draws this; there is no browser here for next/image to serve.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" width={220} height={220} style={{ borderRadius: 24, objectFit: "cover" }} />
        )}
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={EYEBROW}>Vallo</div>
          <div style={{ display: "flex", marginTop: 16, color: OG_INK, fontSize: 52, lineHeight: 1.15 }}>
            {lines.title.length > 60 ? `${lines.title.slice(0, 57)}...` : lines.title}
          </div>
          {sub && <div style={{ display: "flex", marginTop: 14, color: OG_INK_SECONDARY, fontSize: 32 }}>{sub}</div>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", color: OG_INK, fontSize: 64, letterSpacing: -1 }}>{lines.headline ?? copy.askForPrice}</div>
          {lines.second && <div style={{ display: "flex", marginTop: 10, color: OG_INK_SECONDARY, fontSize: 34 }}>{lines.second}</div>}
        </div>
        {card.kind === "listing" && card.reference && <Code code={card.reference} />}
      </div>
    </Frame>
  );
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
