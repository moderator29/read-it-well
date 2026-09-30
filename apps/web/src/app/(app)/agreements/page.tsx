import { Unreachable } from "@/components/app/Unreachable";
import type { Metadata } from "next";
import Link from "next/link";
import { formatMoney } from "@vallo/i18n/core";
import { getLocale } from "@/lib/locale";
import { readMyAgreements } from "@/lib/agreements/queries";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, Section, TYPE } from "@/components/app/Screen";
import { NO_CUSTODY_SENTENCE, PAYMENT_GATE_SENTENCE } from "@/lib/money/copy";
import { AGREEMENT_STATUS_LABEL } from "@/components/app/agreements/status";

export const metadata: Metadata = { title: "Agreements" };
export const dynamic = "force-dynamic";

/**
 * Every agreement this person is a party to (Track A). An agreement is the
 * record of exactly what both sides committed to, drawn up from the renter's
 * inspection report or the host's acceptance, confirmed by both, and approved
 * by Vallo before payment opens.
 */
export default async function AgreementsPage() {
  const locale = await getLocale();
  const rows = await readMyAgreements();
  return (
    <main className="nf-page nf-md">
      <PageHeader variant="large" title="Agreements" />
      <p className={`${TYPE.body} mt-inline`}>{PAYMENT_GATE_SENTENCE}</p>
      <p className={`${TYPE.rowMeta} mt-inline mb-block`}>{NO_CUSTODY_SENTENCE}</p>
      <Section title="Your agreements">
        {rows === null ? (
          <Unreachable noun="agreements" icon="contract-sign" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="contract-sign"
            title="No agreements yet"
            body="An agreement is drawn up after an inspection report is submitted, or when a host accepts your stay."
          />
        ) : (
          <ul className="grid gap-row" data-testid="agreements-list">
            {rows.map((row) => (
              <li key={row.id}>
                <Link href={`/agreements/${row.id}`} className="nf-card block p-card" data-status={row.status}>
                  <p className="font-semibold">{row.listingTitle}</p>
                  <p className={TYPE.rowMeta}>
                    {row.kind === "rent" ? "Rental" : "Stay"} · {formatMoney(row.amountMinor, locale)} ·{" "}
                    {AGREEMENT_STATUS_LABEL[row.status] ?? row.status}
                    {row.role === null
                      ? ""
                      : ` · you are the ${row.role === "renter" ? (row.kind === "rent" ? "renter" : "guest") : "owner or agent"}`}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </main>
  );
}
