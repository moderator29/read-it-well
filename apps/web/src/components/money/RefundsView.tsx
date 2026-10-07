import type { Locale } from "@vallo/i18n/core";
import type { HistoryEntry } from "@/lib/money/history-model";
import { refundEntries } from "@/lib/money/vault";
import { PROTECTED_LABEL, RAIL_COPY, REFUNDS_EMPTY_BODY, REFUNDS_EMPTY_TITLE, REFUNDS_HOW_BODY, REFUNDS_HOW_TITLE, REFUNDS_LEDE, REFUNDS_SCOPE } from "@/lib/money/copy";
import { railIsLive } from "@/lib/money/rails";
import { ListGroup, ListRow } from "@/components/ui/ListGroup";
import { IconPlate, ICON_PLATE_GLYPH } from "@/components/ui/IconPlate";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { TYPE } from "@/components/app/Screen";
import { HistoryList } from "@/components/app/money-history/HistoryList";
import { HistoryEmpty } from "@/components/app/money-history/HistoryStates";

/**
 * /refunds once the read answered, as one component the route and the
 * preview harness (`/preview/p5/refunds`) both draw. Server-safe.
 */
export function RefundsView({
  entries,
  nextBefore,
  before,
  locale,
}: {
  /** The page's payment history; the refunds are picked from it here. */
  entries: HistoryEntry[];
  nextBefore: string | null;
  before: string | null;
  locale: Locale;
}) {
  const refunds = refundEntries(entries);
  const protectedLive = railIsLive("protected");
  return (
    <div className="mt-inline space-y-block">
      <p className={TYPE.body}>{REFUNDS_LEDE}</p>
      {refunds.length === 0 && !nextBefore && !before ? (
        <HistoryEmpty title={REFUNDS_EMPTY_TITLE} body={REFUNDS_EMPTY_BODY} next={{ href: "/bookings", label: "See your bookings" }} />
      ) : (
        <>
          <p className={TYPE.rowMeta}>{REFUNDS_SCOPE}</p>
          <HistoryList
            entries={refunds}
            nextBefore={nextBefore}
            basePath="/refunds"
            paged={before !== null}
            locale={locale}
            heading="Your refunds"
            linkToBooking
          />
        </>
      )}
      {/* How a refund is asked for, then where it goes, branched by rail:
          the direct rail's route always (it is the live one), the protected
          rail's only once that rail is live (lib/money/rails.ts). */}
      <ListGroup label={REFUNDS_HOW_TITLE} labelAs="h2">
        <ListRow
          leading={
            <IconPlate size="sm">
              <UiIcon name="file-check" size={ICON_PLATE_GLYPH.sm} />
            </IconPlate>
          }
          title="From the booking"
          sub={REFUNDS_HOW_BODY}
        />
        <ListRow
          leading={
            <IconPlate size="sm">
              <UiIcon name="credit-card" size={ICON_PLATE_GLYPH.sm} />
            </IconPlate>
          }
          title={protectedLive ? "Paid directly" : "Where it goes"}
          sub={RAIL_COPY.direct.refund}
          data-testid="refund-route-direct"
        />
        {protectedLive ? (
          <ListRow
            leading={
              <IconPlate size="sm" tone="info">
                <UiIcon name="shield-lock" size={ICON_PLATE_GLYPH.sm} />
              </IconPlate>
            }
            title={PROTECTED_LABEL}
            sub={RAIL_COPY.protected.refund}
            data-testid="refund-route-protected"
          />
        ) : null}
      </ListGroup>
    </div>
  );
}
