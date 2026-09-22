import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { daypartFor, lagosHour, type HomeOverview } from "@/lib/app/home-queries";
import { HomeScreen } from "@/components/app/home/HomeScreen";
import { PERSON } from "../../_fixtures/people";
import { LISTINGS } from "../listings";

/**
 * The in-app home as a signed-in person sees it, with the identity and the
 * listings from fixtures. The route itself needs a session, and the
 * catalogue cannot be read from this sandbox, so this renders the same
 * screen on the same shell width from fixture rows so the look can be
 * screenshotted here. Never the proof of the writes.
 */
export const dynamic = "force-dynamic";

export default async function PreviewHome() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const listings = LISTINGS;

  const overview: HomeOverview = {
    daypart: daypartFor(lagosHour()),
    firstName: PERSON.name.split(" ")[0] ?? "",
    avatarUrl: PERSON.avatarUrl,
    unreadNotifications: 2,
    signedIn: true,
    place: {
      stateCode: "LA",
      stateName: "Lagos",
      lgaCode: "la_eti_osa",
      lgaName: "Lekki",
      label: "Lekki",
      context: "Lagos",
      isOwn: true,
    },
    areas: [],
    trending: [],
    askIntent: false,
  };

  /*
   * THE MARKET COUNT, CITY AND INVESTMENT FIXTURES STOOD HERE AND ARE GONE
   * WITH THE BLOCKS THEY FED.
   *
   * `GOVERNING-01` screen one draws a hero plate, four category tiles with no
   * counts on them, and one featured row. The nine market tiles, the cities
   * rail and the investment band are not on that screen, so the harness has
   * nothing left to hand them. `market-queries.ts` still holds the reads; one
   * caller stopped calling.
   */

  return (
    <main id="main" className="min-h-dvh pb-4xl">
      <div className="nf-shell py-section-tight">
        {/* `manageHref` is the chooser here, because a fixture holds no
            account and a harness must never imply one. See HomeScreen. */}
        <HomeScreen
          t={t}
          locale={locale}
          overview={overview}
          listings={listings}
          roles={[]}
          manageHref="/profile/setup"
        />
      </div>
    </main>
  );
}
