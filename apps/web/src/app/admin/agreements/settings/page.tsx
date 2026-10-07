import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "@/lib/locale";
import { requireAdmin } from "@/lib/admin/guard";
import { readRiskSettings } from "@/lib/admin/reads/agreements";
import { PageHead } from "../../_components/panels";
import { RiskSettingsForm } from "./RiskSettingsForm";
import "../agreements.css";

export const metadata: Metadata = {
  title: "Risk settings",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * D77: the risk settings behind the agreement gate (D68d, scoped by the
 * founder's rulings of 7 October 2026). Staff with the agreements scope only;
 * every change is validated and audited by the database.
 */
export default async function RiskSettingsPage() {
  const locale = await getLocale();
  const access = await requireAdmin("agreements");
  if (access.state !== "admin") {
    return (
      <div className="nf-console">
        <PageHead title="Risk settings" lede="Your account cannot open these settings." />
      </div>
    );
  }
  const settings = await readRiskSettings(access.userClient);
  return (
    <div className="nf-console">
      <PageHead
        title="Risk settings"
        lede="What sends a direct-rail deal to a person before the card is charged. A protected payment opens when both parties agree; you watch it on the agreements desk."
      />
      <p className="nf-risk-settings__back">
        <Link href="/admin/agreements">Back to the agreements desk</Link>
      </p>
      {settings === null ? (
        <p className="nf-body text-[var(--nf-content-secondary)]">
          The settings could not be read. They open once migration d68d is applied; if it is, refresh to try again.
        </p>
      ) : (
        <RiskSettingsForm settings={settings} locale={locale} />
      )}
    </div>
  );
}
