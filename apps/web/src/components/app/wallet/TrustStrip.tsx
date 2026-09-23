import type { Dictionary } from "@vallo/i18n";
import { TYPE } from "@/components/app/Screen";
import { MoneyGlyph } from "./MoneyGlyph";

/**
 * A short, true note about what a wallet balance is.
 *
 * This used to carry the send render's trust footer as copy: "Your money is
 * safe", "Encrypted in transit" and a "256-bit TLS" badge. Under the claims
 * rule of 22 September (docs/design/references/roles/README.md) those are
 * statements a render drew, not facts anybody can point at, and they are
 * gone, badge and all. What is left is two sentences the terms and the code
 * support: the balance is a naira record, not a bank deposit
 * (lib/legal/terms.tsx section 15), and a completed send cannot be recalled
 * (no user reversal path exists).
 *
 * The wallet home does not draw it (its render has no such card); the send
 * page draws its own three-line version. It is kept because the older preview
 * harness imports it.
 */
export function TrustStrip({ copy }: { copy: Dictionary["wallet"]["home"] }) {
  return (
    <aside className="nf-card nf-trust" aria-label={copy.trustTitle}>
      <span className="nf-glyph-tile" aria-hidden="true">
        <MoneyGlyph name="shield-check" size={20} />
      </span>
      <div className="nf-trust__body">
        <p className={TYPE.rowTitle}>{copy.trustTitle}</p>
        <p className={`mt-3xs ${TYPE.rowMeta}`}>{copy.trustBody}</p>
      </div>
    </aside>
  );
}
