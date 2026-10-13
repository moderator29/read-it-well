import { countOf, formatNumber, type Dictionary, type Locale } from "@vallo/i18n/core";
import { fixText } from "@/lib/agent/funnel";
import { proofDate } from "@/lib/trust/proof-strip";
import { fill } from "@/app/agent/_copy";
import { ButtonLink } from "@/components/ui/Button";
import { ListGroup, ListRow } from "@/components/ui/ListGroup";
import { StatusChip, type ChipState } from "@/components/ui/StatusChip";
import { ConfirmAvailable } from "./ConfirmAvailable";
import type { HealthRec, HealthRow, HealthState, ListingHealth } from "./health-model";

/**
 * LISTING HEALTH, DRAWN (feature register J4): the state in one sentence, the
 * six explanations as rows with their chips, and the recommendations with
 * the one control each.
 *
 * Apart from the page so it mounts without a database: the page reads and
 * judges (`readListingHealth`, `listingHealth`), this only draws what it is
 * handed, which is also what lets `HealthReport.dom.test.tsx` put it in a real
 * browser in both themes with axe. Server-safe; the one client island is the
 * "still available" button.
 */
export function HealthReport({
  health,
  listingId,
  t,
  locale,
}: {
  health: ListingHealth;
  listingId: string;
  t: Dictionary;
  locale: Locale;
}) {
  const h = t.experienceFeatures.health;
  return (
    <>
      {/* The state as the record gives it: how many lines say "missing",
          in words, or that nothing does. Not a score. */}
      <p className="nf-h3 mt-lg" data-testid="health-summary">
        {health.missing === 0
          ? h.allInPlace
          : fill(h.toAdd, { things: countOf(health.missing, "things", locale) })}
      </p>

      <ListGroup className="mt-md" label={h.title}>
        {health.rows.map((row) => (
          <ListRow
            key={row.key}
            title={h.rows[row.key].title}
            sub={explain(row, t, locale)}
            status={
              <StatusChip state={CHIP[row.state]} size="xs">
                {h.states[row.state]}
              </StatusChip>
            }
            data-testid={`health-row-${row.key}`}
          />
        ))}
      </ListGroup>

      <section className="mt-lg" aria-labelledby="health-recs">
        <h2 id="health-recs" className="nf-h3">
          {h.recsTitle}
        </h2>
        {health.recommendations.length === 0 ? (
          <p className="nf-body mt-xs text-[var(--nf-content-secondary)]">{h.recsNone}</p>
        ) : (
          <ul className="mt-sm space-y-sm">
            {health.recommendations.map((rec) => (
              <li key={rec.key} className="nf-panel nf-panel--card block p-md" data-testid={`health-rec-${rec.key}`}>
                <Recommendation rec={rec} listingId={listingId} t={t} locale={locale} />
              </li>
            ))}
          </ul>
        )}
        <p className="nf-caption mt-sm max-w-[62ch] text-[var(--nf-content-muted)]">{h.notGiven}</p>
      </section>
    </>
  );
}

/**
 * A state's chip: label, shape and colour together. "In place" takes the
 * finished shape; "missing" the warning one, because it is something to add
 * rather than something that failed; the rest are neutral.
 */
const CHIP: Record<HealthState, ChipState> = {
  present: "success",
  missing: "pending",
  notHeld: "neutral",
  notAsked: "neutral",
  unread: "neutral",
};

/** The row's sentence, from the row's own facts. */
function explain(row: HealthRow, t: Dictionary, locale: Locale): string {
  const r = t.experienceFeatures.health.rows;
  switch (row.key) {
    case "floorPlan":
      return r.floorPlan.notHeld;
    case "amenities":
      return row.state === "present"
        ? fill(r.amenities.present, { count: formatNumber(row.count, locale) })
        : r.amenities.missing;
    case "inspection":
      return row.state === "present" ? fill(r.inspection.present, { date: proofDate(row.at, locale) }) : r.inspection.missing;
    case "photos": {
      const photos = countOf(row.count, "photos", locale);
      if (row.state === "present") return fill(r.photos.present, { photos });
      return row.count < row.min
        ? fill(r.photos.few, { photos, min: formatNumber(row.min, locale) })
        : fill(r.photos.noCover, { photos });
    }
    case "availability":
      if (row.state === "present") return fill(r.availability.present, { date: proofDate(row.at, locale) });
      if (row.state === "missing") {
        return row.at === null
          ? r.availability.never
          : fill(r.availability.missing, { date: proofDate(row.at, locale), limit: formatNumber(row.limit, locale) });
      }
      return row.state === "notAsked" ? r.availability.notAsked : r.availability.unread;
    case "verification": {
      const proof = t.trustVisible.proof;
      const authority =
        row.state === "present"
          ? (row.basis === "ownership" ? proof.ownership : proof.mandate).replace("{date}", proofDate(row.at, locale))
          : r.verification.missing;
      /* The address line is the backed phrase on its own, its date beside
         it, so the claims rule reads the exact words it allows. */
      return row.addressAt ? `${authority} · ${r.verification.address}, ${proofDate(row.addressAt, locale)}` : authority;
    }
  }
}

/** One thing to do, with the one control that does it. */
function Recommendation({
  rec,
  listingId,
  t,
  locale,
}: {
  rec: HealthRec;
  listingId: string;
  t: Dictionary;
  locale: Locale;
}) {
  const r = t.experienceFeatures.health.recs;
  const edit = `/agent/list?id=${listingId}`;
  let title: string;
  let body: string;
  let action: React.ReactNode;

  switch (rec.key) {
    case "photos":
      title = r.photos.title;
      body = rec.noCover
        ? r.photos.cover
        : fill(r.photos.body, { photos: countOf(rec.more, "photos", locale), min: formatNumber(rec.min, locale) });
      action = <ButtonLink href={edit} variant="secondary" size="sm">{r.photos.action}</ButtonLink>;
      break;
    case "verification": {
      const words = rec.route === "mandate" ? r.mandate : r.ownership;
      title = words.title;
      body = words.body;
      action = (
        <ButtonLink
          href={rec.route === "mandate" ? `/agent/listings/${listingId}/mandate` : "/agent/verification"}
          variant="secondary"
          size="sm"
        >
          {words.action}
        </ButtonLink>
      );
      break;
    }
    case "description":
      title = r.description.title;
      body = fill(r.description.body, { words: formatNumber(rec.words, locale), min: formatNumber(rec.min, locale) });
      action = <ButtonLink href={edit} variant="secondary" size="sm">{r.description.action}</ButtonLink>;
      break;
    case "availability":
      title = r.availability.title;
      body = fill(r.availability.body, { limit: formatNumber(rec.limit, locale) });
      action = (
        <ConfirmAvailable
          listingId={listingId}
          label={r.availability.action}
          done={r.availability.done}
          failed={r.availability.failed}
        />
      );
      break;
    case "amenities":
      title = r.amenities.title;
      body = r.amenities.body;
      action = <ButtonLink href={edit} variant="secondary" size="sm">{r.amenities.action}</ButtonLink>;
      break;
    case "funnel":
      title = r.funnel.title;
      body = fixText(t.shape.funnel.fixes[rec.fix.key], rec.fix.values);
      action = (
        <ButtonLink href={`/agent/analytics/listings/${listingId}`} variant="secondary" size="sm">
          {t.experienceFeatures.analytics.week.title}
        </ButtonLink>
      );
      break;
  }

  return (
    <div className="flex flex-col gap-sm sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h3 className="nf-body font-semibold text-[var(--nf-content-primary)]">{title}</h3>
        <p className="nf-body-sm mt-2xs text-[var(--nf-content-secondary)]">{body}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}
