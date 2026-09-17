"use client";

import { useRef, useState } from "react";

import { getDictionary } from "@vallo/i18n";

import { Sheet } from "@/components/ui/Sheet";
import { EmptyActions } from "@/components/app/EmptyActions";
import { WaitNotice } from "@/components/app/wallet/MoneyWait";
import { adminUi } from "@/app/admin/_components/ui";
import { QUEUE_EMPTY_MARK } from "@/app/admin/_components/queue-empty";

/**
 * The fixtures. Deliberately boring copy: this is for looking at the MATERIAL,
 * and a gallery full of clever sentences is one where nobody notices that the
 * rim is missing on rung three.
 */
const ELEVATION = ["nf-elev-1", "nf-elev-2", "nf-elev-3", "nf-elev-4", "nf-elev-5"];
/*
 * THE FOUR SPACING VALUES THE PRODUCT KEEPS INVENTING, beside the rungs they
 * sit between. Mounted because the decision about them is a decision about
 * whether a 2px difference in padding is visible, and that cannot be settled in
 * a report. 227 off-scale occurrences remain across the product and these four
 * are 176 of them.
 *
 * Each row is the value as written, the rung below it and the rung above it, at
 * the same width, so the question on screen is the only one that matters: can
 * you tell the middle one from its neighbours.
 */
const OFF_SCALE = [
  /*
   * THE FOUR RAW STEPS BELOW ARE THE SPECIMENS, NOT DECISIONS, which is why each
   * carries its own disable rather than the file carrying one. `nf/no-raw-spacing`
   * is right to see them and wrong about what they are: this panel exists to show
   * a reader what `p-1.5` looks like beside the rungs it sits between, and
   * migrating them to the scale would delete the thing being demonstrated. Same
   * shape as `pointer-coarse:text-[16px]` in components/ui/Field.tsx, where 16 is
   * mobile Safari's zoom threshold rather than a rung.
   */
  // eslint-disable-next-line nf/no-raw-spacing -- the specimen being displayed, not a spacing decision.
  { px: 6, uses: 46, lo: "p-2xs", loPx: 4, hi: "p-xs", hiPx: 8, raw: "p-1.5" },
  // eslint-disable-next-line nf/no-raw-spacing -- the specimen being displayed, not a spacing decision.
  { px: 10, uses: 39, lo: "p-xs", loPx: 8, hi: "p-sm", hiPx: 12, raw: "p-2.5" },
  // eslint-disable-next-line nf/no-raw-spacing -- the specimen being displayed, not a spacing decision.
  { px: 14, uses: 30, lo: "p-sm", loPx: 12, hi: "p-md", hiPx: 16, raw: "p-3.5" },
  // eslint-disable-next-line nf/no-raw-spacing -- the specimen being displayed, not a spacing decision.
  { px: 20, uses: 61, lo: "p-md", loPx: 16, hi: "p-lg", hiPx: 24, raw: "p-5" },
];

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
  /* English, because the gallery is for looking at the material and a reviewer
     reading four languages at once is reading none of them. The locale is a
     prop everywhere it matters, so switching this line switches the board. */
  const ui = adminUi(getDictionary("en"), "en");

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

      <Section
        title="An empty queue, all three of them"
        note="THE THING TO LOOK AT IS WHETHER THESE READ AS THREE THINGS AT A GLANCE. A test can prove they are three different identifiers; it cannot prove they are three different marks. Only one of the three is allowed to be good news: cleared is emerald with a tick, and the other two are neutral, because a queue nothing ever arrived at and a filter that matched nothing are both facts about nothing rather than achievements. Read them at 390 in dark, then in light."
      >
        <div className="grid gap-group md:grid-cols-3">
          {(
            [
              ["cleared", "Nothing is waiting", "Every application that has arrived has been decided."],
              ["never", "No application has arrived", "The first person to apply appears here."],
              ["no-match", "Nothing matched", "No row matches that filter. The queue behind it is unchanged."],
            ] as const
          ).map(([state, title, body]) => (
            <div key={state}>
              <p className="nf-overline mb-inline-tight">
                {state} · {QUEUE_EMPTY_MARK[state].icon}
              </p>
              <ui.QueueEmpty title={title} body={body} state={state} />
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="A money call that is taking too long"
        note="The two states of the clock on withdraw and transfer. At ten seconds the quiet line; at twenty-five the terminal panel. IT OFFERS NO RETRY ON PURPOSE, because neither action takes an idempotency key, so a second submit is a second movement of real money: the long version of that reasoning is on withdraw in lib/wallet/actions.ts. Read the two sentences as somebody who has just asked us to send money to their bank and has been watching a spinner: they assert something about a request that is still in flight, and that is the thing to check."
      >
        <div className="grid gap-group md:grid-cols-2">
          <div className="nf-card p-card">
            <p className="nf-overline mb-inline-tight">slow, withdrawal</p>
            <WaitNotice wait="slow" movement="withdrawal" onDone={() => undefined} />
          </div>
          <div className="nf-card p-card">
            <p className="nf-overline mb-inline-tight">stalled, withdrawal</p>
            <WaitNotice wait="stalled" movement="withdrawal" onDone={() => undefined} />
          </div>
          <div className="nf-card p-card">
            <p className="nf-overline mb-inline-tight">slow, transfer</p>
            <WaitNotice wait="slow" movement="transfer" onDone={() => undefined} />
          </div>
          <div className="nf-card p-card">
            <p className="nf-overline mb-inline-tight">stalled, transfer</p>
            <WaitNotice wait="stalled" movement="transfer" onDone={() => undefined} />
          </div>
        </div>
      </Section>

      <Section
        title="The four spacing values with no rung"
        note="227 spacing utilities in the product sit between two rungs, and these four are 176 of them. Each row shows the value as written between the rung below and the rung above, on the same box at the same width. The question is not whether the scale is tidy, it is whether you can see the middle box differ from the two beside it: if you cannot, 176 call sites should move to the nearest rung and the scale stays six steps at the bottom; if you can, the scale is too coarse there and the product has been telling us so 176 times. The 20px row is the one to look at hardest, because 39 of its 61 uses are card padding and it sits in the only doubled gap in the ladder, 16 to 24."
      >
        <div className="flex flex-col gap-group">
          {OFF_SCALE.map((r) => (
            <div key={r.px}>
              <p className="nf-overline mb-inline-tight">
                {r.px}px, {r.uses} uses, between {r.loPx} and {r.hiPx}
              </p>
              <div className="flex flex-wrap items-start gap-inline">
                {[
                  { label: `${r.lo} (${r.loPx})`, cls: r.lo },
                  { label: `${r.raw} (${r.px})`, cls: r.raw },
                  { label: `${r.hi} (${r.hiPx})`, cls: r.hi },
                ].map((box) => (
                  <div key={box.label} className="text-center">
                    <div className={`nf-card ${box.cls}`}>
                      <div className="h-8 w-16 rounded-[var(--nf-radius-sm)] bg-[var(--nf-brand-tint-2)]" />
                    </div>
                    <p className="mt-inline-tight text-[var(--nf-text-overline)] text-[var(--nf-content-muted)]">
                      {box.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
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
