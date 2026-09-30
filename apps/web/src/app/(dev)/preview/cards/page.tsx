import { ShareCardFrame } from "@/components/share/ShareCardFrame";
import { StatusTrack, type TrackStep } from "@/components/app/status/StatusTrack";
import { BookingTrack } from "@/components/app/status/BookingTrack";
import { HeroBand } from "@/components/ui/HeroBand";
import { getDictionary } from "@vallo/i18n";
import {
  agreementTrack,
  applicationTrack,
  ticketTrack,
  viewingTrack,
  type TrackStepModel,
} from "@/components/app/status/tracks";
import { CONFIDENCE_FILL, countFill, ratingFill } from "@/lib/ui/meter";
import { SHARE_CARD_FOOTER } from "@/lib/price-check/disclaimer";

/**
 * THE SHARE CARD AND THE STATUS TRACK, EVERY VARIANT, AGAINST FIXTURES.
 *
 * Every figure below is a fixture and the page says so: this harness is the
 * proof of the LOOK (references 33, 34 and 36), never of any number. The live
 * surfaces feed the same components from stored rows only.
 *
 * `?only=cards` or `?only=tracks` draws one half for a tighter screenshot.
 */

const WHEN: Record<string, string> = {
  "2026-09-01T09:00:00Z": "1 Sep, 10:00",
  "2026-09-01T11:00:00Z": "1 Sep, 12:00",
  "2026-09-01T12:00:00Z": "1 Sep, 13:00",
  "2026-09-02T09:00:00Z": "2 Sep, 10:00",
  "2026-09-02T15:00:00Z": "2 Sep, 16:00",
  "2026-09-03T12:00:00Z": "3 Sep, 13:00",
  "2026-09-04T10:00:00Z": "4 Sep, 11:00",
};

function steps<K extends string>(model: TrackStepModel<K>[], labels: Record<K, string>): TrackStep[] {
  return model.map((step) => ({
    key: step.key,
    label: labels[step.key],
    when: step.at ? (WHEN[step.at] ?? step.at) : null,
    state: step.state,
  }));
}

const AGREEMENT_EVENTS = [
  { at: "2026-09-01T09:00:00Z", action: "opened" },
  { at: "2026-09-01T11:00:00Z", action: "submitted" },
  { at: "2026-09-02T09:00:00Z", action: "approved" },
  { at: "2026-09-02T15:00:00Z", action: "paid" },
];

const AGREEMENT_LABELS = { drawn: "Drawn up", confirmed: "Both confirmed", approved: "Vallo approved", paid: "Paid" };
const VIEWING_LABELS = { asked: "Requested", agreed: "Time agreed", visited: "Inspected", recorded: "Recorded" };

export default async function CardsPreview({
  searchParams,
}: {
  searchParams: Promise<{ only?: string }>;
}) {
  const { only } = await searchParams;
  const cards = only !== "tracks";
  const tracks = only !== "cards";

  return (
    <main id="main" className="mx-auto grid max-w-5xl gap-section p-gutter" data-testid="preview-cards">
      <header>
        <p className="nf-overline">Preview harness</p>
        <h1 className="nf-h2 mt-2xs">Share cards and status tracks</h1>
        <p className="nf-body-sm mt-2xs text-[var(--nf-content-muted)]">
          Example figures throughout. Nothing on this page is a real listing, person or record.
        </p>
      </header>

      {cards && (
        <section className="grid gap-block" aria-label="Share cards">
          <h2 className="nf-h4">Share cards</h2>
          <div className="grid items-start gap-block md:grid-cols-2">
            {/* Reference 33: the plain frame, the meter beside the figure. */}
            <ShareCardFrame
              testId="card-price"
              title="Asking prices"
              chip={{ label: "Example", icon: "sparkle" }}
              figure="₦7.5m to ₦9m"
              figureSize="lg"
              figureUnit="a year"
              meter={{ filled: CONFIDENCE_FILL.high, word: "High", qualifier: "confidence" }}
              checks={[
                { tone: "success", label: "9 listings within 1,500 m" },
                { tone: "success", label: "Most listed in the last 3 months" },
                { tone: "warning", label: "Too few state a size for a price per square metre" },
              ]}
              honest="What similar places nearby are advertised for. Asking prices, not agreed ones."
              stats={[
                { label: "Listings", value: "9" },
                { label: "Radius", value: "1.5 km" },
                { label: "Typical age", value: "2 months" },
              ]}
            />

            {/* Reference 34: the tinted frame, the meter under the figure. */}
            <ShareCardFrame
              testId="card-agent"
              variant="tinted"
              chip={{ label: "Agent record", icon: "sparkle" }}
              info={{ label: "Only reviews from completed stays and lets count here." }}
              title="Average review"
              figure="4.8"
              figureUnit="of 5"
              meter={{ filled: ratingFill(4.8), word: "12 reviews" }}
              honest="From reviews left after completed stays and lets. Not a guarantee of the next one."
              stats={[
                { label: "Reviews", value: "12" },
                { label: "Stays hosted", value: "31" },
                { label: "Reply time", value: "40 mins" },
              ]}
            />

            <ShareCardFrame
              testId="card-count"
              title="Three bedroom flats in Yaba"
              chip={{ label: "Example", icon: "sparkle" }}
              figure="₦3.2m to ₦4.1m"
              figureSize="lg"
              meter={{ filled: countFill(6), word: "6 listings" }}
              honest={SHARE_CARD_FOOTER}
              stats={[
                { label: "Listings", value: "6" },
                { label: "Month", value: "September 2026" },
              ]}
            />

            {/* Too few to say anything: no figure, an empty meter, the word. */}
            <ShareCardFrame
              testId="card-thin"
              title="Asking prices"
              chip={{ label: "Example", icon: "sparkle" }}
              meter={{ filled: 0, word: "Not enough to tell" }}
              checks={[
                { tone: "warning", label: "2 listings nearby, and a card needs 3" },
                { tone: "pending", label: "Widen the area or check again later" },
              ]}
              honest="No figure is shown until there is enough to show one."
              stats={[{ label: "Listings", value: "2" }]}
            />
          </div>
        </section>
      )}

      {tracks && (
        <section className="grid gap-block" aria-label="Status tracks">
          <h2 className="nf-h4">Status tracks</h2>
          {/* Plan item 21: the booking and agreement pages open with the track
              on the hero band. Fixtures, as everything on this page. */}
          <BookingTrack
            status="CONFIRMED"
            checkIn="2099-10-04"
            events={[
              { at: "2026-09-01T09:02:00Z", to: "PENDING" },
              { at: "2026-09-01T09:06:00Z", to: "CONFIRMED" },
            ]}
            copy={getDictionary("en").threads.booking}
            locale="en"
            band={{ title: "Example: Shortlet in Lekki Phase 1", sub: "Sat 4 Oct to Mon 6 Oct" }}
          />
          <HeroBand
            className="nf-status-band"
            label="Live status"
            title="Example: Two bedroom flat in Yaba"
            sub="Rental · With Vallo for review"
            data-testid="track-agreement-band"
          >
            <StatusTrack
              label="Agreement progress"
              steps={steps(agreementTrack({ status: "in_review", events: AGREEMENT_EVENTS.slice(0, 2) }), AGREEMENT_LABELS)}
            />
          </HeroBand>
          <div className="nf-panel nf-panel--card p-card" data-testid="track-booking">
            <StatusTrack
              title="Live status"
              meta="Example"
              label="Booking progress"
              steps={[
                { key: "reserved", label: "Reserved", when: "1 Sep, 10:02", state: "done" },
                { key: "paid", label: "Paid", when: "1 Sep, 10:06", state: "current" },
                { key: "arrival", label: "Arrival day", when: "Sat 4 Oct", state: "upcoming" },
                { key: "completed", label: "Completed", state: "upcoming" },
              ]}
            />
          </div>
          <div className="nf-panel nf-panel--card p-card" data-testid="track-agreement">
            <StatusTrack
              title="Agreement"
              label="Agreement progress"
              steps={steps(agreementTrack({ status: "in_review", events: AGREEMENT_EVENTS.slice(0, 2) }), AGREEMENT_LABELS)}
            />
          </div>
          <div className="nf-panel nf-panel--card p-card" data-testid="track-agreement-rejected">
            <StatusTrack
              title="Agreement, sent back"
              label="Agreement progress"
              steps={steps(
                agreementTrack({
                  status: "rejected",
                  events: [...AGREEMENT_EVENTS.slice(0, 2), { at: "2026-09-02T09:00:00Z", action: "rejected" }],
                }),
                { ...AGREEMENT_LABELS, approved: "Sent back" },
              )}
            />
          </div>
          <div className="grid items-start gap-block md:grid-cols-2">
            <div className="nf-panel nf-panel--card p-card" data-testid="track-application">
              <StatusTrack
                title="Application"
                label="Application progress"
                steps={steps(
                  applicationTrack({ status: "APPROVED", submittedAt: "2026-09-01T09:00:00Z", reviewedAt: "2026-09-03T12:00:00Z" }),
                  { submitted: "Submitted", review: "Under review", decision: "Approved" },
                )}
              />
            </div>
            <div className="nf-panel nf-panel--card p-card" data-testid="track-ticket">
              <StatusTrack
                title="Support"
                label="Support progress"
                steps={steps(
                  ticketTrack({ status: "open", createdAt: "2026-09-01T09:00:00Z", firstStaffReplyAt: "2026-09-01T11:00:00Z", resolvedAt: null }),
                  { filed: "Filed", picked: "Picked up", resolved: "Resolved" },
                )}
              />
            </div>
          </div>
          <div className="nf-panel nf-panel--card p-card" data-testid="track-viewing">
            <StatusTrack
              title="Viewing"
              label="Viewing progress"
              steps={steps(
                viewingTrack({
                  state: "DECLINED",
                  outcome: null,
                  createdAt: "2026-09-01T09:00:00Z",
                  respondedAt: "2026-09-01T12:00:00Z",
                  slotAt: null,
                }),
                { ...VIEWING_LABELS, agreed: "Declined" },
              )}
            />
          </div>
          <div className="nf-panel nf-panel--card p-card" data-testid="track-five">
            <StatusTrack
              title="Five steps"
              meta="Example"
              label="Payout progress"
              steps={[
                { key: "a", label: "Requested", when: "1 Sep", state: "done" },
                { key: "b", label: "Approved", when: "2 Sep", state: "done" },
                { key: "c", label: "Sent to bank", when: "2 Sep", state: "current" },
                { key: "d", label: "Received", state: "upcoming" },
                { key: "e", label: "Receipt filed", state: "upcoming" },
              ]}
            />
          </div>
        </section>
      )}
    </main>
  );
}
