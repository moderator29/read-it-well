import type { Metadata } from "next";
import { requireAdmin, adminRefusal } from "@/lib/admin/guard";
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
  const access = await requireAdmin();
  if (access.state !== "admin") {
    return (
      <div className="nf-card p-6">
        <h1 className="text-lg font-semibold text-[var(--nf-content-primary)]">Reference data</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--nf-content-muted)]">
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

  return (
    <div className="flex flex-col gap-10">
      <header>
        <h1 className="text-xl font-semibold text-[var(--nf-content-primary)]">Reference data</h1>
        <p className="mt-1 max-w-[70ch] text-sm leading-relaxed text-[var(--nf-content-muted)]">
          The closed lists every profile picks from. A code is the value stored
          on the person&apos;s row, so it can never be edited once it exists, and
          nothing here can be deleted: a delete would quietly empty the answer of
          everybody who had chosen it. A wrong row gets renamed.
        </p>
      </header>

      <OccupationEditor rows={occupations} />
      <LocalGovernmentEditor rows={localGovernments} states={states} />
    </div>
  );
}
