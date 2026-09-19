"use client";

import { useState } from "react";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";

/**
 * The button specimens, and the ruling behind them.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS AT ALL.
 *
 * `scripts/audit/dead-controls.mjs` found four faults in the whole tree outside
 * the dev harness and all four were on this page: three `<Button>` specimens
 * with no `onClick`, no submit type and no enclosing form, one of them carrying
 * `disabled` as a literal. The obvious answer was to teach the sweep that a
 * styleguide is a specimen sheet and exempt the path. That answer was refused,
 * and the reasoning is worth writing down because it will come up again.
 *
 * An exception list is a permanent promise that a whole file will never be
 * checked again. The moment `/styleguide` is excluded, the next person who adds
 * a control here that genuinely should work - a theme switch, a density toggle,
 * a copy button that silently fails - gets no warning from the sweep, forever,
 * to save four lines of work once. And the premise was wrong anyway: a button
 * specimen that cannot be pressed is not a specimen of a button. It is a
 * picture of one. Half of what this primitive is - the press scale, the
 * 8ms haptic pulse, the spinner swapping into the leading slot without the
 * label moving, the disabled opacity - only exists while somebody is pressing
 * it, and none of that was reachable on the page whose entire job is to show
 * what the primitive does.
 *
 * So the specimens got the behaviour they were specimens of.
 *
 * ---------------------------------------------------------------------------
 * WHAT PRESSING ONE DOES.
 *
 * It copies the exact call site that produced it. That is the question a person
 * actually arrives on this page with - "what do I write to get that button" -
 * and until now the answer was to read the source of the styleguide to find out
 * how the styleguide drew it. The pressed specimen also demonstrates itself:
 * the press feedback and the haptic are the primitive's own.
 *
 * ---------------------------------------------------------------------------
 * THE DISABLED SPECIMEN, WHICH IS THE INTERESTING ONE.
 *
 * `disabled` and `loading` are states, not variants, and a frozen picture of
 * each is the weakest way to show a state: you see where it ends up and never
 * what it does. Each now sits beside a real switch that turns it on and off, so
 * the specimen shows the transition - the label dimming, the spinner arriving
 * without the button changing width, the opacity dropping - against the live
 * button next to it. Both switches start ON, because a specimen sheet must
 * still SHOW the two states to somebody who only scrolls past.
 *
 * That also settles the `ALWAYS_DISABLED` finding honestly rather than by
 * exemption: this button is no longer permanently dead, because there is a
 * control beside it that revives it, and the attribute is an expression
 * because the state is genuinely a state.
 */

const BUTTON_VARIANTS: readonly ButtonVariant[] = [
  "primary",
  "secondary",
  "glass",
  "ghost",
  "danger",
  "dangerQuiet",
];

const BUTTON_SIZES: readonly ButtonSize[] = ["sm", "md", "lg"];

/** The call site that produces a given specimen, as a person would type it. */
function snippetFor(variant: ButtonVariant, size: ButtonSize, state?: "loading" | "disabled") {
  const sizeProp = size === "md" ? "" : ` size="${size}"`;
  const stateProp = state ? ` ${state}` : "";
  const label = state === "loading" ? "Working" : state === "disabled" ? "Unavailable" : variant;
  return `<Button variant="${variant}"${sizeProp}${stateProp}>${label}</Button>`;
}

export function ButtonSpecimens() {
  /*
   * The last snippet copied, shown under the gallery rather than in a toast.
   * A toast that vanishes is the wrong shape for something a person is about
   * to paste: they need to be able to look at it, and to see that the press
   * did something at all when the clipboard is refused.
   */
  const [copied, setCopied] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [disabled, setDisabled] = useState(true);

  async function take(snippet: string) {
    setCopied(snippet);
    setFailed(false);
    /* Clipboard access is refused over plain http and in some embedded views.
       The snippet is on screen either way, which is the part that matters. */
    try {
      await navigator.clipboard?.writeText(snippet);
    } catch {
      setFailed(true);
    }
  }

  return (
    <div className="nf-card space-y-heading p-card-sm">
      {BUTTON_SIZES.map((size) => (
        <div key={size}>
          <p className="nf-overline mb-inline">{size}</p>
          <div className="flex flex-wrap items-center gap-row">
            {BUTTON_VARIANTS.map((variant) => (
              <Button
                key={variant}
                variant={variant}
                size={size}
                onClick={() => void take(snippetFor(variant, size))}
              >
                {variant}
              </Button>
            ))}
          </div>
        </div>
      ))}

      <div>
        <p className="nf-overline mb-inline">Loading and disabled</p>
        <div className="flex flex-wrap items-start gap-group">
          <div className="flex flex-col gap-inline">
            <Button
              variant="primary"
              loading={loading}
              onClick={() => void take(snippetFor("primary", "md", "loading"))}
            >
              Working
            </Button>
            <Switch
              checked={loading}
              onCheckedChange={setLoading}
              label="loading"
              description="Spinner in the leading slot, label dimmed, width unchanged."
            />
          </div>

          <div className="flex flex-col gap-inline">
            <Button
              variant="primary"
              disabled={disabled}
              onClick={() => void take(snippetFor("primary", "md", "disabled"))}
            >
              Unavailable
            </Button>
            <Switch
              checked={disabled}
              onCheckedChange={setDisabled}
              label="disabled"
              description="One opacity for every disabled button on the platform."
            />
          </div>
        </div>
      </div>

      {/* The receipt. `aria-live` so a screen reader hears what was copied,
          since the visual change is the only other signal. */}
      <p aria-live="polite" className="nf-caption">
        {copied === null ? (
          "Press any specimen to copy the line that draws it."
        ) : (
          <>
            {failed ? "This browser would not take the clipboard. Here it is: " : "Copied: "}
            <code className="font-semibold text-[var(--nf-content-primary)]">{copied}</code>
          </>
        )}
      </p>
    </div>
  );
}
