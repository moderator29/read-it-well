"use client";

import { useState } from "react";

/**
 * Listing gallery.
 *
 * Real listing photography arrives with the media pipeline. Until then each
 * pane draws a deterministic vector scene on the listing's gradient, the same
 * placeholder language `ListingCard` uses, so the detail page never
 * misrepresents inventory with stock photos. The strip switches the hero pane
 * in place; every pane is derived from the listing's hue so card and detail
 * page always match.
 */
const HUES: [string, string][] = [
  ["#4C1D95", "#1E1B4B"],
  ["#831843", "#1E1B4B"],
  ["#0C4A6E", "#111827"],
  ["#065F46", "#111827"],
  ["#7C2D12", "#1C1917"],
  ["#312E81", "#0F172A"],
];

/** One vector composition per view, all sharing the 400x300 stage. */
const SCENES: { label: string; angle: number; art: React.ReactNode }[] = [
  {
    label: "Exterior",
    angle: 150,
    art: (
      <>
        <path
          d="M0 300V190h34v-52h30v52h28v-84h44v84h26v-40h38v40h30v-66h40v66h34v-30h32v30h30v-46h34v46Z"
          fill="rgba(0,0,0,0.42)"
        />
        <circle cx="322" cy="62" r="26" fill="rgba(255,255,255,0.16)" />
      </>
    ),
  },
  {
    label: "Living area",
    angle: 205,
    art: (
      <>
        <rect x="286" y="86" width="66" height="162" rx="6" fill="rgba(255,255,255,0.12)" />
        <rect x="72" y="150" width="176" height="58" rx="10" fill="rgba(0,0,0,0.32)" />
        <rect x="58" y="196" width="204" height="52" rx="12" fill="rgba(0,0,0,0.42)" />
        <circle cx="118" cy="82" r="19" fill="rgba(255,255,255,0.14)" />
        <path d="M118 44v18" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
      </>
    ),
  },
  {
    label: "Bedroom",
    angle: 120,
    art: (
      <>
        <rect x="70" y="118" width="18" height="104" rx="6" fill="rgba(0,0,0,0.5)" />
        <rect x="70" y="152" width="260" height="70" rx="10" fill="rgba(0,0,0,0.4)" />
        <rect x="94" y="130" width="54" height="26" rx="9" fill="rgba(255,255,255,0.2)" />
        <rect x="154" y="130" width="54" height="26" rx="9" fill="rgba(255,255,255,0.15)" />
        <circle cx="320" cy="70" r="24" fill="rgba(255,255,255,0.13)" />
      </>
    ),
  },
  {
    label: "Neighbourhood",
    angle: 170,
    art: (
      <>
        <path d="M0 300v-80l60-40 60 40v80Z" fill="rgba(0,0,0,0.38)" />
        <path d="M130 300v-60l70-46 70 46v60Z" fill="rgba(0,0,0,0.3)" />
        <path d="M290 300v-90h80v90Z" fill="rgba(0,0,0,0.42)" />
        <circle cx="332" cy="62" r="22" fill="rgba(255,255,255,0.15)" />
      </>
    ),
  },
];

export function ListingGallery({ title, hue }: { title: string; hue: number }) {
  const [active, setActive] = useState(0);
  const [from, to] = HUES[hue % HUES.length] ?? HUES[0]!;
  const scene = SCENES[active] ?? SCENES[0]!;

  return (
    <section aria-label={`${title} gallery`}>
      {/* ------------------------------------------------------- hero pane */}
      <div className="nf-card relative aspect-[4/3] w-full overflow-hidden sm:aspect-[16/9]">
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(${scene.angle}deg, ${from} 0%, ${to} 100%)` }}
        >
          <svg
            viewBox="0 0 400 300"
            className="absolute inset-0 h-full w-full opacity-70"
            aria-hidden="true"
            preserveAspectRatio="none"
          >
            {scene.art}
          </svg>
        </div>

        {/* Gradient scrim keeps the caption legible on every hue. */}
        <div
          className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/65 via-black/25 to-transparent"
          aria-hidden="true"
        />

        <p className="absolute bottom-4 left-4 text-[0.8125rem] font-semibold text-white/90">
          {scene.label}
        </p>
        <p className="nf-numeric absolute bottom-4 right-4 rounded-full bg-black/40 px-2.5 py-1 text-[0.75rem] font-semibold text-white/85">
          {active + 1} / {SCENES.length}
        </p>
      </div>

      {/* --------------------------------------------------- thumbnail strip */}
      <ul className="nf-scroll-x mt-3 flex gap-2.5 overflow-x-auto pb-1">
        {SCENES.map((s, i) => (
          <li key={s.label} className="shrink-0">
            <button
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show ${s.label.toLowerCase()} view`}
              aria-pressed={i === active}
              className={`relative block h-14 w-20 overflow-hidden rounded-xl border transition-shadow sm:h-16 sm:w-24 ${
                i === active
                  ? "border-transparent ring-2 ring-[var(--nf-electric-300)]"
                  : "border-[var(--nf-border-subtle)] opacity-80 hover:opacity-100"
              }`}
              style={{ background: `linear-gradient(${s.angle}deg, ${from} 0%, ${to} 100%)` }}
            >
              <svg
                viewBox="0 0 400 300"
                className="absolute inset-0 h-full w-full opacity-70"
                aria-hidden="true"
                preserveAspectRatio="none"
              >
                {s.art}
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
