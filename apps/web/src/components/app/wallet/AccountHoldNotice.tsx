import type { Locale, Dictionary } from "@vallo/i18n";
import { IconPlate, ICON_PLATE_GLYPH } from "@/components/ui/IconPlate";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { formatHoldUntil, type AccountHold } from "@/lib/security/account-hold";

/**
 * THE HOLD, VISIBLE ON THE WALLET. V-19.
 *
 * A row in the audit's `account_money_holds` (placed by "this was not me",
 * or by a support-assisted email change) stops money leaving the wallet by
 * any route, and payout accounts from changing, until it ends. A hold nobody
 * can see is a bug report waiting to happen, so the wallet says it at the
 * top, with the end time in Lagos and the weekday named, why, and the one
 * thing that still works: money arriving.
 *
 * Drawn only for a hold that was read and is in force. An unreadable hold
 * (`unknown`) draws nothing: the trigger still enforces it, and a banner
 * guessing at a hold would be a sentence the code cannot prove.
 *
 * Cyan (the attention family) on a pending plate, with a shield glyph and the
 * words, so colour is never the only signal.
 */
export function AccountHoldNotice({
  hold,
  locale,
  copy,
}: {
  hold: AccountHold;
  locale: Locale;
  copy: Dictionary["platform"]["hold"];
}) {
  if (hold.state !== "held") return null;
  const until = formatHoldUntil(hold.until, locale);
  if (!until) return null;
  return (
    <div
      role="status"
      data-testid="account-hold-notice"
      className="nf-panel nf-panel--card mb-block flex items-start gap-inline p-card"
    >
      <IconPlate size="md" tone="pending">
        <UiIcon name="shield-stop" size={ICON_PLATE_GLYPH.md} />
      </IconPlate>
      <div className="min-w-0">
        <p className="nf-body font-semibold text-content">{copy.title}</p>
        <p className="nf-body-sm mt-row text-content-2">{(hold.reason === "not_me" ? copy.bodyNotMe : hold.reason === "staff" ? copy.bodyPlain : copy.bodyOther).replace("{until}", until)}</p>
      </div>
    </div>
  );
}
