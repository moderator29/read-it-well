import { OgLogo } from "./og-logo";
import {
  OG_BRAND,
  OG_CANVAS,
  OG_CARD,
  OG_CHIP,
  OG_HAIRLINE,
  OG_INK,
  OG_INK_MUTED,
  OG_INK_SECONDARY,
  OG_PANEL,
  OG_SUCCESS,
  OG_WARNING,
} from "@/lib/price-check/og-palette";
import { meterBars, meterLevel } from "@/lib/ui/meter";

/**
 * THE SHARE CARD FRAME, FOR SATORI (spec section 10; plan item 23).
 *
 * The same anatomy as `ShareCardFrame.tsx`, drawn for `next/og`, which renders
 * outside the DOM and resolves no custom property: so every colour is a
 * literal from `lib/price-check/og-palette.ts`, each held to its token by
 * `og-palette.test.ts`. One image, dark, because an unfurl has no theme to
 * follow.
 *
 * It returns an element for an `ImageResponse`, not a response, so the Price
 * Check card and the share door's area face draw the same card from their own
 * routes. Every figure arrives formatted from a stored row; this computes only
 * how many bars a fact lights.
 */

export type OgCheck = { tone: "success" | "warning" | "pending"; label: string };

export type OgShareCardInput = {
  /** 1200x630 for an unfurl; 1080x1920 for a WhatsApp Status. */
  width: number;
  height: number;
  title: string;
  chip?: string;
  figure?: string | null;
  meter?: { filled: number; word: string; qualifier?: string } | null;
  checks?: readonly OgCheck[];
  /** The honest line, under the checks. */
  honest?: string | null;
  /** A second, quieter line: the standing footer. */
  footnote?: string | null;
  stats?: readonly { label: string; value: string }[];
  /** Right side of the foot row (a month); the Vallo word is always left. */
  footRight?: string | null;
  /**
   * A photograph for the left of the well (the listing link preview, plan
   * item 23), as a data URL the route has already fetched, so a slow or
   * missing picture can only leave the card without it, never break it.
   */
  photo?: string | null;
};

const METER_INK = { none: OG_HAIRLINE, low: OG_INK_MUTED, mid: OG_WARNING, high: OG_BRAND } as const;

function Mark({ tone, size }: { tone: OgCheck["tone"]; size: number }) {
  const fill = tone === "success" ? OG_SUCCESS : tone === "warning" ? OG_WARNING : "transparent";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: size / 2,
        background: fill,
        border: tone === "pending" ? `2px solid ${OG_HAIRLINE}` : "none",
      }}
    >
      {tone === "success" && (
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 14 14">
          <path d="M3.2 7.3 5.9 9.9 10.8 4.4" fill="none" stroke={OG_INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {tone === "warning" && (
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 14 14">
          <path d="M7 3.4v4.4" fill="none" stroke={OG_CANVAS} strokeWidth="2" strokeLinecap="round" />
          <circle cx="7" cy="10.3" r="1.1" fill={OG_CANVAS} />
        </svg>
      )}
    </div>
  );
}

export function ogShareCard(input: OgShareCardInput) {
  const tall = input.height > input.width;
  const s = tall ? 1.5 : 1;
  const bars = input.meter ? meterBars(input.meter.filled) : [];
  const level = input.meter ? meterLevel(input.meter.filled) : "none";
  const stats = (input.stats ?? []).filter((x) => x.value.trim().length > 0).slice(0, 3);
  const checks = (input.checks ?? []).slice(0, 4);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: OG_CANVAS,
        padding: 36 * s,
        fontFamily: "Inter",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          background: OG_CARD,
          border: `1px solid ${OG_HAIRLINE}`,
          borderRadius: 40 * s,
          padding: 14 * s,
        }}
      >
        {/* The head: the title, and the tinted chip. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: `${10 * s}px ${22 * s}px ${18 * s}px`,
          }}
        >
          <div style={{ display: "flex", color: OG_INK, fontSize: 36 * s, letterSpacing: -0.5, maxWidth: input.width * 0.62 }}>
            {input.title}
          </div>
          {input.chip ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: OG_CHIP,
                borderRadius: 12 * s,
                padding: `${10 * s}px ${18 * s}px`,
                color: OG_INK,
                fontSize: 24 * s,
              }}
            >
              <div style={{ display: "flex" }}>{input.chip}</div>
            </div>
          ) : null}
        </div>

        {/* The well. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "space-between",
            background: OG_PANEL,
            borderRadius: 28 * s,
            padding: input.photo ? 18 * s : `${32 * s}px ${38 * s}px`,
            ...(input.photo ? { flexDirection: "row" as const, paddingRight: 38 * s } : {}),
          }}
        >
          {input.photo ? (
            // Satori draws this; there is no browser here for next/image to serve.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={input.photo}
              alt=""
              width={Math.round(input.width * 0.36)}
              style={{
                display: "flex",
                width: "44%",
                height: "100%",
                objectFit: "cover",
                borderRadius: 20 * s,
                marginRight: 34 * s,
              }}
            />
          ) : null}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between", minWidth: 0 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {input.figure ? (
              <div style={{ display: "flex", color: OG_INK, fontSize: (tall ? 88 : 72) * (input.figure.length > 26 ? 0.85 : 1) * (input.photo && !tall ? 0.8 : 1), letterSpacing: -2, lineHeight: 1.05 }}>
                {input.figure}
              </div>
            ) : null}
            {input.meter ? (
              <div style={{ display: "flex", alignItems: "center", marginTop: input.figure ? 26 * s : 0 }}>
                <div style={{ display: "flex" }}>
                  {bars.map((lit, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        width: 16 * s,
                        height: 46 * s,
                        borderRadius: 8 * s,
                        marginRight: 7 * s,
                        background: lit ? METER_INK[level] : OG_HAIRLINE,
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", marginLeft: 18 * s, color: OG_INK, fontSize: 32 * s }}>
                  {input.meter.word}
                  {input.meter.qualifier ? (
                    <span style={{ color: OG_INK_MUTED, marginLeft: 10 * s }}>{`· ${input.meter.qualifier}`}</span>
                  ) : null}
                </div>
              </div>
            ) : null}
            {checks.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", marginTop: 26 * s }}>
                {checks.map((check) => (
                  <div key={check.label} style={{ display: "flex", alignItems: "center", marginTop: 10 * s }}>
                    <Mark tone={check.tone} size={32 * s} />
                    <div style={{ display: "flex", marginLeft: 16 * s, color: OG_INK, fontSize: 26 * s }}>{check.label}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {input.honest ? (
              <div style={{ display: "flex", color: OG_INK_SECONDARY, fontSize: 26 * s, lineHeight: 1.3 }}>{input.honest}</div>
            ) : null}
            {input.footnote ? (
              <div style={{ display: "flex", marginTop: 8 * s, color: OG_INK_MUTED, fontSize: 22 * s }}>{input.footnote}</div>
            ) : null}
            {stats.length >= 2 ? (
              <div
                style={{
                  display: "flex",
                  marginTop: 20 * s,
                  border: `1px solid ${OG_HAIRLINE}`,
                  borderRadius: 18 * s,
                }}
              >
                {stats.map((stat, index) => (
                  <div
                    key={stat.label}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      flex: 1,
                      padding: `${12 * s}px ${20 * s}px`,
                      borderLeft: index === 0 ? "none" : `1px solid ${OG_HAIRLINE}`,
                    }}
                  >
                    <div style={{ display: "flex", color: OG_INK_MUTED, fontSize: 20 * s }}>{stat.label}</div>
                    <div style={{ display: "flex", marginTop: 4 * s, color: OG_INK, fontSize: 26 * s }}>{stat.value}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          </div>
        </div>

        {/* The foot: the logo, small, bottom left (D81, `og-logo.tsx`). */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: `${14 * s}px ${22 * s}px ${4 * s}px`,
            color: OG_INK_MUTED,
            fontSize: 22 * s,
          }}
        >
          <OgLogo height={Math.round(20 * s)} />
          {input.footRight ? <div style={{ display: "flex" }}>{input.footRight}</div> : <div style={{ display: "flex" }} />}
        </div>
      </div>
    </div>
  );
}
