"use client";

import { useRef, useState } from "react";

import { Sheet } from "@/components/ui/Sheet";
import { EmptyActions } from "@/components/app/EmptyActions";

/**
 * The fixtures. Deliberately boring copy: this is for looking at the MATERIAL,
 * and a gallery full of clever sentences is one where nobody notices that the
 * rim is missing on rung three.
 */
const ELEVATION = ["nf-elev-1", "nf-elev-2", "nf-elev-3", "nf-elev-4", "nf-elev-5"];
const GLASS = [
  { cls: "nf-glass nf-glass--thin", label: "thin" },
  { cls: "nf-glass", label: "glass" },
  { cls: "nf-glass nf-glass--strong", label: "strong" },
];

function Section({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <section className="mt-section">
      <h2 className="nf-h3">{title}</h2>
      <p className="mt-xs max-w-measure-body text-[var(--nf-text-body-sm)] text-[var(--nf-content-secondary)]">
        {note}
      </p>
      <div className="mt-heading">{children}</div>
    </section>
  );
}

export function GalleryBoard() {
  const [sheet, setSheet] = useState<null | "plain" | "detents" | "focus">(null);
  const amountRef = useRef<HTMLInputElement | null>(null);

  return (
    <main className="nf-shell py-section">
      <h1 className="nf-h1">Gallery</h1>
      <p className="mt-sm max-w-measure-lede text-[var(--nf-content-secondary)]">
        Components that live behind a session, mounted with fixtures so they can be
        looked at. Development only. Nothing here asserts anything: it is a place to
        see, not a test.
      </p>

      <Section
        title="Sheet"
        note="The most-used overlay in the product and the one nobody has seen this sprint. Open each: the first is plain, the second rests at half height before the near-full detent, the third puts the keyboard on the amount field instead of on Close, which is what initialFocus exists for."
      >
        <div className="flex flex-wrap gap-inline">
          <button type="button" className="nf-btn nf-btn--glass" onClick={() => setSheet("plain")}>
            Plain sheet
          </button>
          <button type="button" className="nf-btn nf-btn--glass" onClick={() => setSheet("detents")}>
            Two detents
          </button>
          <button type="button" className="nf-btn nf-btn--glass" onClick={() => setSheet("focus")}>
            initialFocus
          </button>
        </div>
      </Section>

      <Section
        title="Elevation"
        note="The five rungs, each with its rim. A rung is a PAIR, the shadow and the rim together, and the thing to look for is whether the steps between them read as even."
      >
        <div className="flex flex-wrap gap-group">
          {ELEVATION.map((cls) => (
            <div
              key={cls}
              className={`${cls} grid h-24 w-32 place-items-center rounded-[var(--nf-radius-lg)] bg-[var(--nf-surface-elevated)] text-[var(--nf-text-caption)]`}
            >
              {cls.replace("nf-", "")}
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Glass"
        note="Three tiers. Each changes fill, blur and rim together, which is the whole point: a modifier that changes two of the three is a depth modifier modifying two thirds of the depth."
      >
        <div className="flex flex-wrap gap-group">
          {GLASS.map(({ cls, label }) => (
            <div
              key={label}
              className={`${cls} grid h-24 w-32 place-items-center rounded-[var(--nf-radius-lg)] text-[var(--nf-text-caption)]`}
            >
              {label}
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Empty state"
        note="One anatomy, both actions full width and stacked, primary then quiet. The second action has to be relevant: the wallet offers how the wallet works, not explore places."
      >
        <div className="nf-card p-card">
          <EmptyActions
            primary={{ label: "Add money", href: "#" }}
            secondary={{ label: "How the wallet works", href: "#" }}
          />
        </div>
      </Section>

      <Sheet open={sheet === "plain"} onOpenChange={(o) => setSheet(o ? "plain" : null)} title="A plain sheet">
        <p className="text-[var(--nf-content-secondary)]">
          One detent, opening near full height. Drag the grab handle down to dismiss.
        </p>
      </Sheet>

      <Sheet
        open={sheet === "detents"}
        onOpenChange={(o) => setSheet(o ? "detents" : null)}
        title="Two detents"
        detents={[0.5, 0.92]}
        footer={
          <button type="button" className="nf-btn nf-btn--primary w-full" onClick={() => setSheet(null)}>
            Done
          </button>
        }
      >
        <p className="text-[var(--nf-content-secondary)]">
          Opens at the last detent and rests at the first. A footer stays put while the
          body scrolls.
        </p>
      </Sheet>

      <Sheet
        open={sheet === "focus"}
        onOpenChange={(o) => setSheet(o ? "focus" : null)}
        title="Withdraw"
        initialFocus={amountRef}
      >
        <label className="block">
          <span className="text-[var(--nf-text-body-sm)]">Amount</span>
          <input ref={amountRef} className="nf-field mt-xs w-full" inputMode="numeric" placeholder="0" />
        </label>
        <p className="mt-sm text-[var(--nf-text-body-sm)] text-[var(--nf-content-secondary)]">
          Without initialFocus the keyboard lands on Close, which is the dismiss control,
          on every wallet drawer in the product.
        </p>
      </Sheet>
    </main>
  );
}
