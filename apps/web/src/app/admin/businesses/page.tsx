import type { Metadata } from "next";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { countOf, getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import {
  BUSINESS_RUNGS,
  BUSINESS_STATUSES,
  getBusinessQueue,
  type BusinessQueueRow,
} from "@/lib/admin/business-queries";
import { BUSINESS_LADDER, BUSINESS_TIER_NAME, asBusinessTier } from "@/lib/admin/business-ladder";
import { QUEUE_PAGE_SIZE } from "@/lib/admin/queue-filter";
import { adminUi, type AdminUi } from "../_components/ui";
import {
  QueueFilters,
  QueuePager,
  queueNarrowed,
  readQueueQuery,
  type QueueStatusOption,
} from "../_components/QueueFilters";
import { BusinessReviewDecision, PublishControl, RungDecision } from "./BusinessDecisions";
import { DocumentViewer } from "../_components/DocumentViewer";

export const metadata: Metadata = {
  title: "Businesses",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * The operator desk for hosts: read an application, decide it, record the
 * rungs, and put the venue in front of guests.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS ROUTE DID NOT EXIST UNTIL NOW, WHICH IS THE POINT OF IT.
 *
 * `lib/admin/business-actions.ts` and `lib/admin/business-queries.ts` have
 * been written, commented and complete for two days, and NOTHING IMPORTED
 * EITHER OF THEM. The decisions were all there; the door was missing. So the
 * only way a restaurant could ever reach the shelf was somebody writing SQL by
 * hand, which is exactly what happened to the first first-party venue (ledger
 * 12.5) and is not a process a founder can run while signing a venue.
 *
 * This file is therefore mostly a reading surface. It writes no rules: every
 * decision below is one of the six actions that already existed, and the one
 * new action (`publishRestaurant`) states its own gate in its own header.
 *
 * ---------------------------------------------------------------------------
 * WHAT A REVIEWER IS SHOWN, AND WHY EACH PART EARNS ITS PLACE.
 *
 * The readiness list first, because it is the answer to the only question the
 * reviewer is actually here to settle: can this go live, and if not, what is
 * missing. It separates what BLOCKS publishing from what merely makes the page
 * thin, because those are different conversations with the host and running
 * them together is how a venue waits a week for a photograph nothing requires.
 *
 * Then the application: the representative, the CAC number to compare against
 * the free public search, the bank name the BANK returned beside the names on
 * the paperwork, the three consents as three dated facts, and the documents
 * behind short-lived signed URLs.
 *
 * Then the ladder, and then the decisions.
 *
 * ---------------------------------------------------------------------------
 * THE BADGE. THIS DESK CANNOT LIGHT ONE ON A VENUE NOBODY CHECKED.
 *
 * `businesses.verified` is derived by trigger from the identity rung, so the
 * identity control is the only button in the product that can produce a
 * verified mark. It is disabled while no identity document is on file, and the
 * panel says plainly what the mark does and does not mean today: a restaurant
 * on the business spine shows NO verified mark on its own page under any
 * combination of rungs, because the page and the catalogue projection derive
 * that mark from a different column entirely (ledger 12.6). Recording a rung
 * here is a record about a person, never a decoration on a listing, and
 * nothing on this screen should be read as promising the host a badge.
 */

/** The four rungs in ladder order, with the ladder's own words. */
const RUNGS = BUSINESS_RUNGS.map((rung) => ({
  rung,
  label: BUSINESS_LADDER[rung].label,
  /** What the reviewer actually does to settle this rung. The ladder's words. */
  meaning: BUSINESS_LADDER[rung].reviewerDoes,
}));

const LEDE =
  "Host applications, the four verification rungs, and the decision that puts a venue in front of guests. A refusal and a change request carry your words to the host exactly as you type them.";

const STATUS_FILTERS = (ui: AdminUi): readonly QueueStatusOption[] =>
  BUSINESS_STATUSES.map((value) => ({ value, label: ui.statusLabel(value) }));

type Check = { label: string; pass: boolean; detail: string };

/**
 * What this venue has, split into what stops it going live and what does not.
 *
 * The blocking half is `publishRestaurant`'s gate, restated in the reviewer's
 * words so the screen and the server cannot quietly disagree about what is
 * required. The second half is everything the page reads to be a real place
 * rather than a directory entry: none of it blocks, all of it is worth a
 * telephone call.
 */
function restaurantChecks(row: BusinessQueueRow): { blocking: Check[]; thin: Check[] } {
  const windows = row.restaurant?.windowCount ?? 0;
  const cuisines = row.restaurant?.cuisineCount ?? 0;
  return {
    blocking: [
      {
        label: "A service with hours and a guest number",
        pass: windows > 0,
        detail:
          windows > 0
            ? `${countOf(windows, "serviceWindows")} on record. Every one of them seats guests, because the column refuses a zero.`
            : "None. Every request for a table would be refused with 'that restaurant does not seat guests at that time', and the owner would watch a page that looks fine take no bookings.",
      },
      {
        label: "A city and a state",
        pass: Boolean(row.city && row.stateCode),
        detail:
          row.city && row.stateCode
            ? [row.area, row.city, row.stateCode].filter(Boolean).join(", ")
            : "Missing. Every shelf in the product finds a venue by its city and state, so this one would be live and unreachable.",
      },
      {
        label: "A phone number somebody answers",
        pass: Boolean(row.phone),
        detail: row.phone
          ? row.phone
          : "Missing. When the app is not enough, a late guest or a grown party has no way to reach the venue.",
      },
      {
        label: "First party, and not an example",
        pass: row.kind === "restaurant",
        detail:
          row.kind === "restaurant"
            ? "A restaurant on the first-party queue. The table trigger accepts this venue's spine."
            : "This row is not a restaurant, so it goes live from its property rather than from here.",
      },
    ],
    thin: [
      {
        label: "A price band",
        pass: (row.restaurant?.priceBand ?? 0) > 0,
        detail:
          (row.restaurant?.priceBand ?? 0) > 0
            ? `Band ${row.restaurant?.priceBand} of 4. A band, never an amount per head the venue would have to honour.`
            : "Not set. The application asks for it, so a venue without one was created by hand.",
      },
      {
        label: "What they serve",
        pass: cuisines > 0,
        detail:
          cuisines > 0
            ? `${countOf(cuisines, "cuisines")}. The first shows on the fact strip, the rest become tags.`
            : "None. The venue's fact strip renders empty, which reads as a record nobody finished.",
      },
      {
        label: "Photographs of the venue",
        pass: row.photoCount > 0,
        detail:
          row.photoCount > 0
            ? `${row.photoCount} on record, cover first.`
            : "None. The page draws a Vallo category plate under a 'No photographs yet' chip, so nobody is misled, and the owner's own pictures are worth chasing in the first week.",
      },
    ],
  };
}

export default async function AdminBusinessesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const common = t.admin.common;
  const ui = adminUi(t, locale);

  const params = await searchParams;
  const query = readQueueQuery(params);
  const narrowed = queueNarrowed(query);
  const queue = await getBusinessQueue({
    ...(query.q ? { q: query.q } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.from ? { from: query.from } : {}),
    ...(query.to ? { to: query.to } : {}),
    ...(query.offset ? { offset: query.offset } : {}),
  });

  if (queue.state !== "ok") {
    return (
      <div className="nf-console">
        <ui.QueueHeader title="Businesses" lede={LEDE} />
        <ui.QueueUnavailable />
      </div>
    );
  }

  const { rows, full, waitingCount } = queue.data;

  return (
    <div className="nf-console">
      <ui.QueueHeader title="Businesses" lede={LEDE} count={waitingCount} />

      <QueueFilters
        base="/admin/businesses"
        query={query}
        common={common}
        statuses={STATUS_FILTERS(ui)}
        searchPlaceholder="Search by name or city"
      />

      {rows.length === 0 ? (
        narrowed ? (
          <ui.QueueEmpty title={common.noMatchTitle} body={common.noMatchBody} state="no-match" />
        ) : (
          <ui.QueueEmpty
            title="No applications yet"
            body="A host who sends an application from the host wizard appears here straight away, with their papers, their hours and their bank name."
            everHadRows={false}
          />
        )
      ) : (
        <ul className="nf-queue-list">
          {rows.map((row) => (
            <BusinessCard key={row.id} row={row} ui={ui} />
          ))}
        </ul>
      )}

      <QueuePager
        base="/admin/businesses"
        query={query}
        pageSize={QUEUE_PAGE_SIZE}
        full={full}
        count={rows.length}
      />
    </div>
  );
}

/** One application, in full. Exported so the preview harness can draw it. */
export function BusinessCard({ row, ui }: { row: BusinessQueueRow; ui: AdminUi }) {
  const isRestaurant = row.kind === "restaurant";
  const checks = restaurantChecks(row);
  const blocked = checks.blocking.filter((check) => !check.pass).length;
  const decidable = row.status !== "PUBLISHED" && row.status !== "REJECTED";
  const publishable = isRestaurant && row.status === "APPROVED";
  const hasIdentityDocument = row.documents.some((doc) => doc.kind === "identity");
  const tier = asBusinessTier(row.verificationTier);
  const decided = new Map(row.rungs.map((rung) => [rung.rung, rung]));

  return (
    <li className="nf-panel nf-panel--card nf-admin-card p-card sm:p-card-lg">
      <div className="flex flex-wrap items-center gap-inline">
        <ui.StatusChip status={row.status} />
        <ui.StatusChip label={ui.columnLabel("businessKind", row.kind)} tone="neutral" />
        {blocked > 0 && isRestaurant && (
          <ui.StatusChip
            label={countOf(blocked, "thingsStopLive")}
            tone="warning"
          />
        )}
        <span className="nf-overline ml-auto">
          {row.submittedAt ? `Sent ${ui.when(row.submittedAt)}` : `Started ${ui.when(row.createdAt)}`}
        </span>
      </div>

      <h3 className="nf-h4 mt-row">{row.name}</h3>
      <p className="nf-caption mt-inline-tight">
        {[row.area, row.city, row.stateCode].filter(Boolean).join(", ") || "No place on record"}
        {" · "}
        {/* THE LADDER'S OWN WORD FOR TIER 0 IS "Approved", which is right on a
            host's status page and reads as a contradiction here, beside a chip
            that says SUBMITTED. A venue with no rung recorded is told so
            plainly instead. */}
        {tier === 0
          ? "No rung recorded yet"
          : `Level ${tier} of 4, ${BUSINESS_TIER_NAME[tier].toLowerCase()}`}
      </p>

      {isRestaurant && (
        <>
          <ui.DetailSection title="Before it can go live">
            <ul className="mt-inline">
              {checks.blocking.map((check) => (
                <ui.CheckRow
                  key={check.label}
                  label={check.label}
                  pass={check.pass}
                  detail={check.detail}
                />
              ))}
            </ul>
          </ui.DetailSection>

          <ui.DetailSection title="Worth chasing, but nothing waits on it">
            <ul className="mt-inline">
              {checks.thin.map((check) => (
                <ui.CheckRow
                  key={check.label}
                  label={check.label}
                  pass={check.pass}
                  detail={check.detail}
                />
              ))}
            </ul>
          </ui.DetailSection>
        </>
      )}

      {row.properties.length > 0 && (
        <ui.DetailSection title="Properties">
          {row.properties.map((property) => (
            <div key={property.id} className="border-t border-[var(--nf-brand-edge-soft)] py-row">
              <div className="flex flex-wrap items-center gap-inline">
                <span className="nf-body font-semibold text-content">{property.name}</span>
                <ui.StatusChip status={property.status} />
              </div>
              <p className="nf-caption mt-inline-tight">
                {property.hasPin ? "Pin set" : "No pin"} · {countOf(property.photoCount, "photos")} ·{" "}
                {countOf(property.roomTypeCount, "roomTypes")} · {countOf(property.ratePlanCount, "ratePlans")}
              </p>
              {/*
                THE PICTURES, NOT A COUNT OF THEM. The property desk has shown
                a reviewer every photograph on a listing since it was built and
                this desk showed a number, which is backwards: a stay is sold
                almost entirely on its pictures, and the reviewer is the last
                person who can see that the room photographed is not the room
                described. A count was all that could honestly be drawn while
                nothing in the product could upload one, and that is no longer
                true.

                Public bucket URLs, as on the property desk, so `next/image`
                can size them: a reviewer opening a hotel should not be pulling
                ten full size uploads down a strip of 128px thumbnails.
              */}
              {property.photos.length > 0 && (
                <ul className="mt-inline flex gap-inline overflow-x-auto pb-2xs">
                  {property.photos.map((photo, index) => (
                    <li key={photo} className="shrink-0">
                      <RemoteImage
                        src={photo}
                        alt={
                          index === 0
                            ? `${property.name}, the photograph guests see first`
                            : `${property.name}, photograph ${index + 1}`
                        }
                        loading="lazy"
                        width={128}
                        height={96}
                        sizes="128px"
                        className="h-24 w-32 rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] object-cover"
                      />
                    </li>
                  ))}
                </ul>
              )}
              {property.status === "APPROVED" || property.status === "DRAFT" ? (
                <PublishControl
                  target={{ kind: "property", accommodationId: property.id }}
                  label={property.name}
                />
              ) : null}
            </div>
          ))}
        </ui.DetailSection>
      )}

      <ui.DetailSection title="The application">
        <ui.DetailRow label="Representative" value={row.representativeName} />
        <ui.DetailRow label="Their phone" value={row.representativePhone} />
        <ui.DetailRow label="Account" value={row.ownerName} />
        <ui.DetailRow label="Business phone" value={row.phone} />
        <ui.DetailRow label="Business email" value={row.email} />
        <ui.DetailRow label="Address" value={row.address} />
        <ui.DetailRow label="Registered name" value={row.registeredName} />
        <ui.DetailRow label="CAC number" value={row.cacNumber} />
        <ui.DetailRow label="Tax id" value={row.tin} />
        <ui.DetailRow
          label="Bank name returned"
          value={
            row.payoutName ? (
              <>
                {row.payoutName}
                {row.payoutBank ? `, ${row.payoutBank}` : ""}
                {row.payoutNameMismatch && (
                  <span className="mt-inline-tight block text-[var(--nf-state-warning)]">
                    Shares no word with the representative or the registered name. A prompt to
                    look, never a refusal: people bank under names that do not match their
                    paperwork for honest reasons.
                  </span>
                )}
              </>
            ) : null
          }
        />
        <ui.DetailRow
          label="Hygiene attestation"
          value={
            row.hygieneAttestedAt
              ? `Stated ${ui.when(row.hygieneAttestedAt)} by ${row.representativeName ?? "the representative"}`
              : null
          }
        />
        <ui.DetailRow
          label="Licence attestation"
          value={row.licenceAttestedAt ? `Stated ${ui.when(row.licenceAttestedAt)}` : null}
        />
        <ui.DetailRow
          label="Permissions"
          value={
            Object.keys(row.consents).length === 0 ? null : (
              <ul>
                {Object.entries(row.consents).map(([id, at]) => (
                  <li key={id} className="nf-caption">
                    {CONSENT_WORDS[id] ?? id}: {ui.when(at)}
                  </li>
                ))}
              </ul>
            )
          }
        />
        {row.reviewNotes && <ui.DetailRow label="Last note sent" value={row.reviewNotes} />}
        {row.reviewedAt && <ui.DetailRow label="Last decided" value={ui.when(row.reviewedAt)} />}
      </ui.DetailSection>

      <ui.DetailSection title="Papers">
        {row.documents.length === 0 ? (
          <p className="nf-caption">Nothing uploaded.</p>
        ) : (
          row.documents.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-wrap items-center gap-inline border-t border-[var(--nf-brand-edge-soft)] py-row"
            >
              <span className="nf-body-sm font-semibold text-content">
                {DOCUMENT_WORDS[doc.kind] ?? doc.kind}
              </span>
              <span className="nf-overline">{ui.when(doc.uploadedAt)}</span>
              {/* Opened in place: this was a signed Supabase URL in a
                  `target="_blank"` anchor, which read a driving licence on
                  somebody else's origin. */}
              <DocumentViewer
                documentId={doc.id}
                media={doc.media}
                label="Open the file"
                title={DOCUMENT_WORDS[doc.kind] ?? doc.kind}
                className="nf-caption ml-auto font-semibold underline"
              />
            </div>
          ))
        )}
      </ui.DetailSection>

      {/* Every row on this queue is first party: `getBusinessQueue` filters on
          it, and a partner venue carries no ladder because the ladder is a
          record about a human being that Vallo checked. */}
      {(
        <ui.DetailSection title="The verification ladder">
          <p className="nf-caption">
            One rung, one decision, one row. The level is the rungs passed with no gap below them
            and is computed by the database, never typed. The identity rung is the only thing in
            the product that means a human was checked, and a restaurant on this spine still shows
            no mark of any kind on its own page, so nothing here should be described to a host as
            a badge.
          </p>
          {RUNGS.map(({ rung, label, meaning }) => {
            const already = decided.get(rung);
            return (
              <div key={rung} className="border-t border-[var(--nf-brand-edge-soft)] py-row">
                <div className="flex flex-wrap items-center gap-inline">
                  <span className="nf-body font-semibold text-content">{label}</span>
                  {already && (
                    <ui.StatusChip
                      label={already.status === "passed" ? "Passed" : "Did not pass"}
                      tone={already.status === "passed" ? "success" : "danger"}
                    />
                  )}
                </div>
                <p className="nf-caption mt-inline-tight">{meaning}</p>
                {already && (
                  <p className="nf-caption mt-inline-tight">
                    {ui.when(already.decidedAt)}
                    {already.reviewerName ? ` by ${already.reviewerName}` : ""}
                    {already.note ? ` · ${already.note}` : ""}
                  </p>
                )}
                <RungDecision
                  businessId={row.id}
                  rung={rung}
                  label={label}
                  evidenced={rung !== "identity" || hasIdentityDocument}
                  missingEvidence={
                    rung === "identity"
                      ? "No identity document is on file, so there is nothing to check a person against. This rung is what the verified mark is derived from, and it cannot be recorded on nothing."
                      : undefined
                  }
                />
              </div>
            );
          })}
        </ui.DetailSection>
      )}

      {publishable && (
        <PublishControl target={{ kind: "restaurant", businessId: row.id }} label={row.name} />
      )}

      {decidable ? (
        <BusinessReviewDecision businessId={row.id} name={row.name} />
      ) : (
        <p className="nf-overline mt-group">
          {row.status === "PUBLISHED"
            ? "Live, and taking tables."
            : "Closed."}{" "}
          Every decision is in the audit log.
        </p>
      )}
    </li>
  );
}

/** The three consents, named for a reader. Keys are `businesses.consents`. */
const CONSENT_WORDS: Record<string, string> = {
  accuracy: "The documents are genuine and the details accurate",
  terms: "Host terms and the privacy policy",
  processing: "Identity and fraud checks",
};

/** `business_documents.kind`, named for a reader rather than printed raw. */
const DOCUMENT_WORDS: Record<string, string> = {
  identity: "Government issued ID",
  registration: "CAC certificate",
  association: "Authority to act for the business",
  licence: "State hospitality licence",
  hygiene: "Health permit",
};
