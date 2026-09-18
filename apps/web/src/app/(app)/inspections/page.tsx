import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { PageScene } from "@/components/app/PageScene";
import { Reveal } from "@/components/site/Reveal";
import { EmptyState, Section, Stack, TYPE } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { InspectionRows } from "@/components/app/inspections/InspectionRows";
import { groupInspections, tagSide } from "@/components/app/inspections/grouping";
import {
  readInspectionsForLister,
  readInspectionsForRequester,
} from "@/lib/inspections/queries";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: getDictionary(await getLocale()).inspectionsPage.title,
    robots: { index: false, follow: false },
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * /inspections: the Property side's diary of viewings.
 *
 * The requester's view used to be a section buried on /bookings, and the
 * lister's lived behind the agent console. A person can be both: the flat they
 * rent and the one they let. This reads both lists for the caller, tags each
 * row with the side it was read from (which decides the controls and whose
 * move it is), and shows them as the two groups the founder asked for. OPEN
 * is anything still ahead of you; CLOSED is a record. "Inspected" is what a
 * COMPLETED row is called, because that is the word `InspectionRows` already
 * uses on every other surface.
 *
 * Both reads come back with `readFailed` rather than throwing, and either one
 * failing makes the whole screen say so: a list that is half true is not a
 * list somebody can act on.
 *
 * `?changed=<id>` is how the thread banner hands over a row that was just
 * answered there (pitch 13): the row arrives with the platform's one
 * "something landed" nudge and nothing else on the page moves.
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
  const sideOf = new Map([...groups.open, ...groups.closed].map((row) => [row.id, row.side]));
  const sideFor = (row: { id: string }) => sideOf.get(row.id) ?? "requester";
  const empty = groups.open.length === 0 && groups.closed.length === 0;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="relative">
        <PageScene art="calendar-home" />
        <PageHeader title={copy.title} fallback="/home" />
      </div>

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
          <p className={`mb-block ${TYPE.body}`}>{copy.lede}</p>
          <Stack>
            {groups.open.length > 0 && (
              <Section title={copy.openTitle} description={copy.openDescription}>
                <InspectionRows
                  inspections={groups.open}
                  side="requester"
                  sideFor={sideFor}
                  highlightId={changed}
                  locale={locale}
                />
              </Section>
            )}
            {groups.closed.length > 0 && (
              <Section title={copy.closedTitle} divided={groups.open.length > 0}>
                <InspectionRows
                  inspections={groups.closed}
                  side="requester"
                  sideFor={sideFor}
                  highlightId={changed}
                  locale={locale}
                />
              </Section>
            )}
          </Stack>
        </Reveal>
      )}
    </div>
  );
}
