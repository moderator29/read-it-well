import type { Metadata } from "next";
import { formatDate, getDictionary, type Locale } from "@vallo/i18n";
import { ResultScreen } from "@/components/app/ResultSheet";
import { getLocale } from "@/lib/locale";
import { readReplyByToken } from "@/lib/landlord/queries";
import { LandlordQuestion } from "./LandlordQuestion";

/**
 * THE LANDLORD'S REPLY PAGE. V-31 and V-32. A public door.
 *
 * The one page a landlord ever sees. They have no account and need none: the
 * link we sent to the number on the mandate carries a single-use token, and
 * the token is the whole of their authorisation, checked inside the database
 * against its sha256. The sign-in wall of 23 September lets exactly this path
 * through (`proxy.ts`, segment `landlord`), and nothing else inside the
 * platform is reachable from it: no navigation into the product, no listing,
 * no photographs, no map.
 *
 * WHAT IT SHOWS. The place in the words the database builds ("2 bedroom
 * apartment in Ikeja GRA"), the agent's public display name, and for rent the
 * six parts frozen on `rent_payments` to the kobo. Never the address, never a
 * landmark, never anybody's number, including the landlord's own: a link that
 * is forwarded shows a stranger nothing they could find a door with.
 *
 * NEVER INDEXED, NEVER REFERRED. `robots: noindex` and `referrer: no-referrer`,
 * so the token in the path cannot leave in a Referer header if the landlord
 * taps a link on the page. The page carries none anyway.
 *
 * Six states, each designed: open, already answered, expired, unknown link,
 * line switched off, and our failure. See `lib/landlord/reply.ts`. The open
 * question itself is `LandlordQuestion`, drawn separately so the preview
 * harness can show it with fixtures.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return {
    title: t.landlord.reply.metaTitle,
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

function day(iso: string | null, locale: Locale): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return formatDate(date, locale, { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" });
}

export default async function LandlordReplyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const locale = await getLocale();
  const t = getDictionary(locale);
  const copy = t.landlord.reply;
  const view = await readReplyByToken(token);

  if (view.state === "unknown" || view.state === "closed" || view.state === "failed") {
    const words = copy.states[view.state];
    return (
      <Frame>
        <ResultScreen
          state={view.state === "failed" ? "failed" : "pending"}
          verdict={words.title}
          consequence={words.body}
          heading
          data-testid={`landlord-${view.state}`}
        />
      </Frame>
    );
  }

  if (view.state === "used" || view.state === "expired") {
    const words = copy.states[view.state];
    const when =
      view.state === "used" && view.answeredAt ? ` ${copy.answeredOn.replace("{date}", day(view.answeredAt, locale))}` : "";
    return (
      <Frame>
        <ResultScreen
          state={view.state === "expired" ? "expired" : "confirmed"}
          verdict={words.title}
          consequence={`${words.body}${when}`}
          heading
          data-testid={`landlord-${view.state}`}
        />
      </Frame>
    );
  }

  return (
    <Frame>
      <LandlordQuestion view={view} token={token} copy={copy} locale={locale} />
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
