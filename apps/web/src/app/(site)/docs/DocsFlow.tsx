import { LoopGate } from "@/components/motion/LoopGate";
import { MotionReveal } from "@/components/motion/Reveal";
import type { BrandIconName } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { IconPlate } from "@/components/ui/IconPlate";
import { lineGlyphFor } from "@/design-system/icons/glass-to-line";

/**
 * A FLOW, DRAWN (Track M, the docs pass): the order a thing happens in, as
 * the platform's glass objects joined by a line, with the rule it follows
 * printed underneath.
 *
 * On arrival the steps come in one after another and the line between them
 * draws itself; then, while the diagram is on screen, a small light walks
 * the line from the first step to the last, slowly, so the direction reads
 * without an arrow. Transform and opacity only. Reduced motion, Calm, Off
 * and data saver get the finished drawing, still (docs-motion.css).
 *
 * THE CAPTION IS THE RULE, VERBATIM. Where a flow is about money the caption
 * is a sentence from `lib/money/copy.ts`, passed in by the chapter; the step
 * labels are two or three words each and restate nothing the caption does
 * not already say. From 40rem the steps run across; below it they stack.
 *
 * A step may branch: its `branch` is drawn as two outcomes stacked, which is
 * how one payment dividing at the moment it is made reads.
 */
export type FlowStep = {
  object: BrandIconName;
  label: string;
  /** Two outcomes, stacked, in place of this step. */
  branch?: { object: BrandIconName; label: string }[];
};

export function DocsFlow({ label, steps, caption }: { label: string; steps: FlowStep[]; caption?: string }) {
  return (
    <figure className="nf-flow" aria-label={label}>
      <MotionReveal className="nf-flow__stage">
        <LoopGate className="nf-flow__gate" style={{ "--flow-n": steps.length } as React.CSSProperties}>
          {/* Divs with list roles, not ol and li: the chapter prose styles every
              list inside it (numbers, indents, item margins), and a diagram
              must not inherit a reading list's layout. */}
          <div className="nf-flow__steps" role="list">
            {steps.map((step, i) => (
              <div
                key={`${step.label}-${i}`}
                role="listitem"
                className="nf-flow__step"
                style={{ "--flow-i": i } as React.CSSProperties}
              >
                {step.branch ? (
                  <span className="nf-flow__branch">
                    {step.branch.map((out) => (
                      <span key={out.label} className="nf-flow__node">
                        <IconPlate size="md" className="nf-flow__obj">
                          <UiIcon name={lineGlyphFor(out.object)} size={20} />
                        </IconPlate>
                        <span className="nf-flow__label">{out.label}</span>
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="nf-flow__node">
                    <IconPlate size="md" className="nf-flow__obj">
                      <UiIcon name={lineGlyphFor(step.object)} size={20} />
                    </IconPlate>
                    <span className="nf-flow__label">{step.label}</span>
                  </span>
                )}
              </div>
            ))}
          </div>
          <span className="nf-flow__pulse" aria-hidden="true" />
        </LoopGate>
      </MotionReveal>
      {caption && <figcaption className="nf-flow__caption">{caption}</figcaption>}
    </figure>
  );
}
