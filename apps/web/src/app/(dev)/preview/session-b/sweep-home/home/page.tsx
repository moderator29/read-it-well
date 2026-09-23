import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { daypartFor, lagosHour, type HomeOverview } from "@/lib/app/home-queries";
import { HomeScreen } from "@/components/app/home/HomeScreen";
import { PERSON } from "../../../_fixtures/people";
import { LISTINGS } from "../../../f1/listings";
import { SweepFrame } from "../Frame";

/** `/home` as a signed-in person sees it (greeting, name, place), from fixture rows. */
export const dynamic = "force-dynamic";

export default async function SweepHome() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
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
  return (
    <SweepFrame route="/home">
      <HomeScreen
        t={t}
        locale={locale}
        overview={overview}
        listings={LISTINGS}
        roles={[]}
        manageHref="/profile/setup"
      />
    </SweepFrame>
  );
}
