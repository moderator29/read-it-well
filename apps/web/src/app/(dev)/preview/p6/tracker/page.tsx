import { Tracker } from "@/components/ui/Tracker";
import { agreementTrack } from "@/components/app/status/tracks";
import { STAY_TRACK_WORDS, agreementStatusLabel, agreementStatusTone } from "@/components/app/agreements/status";

/**
 * THE ONE TRACKER (P6) with sample records drawn the way the agreement page
 * builds them: a rental with Vallo for review, and a stay whose agreement is
 * confirmed (worded without a staff review, D73). Sample events only; the
 * routes read real ones under RLS.
 */
const WORDS = { drawn: "Drawn up", confirmed: "Both confirmed", approved: "Vallo approved", paid: "Paid", sentBack: "Sent back by Vallo", cancelled: "Cancelled" };
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });

function steps(status: string, events: { at: string; action: string }[], stay: boolean) {
  const words = stay ? { ...WORDS, ...STAY_TRACK_WORDS } : WORDS;
  return agreementTrack({ status, events }).map((s) => ({
    key: s.key,
    label: s.state === "failed" ? (status === "rejected" ? words.sentBack : words.cancelled) : words[s.key],
    when: s.at ? when(s.at) : null,
    state: s.state,
  }));
}

const RENTAL = [
  { at: "2026-10-03T09:12:00+01:00", action: "opened" },
  { at: "2026-10-05T16:40:00+01:00", action: "submitted" },
];
const STAY = [
  { at: "2026-10-06T11:02:00+01:00", action: "opened" },
  { at: "2026-10-06T11:20:00+01:00", action: "submitted" },
  { at: "2026-10-06T12:05:00+01:00", action: "approved" },
];

export default function PreviewP6Tracker() {
  return (
    <main id="main" className="min-h-dvh pb-4xl">
      <div className="nf-shell py-section-tight">
        <div className="mx-auto grid max-w-2xl gap-section">
          <div>
            <p className="nf-tracker-place">Two bedroom flat, Yaba · Rental</p>
            <Tracker
              className="mt-inline"
              label="Live status"
              icon="key"
              title={agreementStatusLabel("in_review", "rent")}
              tone={agreementStatusTone("in_review")}
              since={`Sent to Vallo for review · ${when(RENTAL[1]!.at)}`}
              cells={[
                { label: "Next step", value: "Paid" },
                { label: "Your part", value: "No action needed from you" },
              ]}
              steps={steps("in_review", RENTAL, false)}
              timelineLabel="Agreement progress"
              glyphs={{ drawn: "file-text", confirmed: "user-check", approved: "verified", paid: "wallet" }}
            />
          </div>
          <div>
            <p className="nf-tracker-place">Studio, Lekki Phase 1 · Stay</p>
            <Tracker
              className="mt-inline"
              label="Live status"
              icon="bed"
              title={agreementStatusLabel("approved", "stay")}
              tone={agreementStatusTone("approved")}
              since={`Confirmed · ${when(STAY[2]!.at)}`}
              cells={[{ label: "Your part", value: "Pay 180,000 naira" }]}
              steps={steps("approved", STAY, true)}
              timelineLabel="Agreement progress"
              glyphs={{ drawn: "file-text", confirmed: "user-check", approved: "verified", paid: "wallet" }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
