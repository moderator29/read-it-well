/**
 * Locale fit, the first-run panels and the plan screen (north star checklist
 * point 22), each mounted in Chromium at 390px in English, Hausa, Igbo and
 * Yorùbá from the real dictionaries, on the product's real compiled cascade.
 *
 *   - Every mounted first run (`MOUNTED_FIRST_RUNS`) is walked panel by panel
 *     with Next to its last panel and the feature's own action, and each panel is
 *     audited. Their words are the locale's own `experienceFeatures.firstRun`
 *     and, for agreements, Session 2's money sentences.
 *   - PlanPaywall carries the plan cards, the benefits, a four-line foot of the
 *     longest real money sentences (the terms are Session 2's, `lib/money/copy`)
 *     and the long real action label; no price is drawn because none exists.
 *
 * See `fit-cases.ts` for the three things held.
 */
import { afterAll, beforeAll, describe, vi } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { BROWSER_TEST_TIMEOUT, closeBrowser, hasBrowser, warmBrowser } from "@/lib/testing/mount-in-browser";
import { appCss } from "@/lib/testing/locale-fit";
import { MOUNTED_FIRST_RUNS, firstRunContent } from "@/components/app/feature-onboarding/first-runs";
import { fitCases } from "./fit-cases";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const CSS = () => appCss();

/* The key is "<surface> <locale>"; the value is the report line. */
const KNOWN: Record<string, string> = {};

describe.skipIf(!hasBrowser && !process.env.CI)("locale fit: first runs and the plan screen at 390px", () => {
  for (const feature of MOUNTED_FIRST_RUNS) {
    const panels = firstRunContent(feature, getDictionary("en")).panels.length;
    fitCases(
      {
        name: `First run, ${feature}, every panel`,
        imports: `
          import { FirstRunPanels } from "@/components/app/feature-onboarding/FirstRunPanels";
          import { FIRST_RUN_HOME, firstRunContent } from "@/components/app/feature-onboarding/first-runs";`,
        setup: `const content = firstRunContent(${JSON.stringify(feature)}, t); const c = t.experienceFeatures.firstRun;`,
        body: `
          <FirstRunPanels feature=${JSON.stringify(feature)} name={content.name} panels={content.panels} action={content.action}
            next={FIRST_RUN_HOME[${JSON.stringify(feature)}]} copy={{ skip: c.skip, next: c.next, page: c.page, pager: c.pager, region: c.region }} />`,
        bleed: true,
        steps: Array.from({ length: panels - 1 }, () => async (page: import("playwright-core").Page) => {
          await page.locator(".nf-frun__action button").click();
          await page.waitForTimeout(500);
        }),
        css: CSS,
      },
      KNOWN,
    );
  }

  fitCases(
    {
      name: "PlanPaywall, plans, benefits, four-line foot and action",
      imports: `
        import { PlanPaywall } from "@/components/app/plans-premium/PlanPaywall";
        import { Credential } from "@/components/app/artefact/Credential";
        import { Button } from "@/components/ui/Button";
        import { NO_INSPECTION_FEE, OFF_PLATFORM_SENTENCE, PAYMENT_GATE_SENTENCE, GUARANTEE_SENTENCE } from "@/lib/money/copy";`,
      setup: `const f = t.experienceFeatures.plans;`,
      body: `
        <PlanPaywall
          artefact={<div style={{ maxWidth: 320, margin: "0 auto" }}><Credential face={{ material: "edge", eyebrow: t.common.verified, title: t.nav.exploreStays, glyph: "sparkle" }} /></div>}
          promise={t.frontDoor.door.signInArea}
          benefits={[
            { icon: "check", text: t.nav.exploreStays },
            { icon: "check", text: t.nav.commercial },
            { icon: "check", text: t.common.priceOnRequest },
            { icon: "check", text: t.frontDoor.door.signIn },
          ]}
          plans={[{ id: "monthly", period: "monthly", priceMinor: null }, { id: "annual", period: "annual", priceMinor: null }]}
          preselectedId="annual"
          terms={{ chargeToday: NO_INSPECTION_FEE, chargeOn: OFF_PLATFORM_SENTENCE, renewal: PAYMENT_GATE_SENTENCE, cancel: GUARANTEE_SENTENCE }}
          locale={locale}
          copy={{ choose: f.choose, monthly: f.monthly, annual: f.annual, perMonth: f.perMonth, perYear: f.perYear, recommended: f.recommended, saving: f.saving, benefits: f.benefits }}
          action={() => <Button variant="primary" size="lg" full>{t.frontDoor.door.signInArea}</Button>}
        />`,
      bleed: true,
      css: CSS,
    },
    KNOWN,
  );
});
