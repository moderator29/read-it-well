import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { SearchCard } from "@/components/app/account/SettingsGroups";
import { loadSettingsState } from "@/lib/profile/queries";
import { loadInterestsState } from "@/lib/interests/queries";
import { AccountSection } from "../AccountSection";
import { PlaceCard } from "../PlaceCard";
import { InterestsRow } from "../InterestsCard";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await getLocale()).settings.hub.accountInfo };
}

/**
 * Account Information: who you are signed in as, where you are and what you
 * came for, your search defaults, sign out and deletion. The rows the
 * settings home used to stack under Account, Place and Search, one tap down.
 */
export default async function AccountSettingsPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const [account, intent] = await Promise.all([loadSettingsState(), loadInterestsState()]);
  const signedIn = account.state === "signed-in";

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={t.settings.hub.accountInfo}
        subtitle={t.settings.hub.accountInfoSub}
        fallback="/settings"
      />
      <div className="space-y-block">
        <section id="settings-account" className="scroll-mt-28">
          <AccountSection
            t={t}
            state={account.state}
            email={account.state === "signed-in" ? account.email : ""}
          />
        </section>
        <section id="settings-place" className="scroll-mt-28">
          <PlaceCard
            t={t}
            signedIn={signedIn}
            stateName={signedIn ? account.place.stateName : ""}
            lgaName={signedIn ? account.place.lgaName : ""}
            occupationName={signedIn ? account.place.occupationName : ""}
          >
            <InterestsRow
              t={t}
              signedIn={signedIn}
              interests={intent.state === "signed-in" ? intent.interests : []}
              asked={intent.state === "signed-in" ? intent.asked : false}
            />
          </PlaceCard>
        </section>
        <section id="settings-search" className="scroll-mt-28">
          <SearchCard t={t} />
        </section>
      </div>
    </div>
  );
}
