import { getDictionary, type Locale } from "@vallo/i18n";
import { Reveal } from "@/components/site/Reveal";
import { Section, Stack, TYPE } from "@/components/app/Screen";
import { InspectionSheet } from "@/components/app/inspections/InspectionSheet";
import { InspectionsLive } from "@/components/app/inspections/InspectionsLive";
import { readReportsFor } from "@/lib/inspections/report-queries";
import { reportStorageLive } from "@/lib/inspections/report-flag";
import { groupInspections, tagSide } from "@/components/app/inspections/grouping";
import type { InspectionList } from "@/lib/inspections/queries";
import { readListingFacts } from "./inspection-facts";

/**
 * The inspections on Plans: the Property side's diary, in the anatomy of
 * F6A8A482. It was the whole of `/inspections`, which is folded into
 * `/bookings` (V-76) and now redirects there with `?kind=inspection`.
 *
 * A person can be both sides of this table: the flat they rent and the one
 * they let. Both lists are read by the page (so the dated list above and this
 * board agree), each row is tagged with the side it was read from, which
 * decides the controls and whose move it is, and they show as two groups.
 * OPEN is anything still ahead of you; CLOSED is a record.
 *
 * Each inspection is one sheet: the scheduled listing card, the date and
 * party and state row, the ladder, the notes, and the two actions. The first
 * open one arrives expanded; the rest fold to their card. Every sheet sits
 * under an `ix-<id>` anchor so a row in the dated list can land on it.
 *
 * Either read failing makes the board say so: a list that is half true is not
 * a list somebody can act on. `changed` (from `?changed=<id>`, how the thread
 * banner hands over a row just answered there) arrives expanded instead of
 * the first. With nothing to show, the board draws nothing and the page's
 * own empty state speaks.
 */
export async function InspectionsBoard({
  locale,
  asked,
  shown,
  userId,
  changed,
}: {
  locale: Locale;
  asked: InspectionList;
  shown: InspectionList;
  userId: string | null;
  changed: string | null;
}) {
  const t = getDictionary(locale);
  const copy = t.inspectionsPage;
  const readFailed = asked.readFailed || shown.readFailed;
  const groups = groupInspections([
    ...tagSide(asked.inspections, "requester"),
    ...tagSide(shown.inspections, "lister"),
  ]);
  const all = [...groups.open, ...groups.closed];
  if (!readFailed && all.length === 0) return null;

  const [facts, reports] = await Promise.all([
    readListingFacts(
      all.map((row) => row.listingId),
      locale,
    ),
    readReportsFor(all.map((row) => row.id)),
  ]);
  const reportLive = reportStorageLive();
  const expanded = changed ?? groups.open[0]?.id ?? null;

  const sheet = (row: (typeof all)[number]) => (
    <div key={row.id} id={`ix-${row.id}`} className="scroll-mt-16">
      <InspectionSheet
        inspection={row}
        side={row.side}
        facts={facts.get(row.listingId) ?? null}
        report={reports.get(row.id) ?? null}
        reportLive={reportLive}
        locale={locale}
        open={row.id === expanded}
      />
    </div>
  );

  return (
    <section
      id="inspections"
      aria-label={copy.title}
      className="scroll-mt-16"
      data-testid="plans-inspections"
    >
      <InspectionsLive userId={userId} />
      {readFailed ? (
        <p className={`mt-row ${TYPE.body}`} role="status">
          {copy.readFailed}
        </p>
      ) : (
        <Reveal>
          <Stack>
            {groups.open.length > 0 && (
              <Section title={copy.openTitle} description={copy.openDescription}>
                <div className="nf-ix-list">{groups.open.map(sheet)}</div>
              </Section>
            )}
            {groups.closed.length > 0 && (
              <Section title={copy.closedTitle} divided={groups.open.length > 0}>
                <div className="nf-ix-list">{groups.closed.map(sheet)}</div>
              </Section>
            )}
          </Stack>
        </Reveal>
      )}
    </section>
  );
}
