import { getDictionary } from "@vallo/i18n";
import { MobileTabBar } from "@/components/app/MobileTabBar";
import { ReportSheet } from "@/components/app/ReportSheet";
import { FilterDrawer } from "@/components/app/filters/FilterDrawer";
import { parseShelfQuery } from "@/components/app/search/shelf-query";
import { MobileMenu } from "@/components/site/MobileMenu";
import { DeleteAccountPanel } from "@/app/(app)/settings/DeleteAccountPanel";
import { AgentMobileNav } from "@/components/agent/AgentMobileNav";
import { SheetsHarness } from "./Harness";

/**
 * The dialogs that moved onto the shared `Sheet`, each behind its real
 * opener, with the real dock underneath, so a proof can open each one, drag
 * it down, press Escape and check where focus lands and what the dock covers.
 * Fixtures only; nothing here ships.
 */
export default function SheetsPreview() {
  const t = getDictionary("en");
  return (
    <main className="min-h-dvh bg-[var(--nf-surface-canvas)] px-md pb-[var(--nf-tabbar-clearance)] pt-md">
      <div className="grid gap-md">
        <ReportSheet targetType="listing" targetId="00000000-0000-4000-8000-000000000001" targetLabel="A flat in Yaba" signedIn />
        <FilterDrawer
          query={parseShelfQuery({})}
          facts={[]}
          locale="en"
          copy={t.catalogue.filters}
          costCopy={t.moveIn}
          compoundCopy={t.shape.compound}
          sortCopy={t.shape.sorts}
          serviceCopy={t.shape.service}
          cashCopy={t.shape.cash}
          unitCopy={t.shape.unit}
          commuteCopy={t.shape.commute}
        />
        <MobileMenu
          links={[{ href: "/about", label: "About" }]}
          locale="en"
          languageLabel="Language"
          signIn="Sign in"
          signUp="Get started"
          openLabel="Open menu"
          closeLabel="Close menu"
        />
        <DeleteAccountPanel t={t} locale="en" method="password" blockers={[]} purgeAfter={null} daysLeft={0} unavailable={false} />
        <SheetsHarness t={t} />
        <AgentMobileNav t={t} active="/agent" profile={null} />
      </div>
      <MobileTabBar t={t} side="property" active="/home" signedIn />
    </main>
  );
}
