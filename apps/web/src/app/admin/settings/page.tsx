import Link from "next/link";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { NavIcon } from "../_components/AdminGlyph";
import { PageHead, Panel } from "../_components/panels";
import { ADMIN_SETTINGS } from "../_components/nav";

/**
 * Settings, the row the renders pin to the rail's foot.
 *
 * The console had no settings page: the platform's own configuration lived
 * in three desks reachable only from a band of the old rail. This page is
 * their door, so the rail can carry the renders' twelve rows and still reach
 * every one of them. It reads nothing; each desk reads and writes its own.
 */
const LEDES: Record<string, string> = {
  switches: "Turn a surface of the product off in an incident, and back on. Every change is written to the audit log.",
  reference: "The occupations and local governments every profile picks from.",
  examples: "The example listings that show the product before real supply arrives, and the date each is due to retire.",
};

export default function AdminSettingsPage() {
  return (
    <div className="nf-admin-stack">
      <PageHead title="Settings" lede="The platform's own configuration, one desk each." />
      <div className="nf-admin-grid nf-admin-grid--halves">
        {(ADMIN_SETTINGS.children ?? []).map((desk) => (
          <Panel key={desk.key}>
            <Link href={desk.href} className="nf-admin-hub">
              <span className="nf-admin-plate nf-admin-plate--brand nf-admin-plate--md" aria-hidden="true">
                <NavIcon icon={desk.icon} size={24} />
              </span>
              <span className="nf-admin-hub__text">
                <span className="nf-admin-panel__title">{desk.label}</span>
                <span className="nf-admin-hub__lede">{LEDES[desk.key] ?? ""}</span>
              </span>
              <UiIcon name="chevron-right" size={20} />
            </Link>
          </Panel>
        ))}
      </div>
    </div>
  );
}
