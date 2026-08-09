import Link from "next/link";
import { formatDate, type Dictionary, type Locale } from "@naijafinds/i18n";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import type { AgentNumbers, ListingStatus } from "@/lib/agent/listings-queries";
import { fill } from "../_copy";
import { ButtonLink } from "@/components/ui/Button";
import { Amount, Figure } from "@/components/ui/Amount";
import { StatusPill, toneForStatus } from "@/components/ui/StatusPill";
import { ICON, Row, RowList, Section, Stack, TYPE } from "@/components/app/Screen";
import { InspectionRows } from "@/components/app/inspections/InspectionRows";
import type { InspectionList } from "@/lib/inspections/queries";
import { isOpen } from "@/lib/inspections/types";

/**
 * The signed-in agent's real dashboard.
 *
 * Live counts, never seeded ones. There is deliberately no month-over-month
 * delta on the figures: the platform has no history to compare against yet,
 * and an invented trend arrow would be a lie dressed as a number.
 *
 * ---------------------------------------------------------------------------
 * ELEVEN SURFACES BECAME FOUR
 * ---------------------------------------------------------------------------
 *
 * This screen was five stat cards, two panels each carrying its own heading
 * INSIDE its own border, and four square quick-action cards: eleven bordered,
 * rounded, shadowed rectangles down one column on a phone, for what is really
 * four groups of related things. The rule is one surface per GROUP, not one
 * per item, and it is most of why the reference platforms' screens read as
 * calm while carrying the same amount.
 *
 * So the five figures are one surface of rows. The listing breakdown is one
 * surface of rows with its heading OUTSIDE it. The stays are rows. The quick
 * actions are rows. Nothing is nested and no heading sits inside a card.
 *
 * ---------------------------------------------------------------------------
 * INSPECTIONS COME FIRST, AND THAT IS THE PRODUCT ARGUMENT
 * ---------------------------------------------------------------------------
 *
 * In this market a viewing is the deal. An annual tenancy is agreed after
 * somebody has stood in the flat; a sale is agreed after somebody has walked
 * the land. Until now the platform could not represent that step at all - it
 * lived as sentences inside a chat thread, which meant an agent with nine
 * properties tracked their most valuable queue by scrolling, and a request
 * that went unanswered for three days looked exactly like one that never
 * arrived.
 *
 * It is therefore the FIRST thing on this screen, above the numbers, and it
 * only appears when there is something waiting. A section that renders an
 * empty state above the figures every day would train an agent to scroll past
 * the one place that costs them money.
 */

const STATUS_ORDER: ListingStatus[] = [
  "PUBLISHED",
  "APPROVED",
  "SUBMITTED",
  "UNDER_REVIEW",
  "MORE_INFO_REQUIRED",
  "DRAFT",
  "REJECTED",
  "SUSPENDED",
];

/** One figure, as a row rather than as a card. */
function FigureRow({
  icon,
  label,
  value,
  href,
}: {
  icon: UiIconName;
  label: string;
  value: React.ReactNode;
  href: string;
}) {
  return (
    <Row className="p-0">
      <Link href={href} className="nf-row nf-row--tap w-full px-3xs">
        <UiIcon name={icon} size={ICON.row} className="shrink-0 text-[var(--nf-content-secondary)]" />
        <span className={`min-w-0 flex-1 ${TYPE.rowTitle}`}>{label}</span>
        <span className="nf-numeric nf-h4 shrink-0 tabular-nums">{value}</span>
        <UiIcon name="chevron-right" size={16} className="shrink-0 text-[var(--nf-content-muted)]" />
      </Link>
    </Row>
  );
}

export function RealDashboard({
  t,
  locale,
  displayName,
  numbers,
  inspections,
}: {
  t: Dictionary;
  locale: Locale;
  displayName: string;
  numbers: AgentNumbers;
  /** What this person has been asked to show. See the header. */
  inspections: InspectionList;
}) {
  const a = t.agent.dashboard;
  const d = t.agentListings.dashboard;
  const quickActions: { icon: UiIconName; label: string; href: string }[] = [
    { icon: "plus", label: a.addListing, href: "/agent/list" },
    { icon: "calendar-booking", label: a.viewBookings, href: "/agent/bookings" },
    { icon: "house", label: a.manageListings, href: "/agent/listings" },
    { icon: "wallet", label: a.earningsReport, href: "/agent/earnings" },
  ];

  const withCounts = STATUS_ORDER.filter((status) => numbers.byStatus[status] > 0);
  const openInspections = inspections.inspections.filter((one) => isOpen(one.state));

  return (
    <>
      <div className="mb-block flex flex-wrap items-end justify-between gap-md">
        <div>
          <h1 className="nf-h1">{a.title}</h1>
          <p className={`mt-row ${TYPE.bodyLg}`}>{fill(d.standing, { name: displayName })}</p>
        </div>
        <ButtonLink href="/agent/list" variant="primary">
          <BrandIcon name="homes-sparkle" size={24} />
          {a.addListing}
        </ButtonLink>
      </div>

      <Stack>
        {/* ------------------------------------------------- inspections */}
        {openInspections.length > 0 && (
          <Section
            title="Inspections waiting on you"
            description="Somebody wanting to see a property is the closest thing to a deal this platform has. They see the same state you do."
            action={
              <Link
                href="/agent/inspections"
                className={`${TYPE.rowMeta} font-semibold text-[var(--nf-content-link)] hover:underline`}
              >
                {t.common.viewAll}
              </Link>
            }
          >
            <InspectionRows
              inspections={openInspections.slice(0, 4)}
              side="lister"
              locale={locale}
            />
          </Section>
        )}

        {/* ------------------------------------------------------ figures */}
        <Section title="Your numbers">
          <RowList boxed inset={false}>
            <FigureRow
              icon="house"
              label={d.liveListings}
              value={<Figure value={numbers.liveListings} locale={locale} />}
              href="/agent/listings"
            />
            <FigureRow
              icon="verified"
              label={d.withReview}
              value={<Figure value={numbers.inReview} locale={locale} />}
              href="/agent/listings"
            />
            <FigureRow
              icon="document"
              label={d.drafts}
              value={<Figure value={numbers.drafts} locale={locale} />}
              href="/agent/listings"
            />
            <FigureRow
              icon="calendar-booking"
              label={d.upcomingStays}
              value={<Figure value={numbers.upcomingBookingCount} locale={locale} />}
              href="/agent/bookings"
            />
            <FigureRow
              icon="chat-bubble"
              label={d.unreadMessages}
              value={<Figure value={numbers.unreadMessages} locale={locale} />}
              href="/agent/messages"
            />
          </RowList>
        </Section>

        {/* --------------------------------------------------- properties */}
        <Section
          title={t.agent.nav.myListings}
          action={
            <Link
              href="/agent/listings"
              className={`${TYPE.rowMeta} font-semibold text-[var(--nf-content-link)] hover:underline`}
            >
              {t.common.viewAll}
            </Link>
          }
        >
          {numbers.totalListings === 0 ? (
            <p className={TYPE.body}>{d.noListings}</p>
          ) : (
            <RowList boxed inset={false}>
              {withCounts.map((status) => (
                <Row key={status}>
                  <span className={`min-w-0 flex-1 ${TYPE.rowTitle}`}>
                    {t.agentListings.workspace.status[status]}
                  </span>
                  <Figure
                    value={numbers.byStatus[status] ?? 0}
                    locale={locale}
                    className="nf-body font-bold"
                  />
                </Row>
              ))}
            </RowList>
          )}
        </Section>

        {/* -------------------------------------------------------- stays */}
        <Section
          title={d.upcomingStays}
          action={
            <Link
              href="/agent/bookings"
              className={`${TYPE.rowMeta} font-semibold text-[var(--nf-content-link)] hover:underline`}
            >
              {t.common.viewAll}
            </Link>
          }
        >
          {numbers.upcomingBookings.length === 0 ? (
            <p className={TYPE.body}>{d.noStays}</p>
          ) : (
            <RowList boxed>
              {numbers.upcomingBookings.map((booking) => (
                <Row key={booking.id}>
                  <span className="nf-role-mark shrink-0" aria-hidden="true">
                    <UiIcon name="calendar-booking" size={ICON.row} />
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className={`block truncate ${TYPE.rowTitle}`}>
                      {booking.listingTitle}
                    </span>
                    <span className={`block ${TYPE.rowMeta}`}>
                      {fill(d.stayDates, {
                        from: formatDate(new Date(`${booking.checkIn}T00:00:00Z`), locale, {
                          day: "numeric",
                          month: "short",
                        }),
                        to: formatDate(new Date(`${booking.checkOut}T00:00:00Z`), locale, {
                          day: "numeric",
                          month: "short",
                        }),
                      })}
                    </span>
                  </span>
                  <span className="shrink-0 text-right leading-tight">
                    <Amount
                      minorUnits={booking.totalMinor}
                      locale={locale}
                      className="nf-body-sm block font-bold"
                    />
                    <StatusPill tone={toneForStatus(booking.status)} className="mt-inline-tight">
                      {booking.status === "CONFIRMED" ? a.confirmed : a.pending}
                    </StatusPill>
                  </span>
                </Row>
              ))}
            </RowList>
          )}
        </Section>

        {/* ------------------------------------------------------ actions */}
        <Section title={a.quickActions}>
          <RowList boxed>
            {quickActions.map((action) => (
              <Row key={action.href} className="p-0">
                <Link href={action.href} className="nf-row nf-row--tap w-full px-3xs">
                  <span className="nf-role-mark shrink-0" aria-hidden="true">
                    <UiIcon name={action.icon} size={ICON.row} />
                  </span>
                  <span className={`min-w-0 flex-1 ${TYPE.rowTitle}`}>{action.label}</span>
                  <UiIcon
                    name="chevron-right"
                    size={16}
                    className="shrink-0 text-[var(--nf-content-muted)]"
                  />
                </Link>
              </Row>
            ))}
          </RowList>
        </Section>
      </Stack>
    </>
  );
}
