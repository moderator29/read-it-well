import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { FirstRun } from "@/components/app/welcome/FirstRun";
import { WelcomeStage } from "@/components/app/welcome/WelcomeStage";

/**
 * Get started, on fixture props, for the proofs and the sweep (lead ruling
 * R-G). Behind the preview gate in `(dev)/preview/layout.tsx`.
 *
 *   /preview/session-b/welcome                  a member who has not answered
 *                                               the interests question
 *   /preview/session-b/welcome?viewer=guest     a stranger (the live /welcome
 *                                               shows the same without a
 *                                               harness)
 *   /preview/session-b/welcome?viewer=done      a member with nothing left to
 *                                               answer (Go to home)
 *
 * Nothing here reads or writes the database: the member's buttons call the
 * real server actions, which do nothing without a session.
 */
export default async function WelcomeHarness({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = getDictionary(await getLocale());
  const viewer = (await searchParams).viewer;
  const guest = viewer === "guest";
  return (
    <WelcomeStage>
      <FirstRun
        t={t}
        interests={[]}
        showCards
        asked={guest || viewer === "done"}
        viewer={guest ? "guest" : "member"}
      />
    </WelcomeStage>
  );
}
