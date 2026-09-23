import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { requireAdmin, adminRefusal } from "@/lib/admin/guard";
import { adminUi } from "../_components/ui";
import { listLocalGovernmentsForAdmin, listOccupationsForAdmin } from "@/lib/admin/reference-queries";
import { listStates } from "@/lib/places/queries";
import { LocalGovernmentEditor, OccupationEditor } from "./ReferenceEditors";

export const metadata: Metadata = {
  title: "Reference data",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * The platform's own vocabulary.
 *
 * 749 occupations and 774 local governments, both closed lists that every
 * profile picks from. They shipped seeded by migration and with an admin write
 * policy on each, and no screen: a table with an admin policy and no screen is
 * half a feature, and the half that is missing is the one somebody needs at
 * three in the morning when a state creates a new local government.
 *
 * States are not editable here on purpose. There are 37 of them, they are set
 * by the constitution, and the last change was in 1996. A control that can only
 * do damage is not worth building.
 */
export default async function AdminReferencePage() {
  const locale = await getLocale();
  const ui = adminUi(getDictionary(locale), locale);
  const access = await requireAdmin();
  if (access.state !== "admin") {
    return (
      <div className="nf-panel nf-panel--card nf-admin-card p-lg">
        <h1 className="text-[length:var(--nf-text-body-lg)] font-semibold text-[var(--nf-content-primary)]">Reference data</h1>
        <p className="mt-xs text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-muted)]">
          {adminRefusal(access)}
        </p>
      </div>
    );
  }

  const [occupations, localGovernments, states] = await Promise.all([
    listOccupationsForAdmin(),
    listLocalGovernmentsForAdmin(),
    listStates(),
  ]);

  /*
    THE ONE DESK THAT DID NOT INHERIT THE FRAME.

    Every other destination in this console opens `.nf-console` and draws
    `ui.QueueHeader`, so it sits at the same width, with the same display
    title and the same sub-line. This one wrote its own header at `h4` in a
    bare flex column, which put its heading two tiers below every other desk's
    and let the editors run to the full width of a desktop. Same pieces now,
    so it reads as the same product.
  */
  return (
    <div className="nf-console flex flex-col gap-xl">
      <ui.QueueHeader
        title="Reference data"
        lede="The closed lists every profile picks from. A code is the value stored on the person's row, so it can never be edited once it exists, and nothing here can be deleted: a delete would quietly empty the answer of everybody who had chosen it. A wrong row gets renamed."
      />

      <OccupationEditor rows={occupations} />
      <LocalGovernmentEditor rows={localGovernments} states={states} />
    </div>
  );
}
