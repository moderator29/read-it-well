import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { FirstRun } from "@/components/app/welcome/FirstRun";
import { WelcomeStage } from "@/components/app/welcome/WelcomeStage";

/**
 * The first run, with fixture props. The route itself needs a session and a
 * profile row; this renders the same components on the same stage so the
 * look can be screenshotted here. Never the proof of the writes.
 */
export default async function PreviewWelcome() {
  const t = getDictionary(await getLocale());
  return (
    <WelcomeStage>
      <FirstRun t={t} interests={[]} showCards asked={false} />
    </WelcomeStage>
  );
}
