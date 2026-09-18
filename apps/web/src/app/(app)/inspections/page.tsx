import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { Reveal } from "@/components/site/Reveal";
import { EmptyState, Section, Stack, TYPE } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { InspectionHero, InspectionSheet } from "@/components/app/inspections/InspectionSheet";
import { groupInspections, tagSide } from "@/components/app/inspections/grouping";
import {
  readInspectionsForLister,
  readInspectionsForRequester,
} from "@/lib/inspections/queries";
import { readListingFacts } from "./facts";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: getDictionary(await getLocale()).inspectionsPage.title,
    robots: { index: false, follow: false },
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * /inspections: the Property side's diary of viewings, in the anatomy of
 * F6A8A482.
 *
 * A person can be both sides of this table: the flat they rent and the one
 * they let. This reads both lists for the caller, tags each row with the
 * side it was read from (which decides the controls and whose move it is),
 * and shows them as two groups. OPEN is anything still ahead of you; CLOSED
 * is a record.
 *
 * Each inspection is one sheet: the scheduled listing card, the date and
 * party and state row, the ladder, the notes, and the two actions. The first
 * open one arrives expanded; the rest fold to their card so a diary of nine
 * viewings is nine cards, not nine screens.
 *
 * Both reads come back with `readFailed` rather than throwing, and either one
 * failing makes the whole screen say so: a list that is half true is not a
 * list somebody can act on.
 *
 * `?changed=<id>` is how the thread banner hands over a row that was just
 * answered there: that one arrives expanded instead of the first.
 */
export default async function InspectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ changed?: string | string[] }>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const copy = t.inspectionsPage;
  const params = await searchParams;
  const changedRaw = Array.isArray(params.changed) ? params.changed[0] : params.changed;
  const changed = changedRaw && UUID_RE.test(changedRaw) ? changedRaw : null;

  const [asked, shown] = await Promise.all([
    readInspectionsForRequester(),
    readInspectionsForLister(),
  ]);
  const readFailed = asked.readFailed || shown.readFailed;
  const groups = groupInspections([
    ...tagSide(asked.inspections, "requester"),
    ...tagSide(shown.inspections, "lister"),
  ]);
  const all = [...groups.open, ...groups.closed];
  const facts = await readListingFacts(
    all.map((row) => row.listingId),
    locale,
  );
  const empty = all.length === 0;
  const expanded = changed ?? groups.open[0]?.id ?? null;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={copy.title} fallback="/home" />
      <InspectionHero title="inspection" sub="Check the property, confirm the details, record how it went." />

      {readFailed ? (
        <Reveal>
          <p className={`mt-row ${TYPE.body}`} role="status">
            {copy.readFailed}
          </p>
        </Reveal>
      ) : empty ? (
        <Reveal>
          <EmptyState
            icon="calendar-home"
            title={copy.emptyTitle}
            body={copy.emptyBody}
            action={
              <ButtonLink href="/search" variant="primary" size="lg">
                {copy.emptyAction}
              </ButtonLink>
            }
            data-testid="inspections-empty"
          />
        </Reveal>
      ) : (
        <Reveal>
          <Stack>
            {groups.open.length > 0 && (
              <Section title={copy.openTitle} description={copy.openDescription}>
                <div className="flex flex-col gap-row">
                  {groups.open.map((row) => (
                    <InspectionSheet
                      key={row.id}
                      inspection={row}
                      side={row.side}
                      facts={facts.get(row.listingId) ?? null}
                      locale={locale}
                      open={row.id === expanded}
                    />
                  ))}
                </div>
              </Section>
            )}
            {groups.closed.length > 0 && (
              <Section title={copy.closedTitle} divided={groups.open.length > 0}>
                <div className="flex flex-col gap-row">
                  {groups.closed.map((row) => (
                    <InspectionSheet
                      key={row.id}
                      inspection={row}
                      side={row.side}
                      facts={facts.get(row.listingId) ?? null}
                      locale={locale}
                      open={row.id === expanded}
                    />
                  ))}
                </div>
              </Section>
            )}
          </Stack>
        </Reveal>
      )}
    </div>
  );
}
