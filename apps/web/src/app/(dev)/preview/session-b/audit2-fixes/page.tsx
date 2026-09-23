import Link from "next/link";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { HostShell } from "@/components/host/HostShell";
import { HostWizard } from "@/components/host/HostWizard";
import { emptyHostDraft, stepsFor, type HostStepId } from "@/lib/host/onboarding";
import { PERSON } from "../../_fixtures/people";

/**
 * The host wizard's later steps, for the second audit's S9 remainder.
 *
 * The first step has a harness (`/preview/f5/host-wizard`) and the eight drawn
 * stays panels have theirs (`/preview/imgc/*`); the steps between and after
 * them (business, registration, representative, payout, consent, review) had
 * no proof, because moving forward is a write (`saveHostDraft` creates the
 * business at step two). This page opens the real `HostWizard` on the step
 * named in `?step=` over a fixture draft of a registered hotel, through the
 * wizard's `initialStep` prop, so each step is drawn without the steps before
 * it being written. Nothing here writes until a control is pressed, and the
 * proof presses none. Fixture-backed: the proof of the look, never of the
 * wiring. With no `?step=` it lists the steps.
 */
export const dynamic = "force-dynamic";

const DRAFT = {
  ...emptyHostDraft(),
  hostType: "business" as const,
  kind: "hotel" as const,
  name: "Grand Vista Hotel",
  description: "A hotel on Adeola Odeku Street with sixty rooms and a pool.",
  phone: "+234 803 000 0000",
  email: "frontdesk@example.com",
  address: "12 Adeola Odeku Street",
  area: "Victoria Island",
  city: "Lagos",
  stateCode: "LA",
  registeredName: "Grand Vista Hospitality Limited",
  cacNumber: "RC 1234567",
  representativeName: "Seyi Omojuni",
  representativePhone: "+234 803 000 0001",
};

export default async function AuditTwoHostWizard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const { step } = await searchParams;
  const steps = stepsFor(DRAFT.hostType, DRAFT.kind);
  const chosen = steps.find((candidate) => candidate.id === step)?.id as HostStepId | undefined;

  if (!chosen) {
    return (
      <ul className="grid gap-xs p-gutter">
        {steps.map((candidate) => (
          <li key={candidate.id}>
            <Link href={`/preview/session-b/audit2-fixes?step=${candidate.id}`}>{candidate.id}</Link>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <HostShell logoLabel={t.a11y.logoHome}>
      <HostWizard
        initial={DRAFT}
        userId={PERSON.id}
        policies={[
          {
            id: "00000000-0000-4000-8000-00000000e001",
            name: "Flexible",
            summary: "Free until 24 hours before",
            isFreeUntilHours: 24,
          },
        ]}
        locale={locale}
        initialStep={chosen}
      />
    </HostShell>
  );
}
