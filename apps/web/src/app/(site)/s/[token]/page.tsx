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
 * Open (`proxy.ts`, segment `s`), never indexed, never referred, and it
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
        : view.state === "failed"
          ? { title: copy.failedTitle, body: copy.failedBody }
          : { title: copy.unknownTitle, body: copy.unknownBody };
    return (
      <Frame>
        <ResultScreen
          state={view.state === "failed" ? "failed" : view.state === "expired" ? "expired" : "pending"}
          verdict={words.title}
          consequence={words.body}
          data-testid={`safety-${view.state}`}
        />
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
