import type { Metadata } from "next";
import { formatMoney, getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getExamplesConsole, isOverdue, lagosToday } from "@/lib/admin/examples-queries";
import { adminUi, type AdminUi } from "../_components/ui";
import type { ExampleListingView } from "@/lib/admin/examples-queries";
import { RetireExamples } from "./RetireExamples";

export const metadata: Metadata = {
  title: "Examples",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * The example listings, as a set.
 *
 * WHY THIS IS ITS OWN SCREEN. Forty-two seeded properties carry `is_demo` so
 * the catalogue is not empty while the product fills up. `/admin/listings` is a
 * review queue keyed on status, so those forty-two sit inside it looking
 * exactly like real supply, and the word "demo" did not appear anywhere in the
 * admin tree. Two things follow from that, and both are bad: an operator
 * reading the queue cannot tell seeded stock from a real lister's property, and
 * on the day real supply arrives there is no way to take the seeded set off the
 * catalogue short of running SQL.
 *
 * The count at the top is the honest measure of how much of the catalogue is
 * still furniture, which is a number the owner should be able to watch fall.
 */
export default async function AdminExamplesPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const ui = adminUi(t, locale);

  const read = await getExamplesConsole();

  if (read.state !== "ok") {
    return (
      <div className="nf-console">
        <ui.QueueHeader
          title="Examples"
          lede="The seeded properties that keep the catalogue from looking empty."
        />
        <ui.QueueUnavailable />
      </div>
    );
  }

  const { live, retired, totals } = read.data;
  const today = lagosToday();

  return (
    <div className="nf-console">
      <ui.QueueHeader
        title="Examples"
        lede="The seeded properties that keep the catalogue from looking empty while real supply arrives. They are marked in the database, they can never be booked against, and every one of them carries the day it is due to come down."
        count={totals.overdueCount}
      />

      <ui.StatRow>
        <ui.Stat
          label="On the catalogue"
          value={String(totals.liveCount)}
          hint={
            totals.liveCount === 0
              ? "The catalogue is all real supply"
              : `Across ${totals.cities === 1 ? "1 city" : `${totals.cities} cities`}`
          }
          tone={totals.liveCount === 0 ? "success" : "warning"}
        />
        <ui.Stat
          label="Past their date"
          value={String(totals.overdueCount)}
          hint={
            totals.overdueCount === 0
              ? totals.nextDueOn
                ? `Next due ${ui.day(totals.nextDueOn)}`
                : "Nothing is due"
              : "These were meant to be gone"
          }
          tone={totals.overdueCount === 0 ? "success" : "danger"}
        />
        <ui.Stat
          label="Retired"
          value={String(totals.retiredCount)}
          hint="Off the catalogue, rows kept"
        />
      </ui.StatRow>

      {totals.overdueCount > 0 && (
        <ui.QueueAlarm
          title={`${totals.overdueCount === 1 ? "1 example is" : `${totals.overdueCount} examples are`} past the day they were due out`}
          body="The retirement date is a decision that was recorded on each row, and it has passed. Nothing hides these automatically, on purpose: a catalogue that empties itself overnight would take search and the map down with it and give nobody a reason why."
        />
      )}

      <ui.Section
        title="Still on the catalogue"
        hint="Visible to the public in search and on the map."
      >
        {live.length === 0 ? (
          <ui.QueueEmpty
            title="No example is public any more"
            body="Everything a visitor can see is a real listing from a real lister."
          />
        ) : (
          <div className="nf-card">
            <ul className="nf-rows nf-group">
              {live.map((listing) => (
                <ExampleRow
                  key={listing.id}
                  listing={listing}
                  ui={ui}
                  locale={locale}
                  today={today}
                />
              ))}
            </ul>
          </div>
        )}
      </ui.Section>

      <ui.Section title="Retiring them">
        <RetireExamples live={live} />
      </ui.Section>

      {retired.length > 0 && (
        <ui.Section
          title="Already retired"
          hint="Suspended rather than deleted, so any of them can come back if the catalogue thins out."
        >
          <div className="nf-card">
            <ul className="nf-rows nf-group">
              {retired.map((listing) => (
                <ExampleRow
                  key={listing.id}
                  listing={listing}
                  ui={ui}
                  locale={locale}
                  today={today}
                />
              ))}
            </ul>
          </div>
        </ui.Section>
      )}
    </div>
  );
}

function ExampleRow({
  listing,
  ui,
  locale,
  today,
}: {
  listing: ExampleListingView;
  ui: AdminUi;
  locale: Awaited<ReturnType<typeof getLocale>>;
  today: string;
}) {
  /* Only a live example can be overdue. A retired one has already gone, so
     printing "past its date" beside it would be describing a solved problem. */
  const overdue = !listing.retired && isOverdue(listing.retireAfter, today);

  return (
    <li className="nf-row">
      <ui.StatusChip status={listing.status} />
      <span className="min-w-0 flex-1">
        <span className="nf-body block font-semibold text-content">{listing.title}</span>
        <span className="nf-caption block truncate">
          {listing.city ?? "City not recorded"} · {listing.listerName ?? "Lister not on file"}
          {listing.retireAfter && ` · due out ${ui.day(listing.retireAfter)}`}
        </span>
      </span>
      {overdue && <ui.StatusChip label="Past its date" tone="danger" />}
      {listing.amountMinor !== null && (
        <span className="nf-numeric nf-body shrink-0 font-semibold">
          {formatMoney(listing.amountMinor, locale)}
        </span>
      )}
    </li>
  );
}
