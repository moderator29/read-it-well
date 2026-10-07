import { notFound } from "next/navigation";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { previewHarnessIsOpen } from "@/lib/preview-harness";
import { TIER_NAME, VERIFICATION_ORDER } from "@/lib/trust/verification";
import { FirstRunPanels } from "@/components/app/feature-onboarding/FirstRunPanels";
import { FIRST_RUN_HOME, firstRunContent, isMountedFirstRun } from "@/components/app/feature-onboarding/first-runs";
import { TrialTimeline } from "@/components/app/plans-premium/TrialTimeline";
import { FeaturesBoard } from "./FeaturesBoard";

/**
 * W7'S COMPONENTS, MOUNTED SO THEY CAN BE LOOKED AT (Session 3, 6 October).
 *
 * Gated exactly as the other gallery pages are: `previewHarnessIsOpen` needs
 * development or an explicit `VALLO_PREVIEW_HARNESS=1`, and refuses on Vercel
 * whatever that variable says. A 404, never a redirect.
 *
 * `?run=<feature>` draws that feature's first run full page, exactly as
 * `/first-run/<feature>` does, without needing a session and without writing
 * the device record anywhere it matters.
 */
export default async function FeaturesGalleryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!previewHarnessIsOpen(process.env)) notFound();
  const locale = await getLocale();
  const t = getDictionary(locale);
  const run = (await searchParams).run;
  const feature = Array.isArray(run) ? run[0] : run;

  if (isMountedFirstRun(feature)) {
    const content = firstRunContent(feature, t);
    const c = t.experienceFeatures.firstRun;
    return (
      <FirstRunPanels
        feature={feature}
        name={content.name}
        panels={content.panels}
        action={content.action}
        next={FIRST_RUN_HOME[feature]}
        copy={{ skip: c.skip, next: c.next, page: c.page, pager: c.pager, region: c.region }}
      />
    );
  }

  const f = t.experienceFeatures;
  return (
    <FeaturesBoard
      t={t}
      locale={locale}
      tiers={VERIFICATION_ORDER.map((rung) => ({
        step: rung.step,
        name: TIER_NAME[rung.step],
        meaning: rung.meaning,
        held: rung.step <= 2,
      }))}
      trial={
        <TrialTimeline
          endsOn={null}
          locale={locale}
          lines={{
            today: "The first step's sentence, from lib/money/copy.ts (W7-R5).",
            remind: "The reminder step's sentence, from lib/money/copy.ts (W7-R5).",
            end: "The last step's sentence, from lib/money/copy.ts (W7-R5).",
          }}
          copy={{
            trialTitle: f.plans.trialTitle,
            today: f.plans.today,
            remindStep: f.plans.remindStep,
            endStep: f.plans.endStep,
            dateUnknown: f.plans.dateUnknown,
          }}
        />
      }
    />
  );
}
