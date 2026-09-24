import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { ResultScreen } from "@/components/app/ResultSheet";
import { getLocale } from "@/lib/locale";
import { readSafetyShareByToken } from "@/lib/doors/queries";
import { SafetySharePanel } from "./SafetySharePanel";

/**
 * V-62. THE PAGE A RENTER'S TRUSTED CONTACT OPENS. A public door.
 *
 * The renter sent this link from their own phone, to somebody they trust,
 * before going to an inspection alone. It says who they are with, in which
 * AREA, from when and until when, and whether they have tapped "I'm done".
 * Never the address, never a landmark, never the listing or its price: the
 * page is safe to forward, and says so. Half an hour past the time they
 * expected to be back with no check-in, it says that plainly and gives 112.
 *
 * Open (`proxy.ts`, segment `safe`), never indexed, never referred, and it
 * closes four hours after the slot.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return {
    title: t.trustDoors.safetyShare.metaTitle,
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

export default async function SafetySharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const locale = await getLocale();
  const copy = getDictionary(locale).trustDoors.safetyShare;
  const view = await readSafetyShareByToken(token);

  if (view.state !== "live") {
    const words =
      view.state === "expired"
        ? { title: copy.expiredTitle, body: copy.expiredBody }
        : view.state === "cancelled"
          ? { title: copy.cancelledTitle, body: copy.cancelledBody }
          : view.state === "moved"
            ? { title: copy.movedTitle, body: copy.movedBody }
            : view.state === "stopped"
              ? { title: copy.stoppedTitle, body: copy.stoppedBody }
              : view.state === "failed"
                ? { title: copy.failedTitle, body: copy.failedBody }
                : { title: copy.unknownTitle, body: copy.unknownBody };
    /* V-62 review: a lister closing or moving the inspection must not quieten
       this page while the renter has not checked in. */
    const stillOut = (view.state === "cancelled" || view.state === "moved") && !view.checkedIn;
    return (
      <Frame>
        <ResultScreen
          state={view.state === "failed" ? "failed" : view.state === "unknown" ? "pending" : "expired"}
          verdict={words.title}
          consequence={words.body}
          data-testid={`safety-${view.state}`}
        />
        {stillOut && (
          <div role="status" className="mx-lg mt-lg rounded-[var(--nf-container-radius)] border border-[var(--nf-border-subtle)] p-md" data-testid="safety-still-out">
            <p className="text-[length:var(--nf-text-body)] font-semibold text-[var(--nf-content-primary)]">
              {view.overdue ? copy.pageOverdue : copy.worried}
            </p>
            <a href="tel:112" className="nf-btn nf-btn--danger nf-btn--md mt-sm inline-flex min-h-11">
              {copy.call}
            </a>
          </div>
        )}
      </Frame>
    );
  }

  return (
    <Frame>
      <SafetySharePanel view={view} copy={copy} locale={locale} />
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="nf-shell pb-section">
      <div className="mx-auto max-w-xl pt-block">{children}</div>
    </div>
  );
}
