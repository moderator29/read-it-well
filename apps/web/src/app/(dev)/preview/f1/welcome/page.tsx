import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { FirstRun } from "@/components/app/welcome/FirstRun";
import { WelcomeStage } from "@/components/app/welcome/WelcomeStage";

/**
 * First run, on its stage, so it can be photographed.
 *
 * `/welcome` guards itself three ways and the first guard sends a signed-out
 * visitor to `/sign-in`, so the real route cannot be shot from a sandbox with
 * no session: every attempt lands on the door instead, which is how a probe
 * of this screen quietly measured the sign-in page instead of it.
 *
 * It matters more than usual now. Ledger rule 22 names first run alongside
 * sign in and sign up, so this screen is dark in both themes, and the half of
 * that ruling which actually decides it is the ABSENCE of light rules in
 * `auth.css`. An absence is exactly the kind of thing that cannot be proven
 * by reading, because what you are looking for is not there to see.
 *
 * Real components and the real stage, fixture props only: `showCards` opens
 * on the two-worlds beat, which is the beat `2A49E2F7` governs.
 */
export default async function WelcomePreviewPage() {
  return (
    <WelcomeStage>
      <FirstRun t={getDictionary(await getLocale())} interests={[]} showCards />
    </WelcomeStage>
  );
}
