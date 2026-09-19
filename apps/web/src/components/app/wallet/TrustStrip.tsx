import type { Dictionary } from "@vallo/i18n";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { TYPE } from "@/components/app/Screen";

/**
 * The trust strip from the foot of the send render (77A54EA3), carrying only
 * what is true. The render pairs an "NDIC insured" badge with a "256 bit
 * encryption" one; this wallet is not a bank deposit and claims no
 * insurance, so the first badge is not drawn. The second is a fact about
 * every request this product makes.
 */
export function TrustStrip({ copy }: { copy: Dictionary["wallet"]["home"] }) {
  return (
    <aside className="nf-card nf-trust" aria-label={copy.trustTitle}>
      <span className="block h-12 w-12 shrink-0" aria-hidden="true">
        <BrandIcon name="shield-check" fill />
      </span>
      {/* The badge sits under the words, not beside them: three fixed things
          across 390px left the sentence reading in a 150px gutter. */}
      <div className="nf-trust__body">
        <p className={TYPE.rowTitle}>{copy.trustTitle}</p>
        <p className={`mt-3xs ${TYPE.rowMeta}`}>{copy.trustBody}</p>
        <span className="nf-trust__badge">
          <UiIcon name="shield-stop" size={16} />
          {copy.trustBadge}
        </span>
      </div>
    </aside>
  );
}
