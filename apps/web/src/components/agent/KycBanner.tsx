import Link from "next/link";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { ICON, TYPE } from "@/components/app/Screen";
import type { KycStanding } from "@/lib/agent/kyc-standing";

/**
 * Where you stand with us, at the top of the workspace.
 *
 * ---------------------------------------------------------------------------
 * THE SENTENCE THIS EXISTS TO SAY: YOU CAN LIST NOW, AND THE TICK COMES LATER.
 *
 * Those are two separate facts and both have to be said in the same breath,
 * because each one alone misleads. "You are not verified" on its own reads as a
 * door that is shut, and an agent who believes their listings are not live will
 * stop listing. "You can list" on its own leaves them expecting a badge that is
 * not going to appear for two working days, and the first thing they will do is
 * look at their own property, see no tick, and conclude we are broken.
 *
 * That second failure is not hypothetical. The tick on a listing is now gated
 * on the agent's identity check rather than handed out at publish time, which
 * is correct and which means there is now a real gap between listing and being
 * badged. This banner is the thing that explains the gap. Shipping the gate
 * without it would have been a worse product than the bug it fixes.
 *
 * ---------------------------------------------------------------------------
 * ONE ROW, NOT A CARD, AND NEVER A MODAL.
 *
 * Standing information about an account, not an event, and it sits on every
 * visit for as long as it is true. A card would make it an object competing
 * with the numbers underneath; a modal would make somebody dismiss the same
 * sentence every morning. It is one bordered row: a rule down the leading edge,
 * a glyph, the copy, one link.
 *
 * NO DISMISS CONTROL, deliberately. A banner somebody can close is a banner
 * that stops being true without anything changing, and what this describes only
 * stops being true when a reviewer decides something.
 *
 * ---------------------------------------------------------------------------
 * IT RENDERS NOTHING FOR A VERIFIED AGENT. The tick on their listings is the
 * message, and a workspace that keeps talking about verification after it is
 * finished is one that never stops asking for something.
 */

type Tone = "brand" | "info" | "warning";

const COPY: Record<
  Exclude<KycStanding["state"], "verified">,
  { icon: UiIconName; tone: Tone; title: string; body: string; action: string }
> = {
  none: {
    icon: "verified",
    tone: "brand",
    title: "Get the verified tick",
    body:
      "You can list and take enquiries right now. The tick appears on your properties once a person here has checked your documents, which usually takes about two working days.",
    action: "Start verification",
  },
  pending: {
    icon: "history",
    tone: "info",
    title: "Verification in review",
    body:
      "Your documents are with us. Keep listing in the meantime: your properties are live and searchable, and the tick appears on all of them at once when the check clears.",
    action: "See what is outstanding",
  },
  failed: {
    icon: "info",
    tone: "warning",
    title: "Something needs fixing",
    body:
      "One of your checks did not pass, so the tick is on hold. Your listings are unaffected and stay live while you sort it out.",
    action: "See what to send",
  },
};

/* The rule and the wash, per state. Both halves of each pair come from the same
   token family, so a theme change moves them together and neither can end up
   tinting a surface it is not legible on. */
const TONE_CLASS: Record<Tone, string> = {
  brand: "border-[var(--nf-border-brand)] bg-[var(--nf-glass-fill-thin)] text-[var(--nf-brand-secondary)]",
  info: "border-[var(--nf-state-info)] bg-[var(--nf-state-info-surface)] text-[var(--nf-state-info)]",
  warning:
    "border-[var(--nf-state-warning)] bg-[var(--nf-state-warning-surface)] text-[var(--nf-state-warning)]",
};

export function KycBanner({ standing }: { standing: KycStanding }) {
  if (standing.state === "verified") return null;
  const copy = COPY[standing.state];

  return (
    <div
      data-testid="kyc-banner"
      data-state={standing.state}
      className={`flex items-start gap-group rounded-[var(--nf-radius-md)] border-l-[3px] p-card-sm ${TONE_CLASS[copy.tone]}`}
    >
      <UiIcon name={copy.icon} size={ICON.row} className="mt-3xs shrink-0" />
      <div className="min-w-0 flex-1">
        <p className={TYPE.rowTitle}>{copy.title}</p>
        <p className={`mt-inline-tight max-w-[62ch] ${TYPE.rowMeta}`}>{copy.body}</p>
        {/*
          The reviewer's own words, when there are any, and never paraphrased.
          A failed check with a reason is something an agent can act on this
          afternoon; a failed check without one is a locked door. That is the
          finding that produced the verification page, and it applies here.
        */}
        {standing.state === "failed" && standing.reason ? (
          <p className={`mt-inline-tight max-w-[62ch] italic ${TYPE.rowMeta}`}>
            &ldquo;{standing.reason}&rdquo;
          </p>
        ) : null}
        <Link
          href="/verification"
          className="mt-inline inline-flex items-center gap-inline-tight text-[0.875rem] font-semibold text-[var(--nf-content-link)]"
        >
          {copy.action}
          <UiIcon name="chevron-right" size={ICON.inline} />
        </Link>
      </div>
    </div>
  );
}
