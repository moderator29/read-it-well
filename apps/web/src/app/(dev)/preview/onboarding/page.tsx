import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { FirstRun } from "@/components/app/welcome/FirstRun";
import { WelcomeStage } from "@/components/app/welcome/WelcomeStage";
import { ArrivalMoment } from "@/components/auth/ArrivalMoment";
import { listStates } from "@/lib/places/queries";

/**
 * The onboarding pieces a sandbox with no session cannot reach live (30
 * September): the moment after a code is accepted (A17, `?view=arrival`)
 * and the interests question with the asks the one-screen sign-up moved
 * there (A1, `?view=asks`). Real components, fixture props only. Saving an
 * ask here is refused (no session), which is the honest answer.
 */
export default async function OnboardingPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; name?: string }>;
}) {
  const { view, name } = await searchParams;
  const t = getDictionary(await getLocale());

  if (view === "arrival") {
    return (
      <main id="main" className="nf-auth nf-slate">
        <div className="nf-auth__body">
          <ArrivalMoment t={t} name={name ?? "Ada"} />
        </div>
      </main>
    );
  }

  return (
    <WelcomeStage>
      <FirstRun
        t={t}
        interests={[]}
        showCards={false}
        viewer="member"
        asks={{ states: await listStates(), askPlace: true, hearAbout: null }}
      />
    </WelcomeStage>
  );
}
