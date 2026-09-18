import type { Dictionary } from "@vallo/i18n";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { Button } from "@/components/ui/Button";
import { TYPE } from "@/components/app/Screen";
import type { CryptoFailureReason } from "./client";

type CryptoCopy = Dictionary["crypto"];

/**
 * The three honest states of the market surface, designed rather than
 * blank: the mark on its disc of light, the verdict, the line that says
 * what happens next, and the ghosted shape of the coin cards that arrive
 * when the feed does.
 *
 * `unconfigured` is the resting state until the founder's key lands, and it
 * is the one most people will see first, so it is drawn with the most care.
 * It offers no retry: nothing the reader does changes it. The other two do.
 */
export function CryptoFailure({
  reason,
  copy,
  onRetry,
  ghosts = true,
}: {
  reason: CryptoFailureReason;
  copy: CryptoCopy;
  onRetry?: () => void;
  ghosts?: boolean;
}) {
  const title =
    reason === "unconfigured"
      ? copy.unconfiguredTitle
      : reason === "rate_limited"
        ? copy.rateLimitedTitle
        : copy.upstreamTitle;
  const body =
    reason === "unconfigured"
      ? copy.unconfiguredBody
      : reason === "rate_limited"
        ? copy.rateLimitedBody
        : copy.upstreamBody;

  return (
    <section
      className="nf-card nf-crypto-state"
      role="status"
      aria-live="polite"
      data-testid={`crypto-state-${reason}`}
    >
      <span className="nf-crypto-state__mark">
        <BrandIcon name="chart-growth" fill priority />
      </span>
      <p className={`mt-block max-w-[20ch] [text-wrap:balance] ${TYPE.sectionTitle}`}>{title}</p>
      <p className={`mx-auto mt-row max-w-[38ch] ${TYPE.body}`}>{body}</p>
      {reason !== "unconfigured" && onRetry && (
        <Button type="button" variant="secondary" className="mt-block" onClick={onRetry}>
          {copy.retry}
        </Button>
      )}
      {ghosts && (
        <div className="nf-crypto-ghosts" aria-hidden="true">
          {Array.from({ length: 4 }, (_, i) => (
            <span key={i} className="nf-crypto-ghost" />
          ))}
        </div>
      )}
    </section>
  );
}
