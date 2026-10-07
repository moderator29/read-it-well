import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { adminUi } from "@/app/admin/_components/ui";
import { SwitchRow } from "@/app/admin/switches/SwitchRow";
import { StandingDesk } from "@/app/admin/standing/StandingDesk";
import { StopsDesk } from "@/app/admin/stops/StopsDesk";
import { RetireExamples } from "@/app/admin/examples/RetireExamples";
import { OccupationEditor, LocalGovernmentEditor } from "@/app/admin/reference/ReferenceEditors";
import { HoldDecision } from "@/app/admin/_lanes/HoldDecision";
import { AreaDecision } from "@/app/admin/social/SocialDecisions";
import {
  ADMIN_BADGES,
  ADMIN_EXAMPLES,
  ADMIN_GRANTS,
  ADMIN_LOCAL_GOVERNMENTS,
  ADMIN_OCCUPATIONS,
  ADMIN_STATES,
  ADMIN_STOPPED,
  ADMIN_SWITCHES,
  ADMIN_TRADING,
} from "../ops-fixtures";

/**
 * THE DESKS THAT CARRY THEIR OWN BODY, from fixture rows.
 *
 * `admin-frame` shoots the frame every desk shares. This page shoots the part
 * each of these desks draws itself: the kill switches, the badge desk, the
 * stops desk, the example shelf, the reference editors, a moderation hold and
 * a social area decision. The real routes gate on `requireAdmin` in the
 * layout, so the desk components are rendered here on the console's own root
 * class, which is what carries their register.
 *
 * Nothing on this page writes: every action behind these controls refuses a
 * caller who is not staff, which is the same refusal it gives in production.
 */
export const dynamic = "force-dynamic";

export default async function PreviewAdminDesks() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const ui = adminUi(t, locale);

  return (
    <div className="nf-admin">
      {/* The route's own wrapper: `.nf-admin` is a flex row beside the rail, and
          this is the min-width-0 column that lets the body shrink to a phone. */}
      <main className="nf-admin-body min-w-0 flex-1">
        <div className="nf-console">
          <ui.QueueHeader title="The desks" lede="The part of each desk that is not the shared frame." />

          <ui.Section title="Switches" hint="One row per switchable surface.">
            <ul className="nf-queue-list">
              {ADMIN_SWITCHES.map((flag) => (
                <SwitchRow
                  key={flag.key}
                  flag={flag}
                  copy={t.admin.switches}
                  common={t.admin.common}
                  ui={ui}
                />
              ))}
            </ul>
          </ui.Section>

          <ui.Section title="Standing" hint="Badges awarded by hand, and who signed for them.">
            <StandingDesk grants={ADMIN_GRANTS} manualBadges={ADMIN_BADGES} />
          </ui.Section>

          <ui.Section title="Stops" hint="Agents stopped from trading, and the ones still trading.">
            <StopsDesk stopped={ADMIN_STOPPED} trading={ADMIN_TRADING} recallCopy={t.trustVisible.desk} />
          </ui.Section>

          <ui.Section title="The example shelf" hint="Seeded listings and the day they come off.">
            <RetireExamples live={ADMIN_EXAMPLES} />
          </ui.Section>

          <ui.Section title="Moderation" hint="A held item, and the two things that can happen to it.">
            <div className="nf-card p-card">
              <p className="nf-body-sm text-[var(--nf-content-secondary)]">
                A post held by the filter for a phone number in the body.
              </p>
              <HoldDecision target="post" id="00000000-0000-4000-8000-00000000m001" what="post" />
            </div>
          </ui.Section>

          <ui.Section title="Social" hint="Whether a place opens, and what its moderators are told.">
            <div className="nf-card p-card">
              <AreaDecision areaId="00000000-0000-4000-8000-00000000s001" name="Lekki Phase 1" />
            </div>
          </ui.Section>

          <ui.Section title="Reference" hint="The closed lists every profile picks from.">
            <OccupationEditor rows={ADMIN_OCCUPATIONS} />
            <div className="mt-block">
              <LocalGovernmentEditor rows={ADMIN_LOCAL_GOVERNMENTS} states={ADMIN_STATES} />
            </div>
          </ui.Section>
        </div>
      </main>
    </div>
  );
}
