import type { Metadata } from "next";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getStandingDesk } from "@/lib/admin/standing-queries";
import { adminUi } from "../_components/ui";
import { StandingDesk } from "./StandingDesk";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return { title: t.admin.nav.standing.label, robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

/**
 * Standing: the badges a person grants rather than a trigger awards.
 *
 * Seven of the fourteen badges award themselves from event triggers, which is
 * the right way round: standing that can be earned should be earned. Exactly
 * one is marked manual_only, and the database refuses to store it without the
 * name of the admin who granted it (RM021).
 *
 * This is the desk for that one act, and the record of every time it has been
 * used. A feature with no admin control is a feature nobody can fix at three
 * in the morning; this is the control.
 */
export default async function AdminStandingPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const ui = adminUi(t, locale);

  const read = await getStandingDesk();

  if (read.state !== "ready") {
    return (
      <div className="mx-auto max-w-3xl">
        <ui.QueueHeader
          title={t.admin.nav.standing.label}
          lede="Badges RentMe grants by hand, and the record of who granted them."
        />
        <ui.QueueUnavailable />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <ui.QueueHeader
        title={t.admin.nav.standing.label}
        lede="Badges RentMe grants by hand, and the record of who granted them."
        count={read.grants.filter((g) => !g.revoked).length}
      />
      <StandingDesk grants={read.grants} manualBadges={read.manualBadges} />
    </div>
  );
}
