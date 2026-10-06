import type { Metadata } from "next";
import { headers } from "next/headers";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getTenancyFile } from "@/lib/tenancy/queries";
import { lagosToday } from "@/lib/rent/schema";
import { addDays } from "@/lib/tenancy/model";
import { RESPOND_WITHIN_DAYS, type LetterFacts } from "@/lib/tenancy/letter";
import { formatMoneyDate } from "@/lib/money/dates";
import { ROOM_COPY, ROOM_ITEMS } from "@/lib/inspections/report";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, FactGrid, Section, Stack, TYPE } from "@/components/app/Screen";
import { DemandLetter, PinnedChoice, PrintPack } from "./PackControls";
import { publicPlace } from "@/lib/after-gate/public-place";
import "./pack.css";

/** A private record. Never indexed. */
export const metadata: Metadata = { title: "Complaint pack", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

/**
 * V-85. THE TRIBUNAL PACK AND THE CAUTION DEMAND LETTER.
 *
 * Vallo holds nothing and decides nothing, so when a caution is not returned
 * the tenant's remedy is the Tenancy Tribunal or a small claims court. This
 * page hands them the whole record on one printable page: the tenancy, the
 * money and its receipts with verification codes, the promise as frozen at
 * payment, the move-in and move-out reports room by room, the caution and
 * every deduction with its answer, and the pinned messages. No new data: it
 * is the tenancy file, laid out for paper. The area, never the address.
 *
 * Tenant only: it is the tenant's case. Anybody else, including the lister,
 * reads that only the tenant can prepare it.
 */
export default async function ComplaintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const t = getDictionary(locale);
  const copy = t.afterTheGate.complaint;
  const read = await getTenancyFile(id, locale);
  const shell = (children: React.ReactNode) => (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={copy.title} fallback={`/tenancy/${id}`} />
      {children}
    </div>
  );
  if (read.state === "unavailable") {
    return shell(<EmptyState icon="calendar-home" title={t.afterTheGate.tenancy.unavailableTitle} body={t.afterTheGate.tenancy.unavailableBody} />);
  }
  if (read.state !== "ready" || read.file.viewer !== "tenant") {
    return shell(<EmptyState icon="calendar-home" title={t.afterTheGate.tenancy.missingTitle} body={copy.missing} data-testid="complaint-missing" />);
  }

  const file = read.file;
  const today = lagosToday();
  // Rule 10: this page is printed and handed to strangers, so the place goes
  // through the closed lists and the heading is composed from facts, never
  // the lister's title or description.
  const place = await publicPlace(file.place.area, file.place.city, file.place.stateCode);
  const heading =
    file.bedrooms && file.bedrooms > 0
      ? copy.headingBeds.replace("{count}", String(file.bedrooms)).replace("{place}", place)
      : copy.heading.replace("{place}", place);
  const day = (value: string) => formatMoneyDate(value, locale) ?? value;
  const host = (await headers()).get("host");
  const origin = host ? `https://${host}` : null;
  const hint = file.receiptCode?.hint ?? null;
  const verifyUrl = hint && origin ? `${origin}/r` : null;
  const caution = file.caution;
  const owed = caution !== null && caution.outstandingMinor > 0;
  const letterOpen = owed && caution !== null && today > caution.dueOn;

  const facts: LetterFacts | null =
    caution && letterOpen
      ? {
          tenantName: file.tenantName,
          listerName: file.listerName,
          area: place,
          period: { from: file.moveInLabel, to: file.endsOnLabel },
          cautionPaid: caution.amount,
          returned: caution.returned,
          deducted: caution.deducted,
          outstanding: caution.outstanding,
          dueOn: caution.dueOnLabel,
          respondBy: day(addDays(today, RESPOND_WITHIN_DAYS)),
          disputed: caution.deductions
            .filter((line) => line.answer === "disputed")
            .map((line) => `${ROOM_COPY[line.item].title}: ${line.amount}`),
          verifyUrl,
          today: day(today),
        }
      : null;

  const moveIn = file.reports.filter((report) => report.stage === "move_in" && report.id);
  const moveOut = file.reports.filter((report) => report.stage === "move_out" && report.id);
  const who = (own: boolean) => copy.by.replace("{who}", own ? copy.you : copy.other);
  // A room the report never answered is blank, not a claim either way.
  const cell = (checked: boolean | undefined) => (checked === undefined ? "" : checked ? copy.checked : copy.notChecked);

  return shell(
    <article className="nf-pack" data-testid="complaint-pack">
      <Stack>
        <Section>
          <p className={TYPE.body}>{copy.lede}</p>
          <div className="nf-pack-noprint mt-md">
            <PrintPack label={copy.print} />
          </div>
        </Section>

        <Section title={copy.tenancy} divided>
          <p className="nf-body font-semibold">{heading}</p>
          <p className={`mt-2xs ${TYPE.body}`}>
            {/* An unnamed lister gets its own sentence: substituting "the
                lister" into "{lister}, lister." read "the lister, lister." */}
            {(file.listerName ? copy.parties.replace("{lister}", file.listerName) : copy.partiesNoLister).replace(
              "{tenant}",
              file.tenantName ?? t.afterTheGate.tenancy.you,
            )}
          </p>
          <p className={`mt-2xs nf-numeric ${TYPE.body}`}>
            {copy.period.replace("{from}", file.moveInLabel).replace("{to}", file.endsOnLabel).replace("{area}", place)}
          </p>
        </Section>

        <Section title={copy.money} divided>
          <dl className="grid gap-2xs">
            {file.lines.map((line) => (
              <div key={line.label} className="flex justify-between gap-md">
                <dt className="nf-body-sm">{line.label}</dt>
                <dd className="nf-body-sm nf-numeric">{line.display}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-md font-semibold">
              {/* "Paid in total" only when it is: an unpaid or part-paid
                  tenancy reached this page saying it was paid. */}
              <dt className="nf-body-sm">{file.paid ? t.afterTheGate.tenancy.totalPaid : copy.totalUnpaid}</dt>
              <dd className="nf-body-sm nf-numeric">{file.total}</dd>
            </div>
          </dl>
          <h3 className="nf-h4 mt-md">{copy.receipts}</h3>
          {file.receipts.length === 0 ? (
            <p className="nf-body-sm mt-xs">{t.afterTheGate.tenancy.noReceipt}</p>
          ) : null}
          <ul className="mt-xs grid gap-2xs">
            {file.receipts.map((receipt) => (
              <li key={receipt.id} className="nf-body-sm nf-numeric">
                {t.afterTheGate.tenancy.receiptLine.replace("{amount}", receipt.amount).replace("{date}", receipt.date)}
                {receipt.reference && <span className="nf-caption block">{t.afterTheGate.tenancy.receiptRef.replace("{ref}", receipt.reference)}</span>}
              </li>
            ))}
          </ul>
          {/* A receipt code checks a payment, so it is offered only once one exists. */}
          {file.receipts.length > 0 ? (
            <p className="nf-caption mt-xs">
              {hint && verifyUrl ? copy.verify.replace("{hint}", hint).replace("{url}", verifyUrl) : copy.noCode}
            </p>
          ) : null}
        </Section>

        {file.snapshot && (
          <Section title={copy.promise.replace("{date}", file.snapshot.takenAtLabel)} divided>
            <FactGrid facts={file.snapshot.facts} />
          </Section>
        )}

        <Section title={copy.reports} divided>
          {moveIn.length === 0 && moveOut.length === 0 ? (
            <p className={TYPE.body}>{copy.noReport}</p>
          ) : (
            <table className="nf-body-sm">
              <thead>
                <tr>
                  <th>{copy.room}</th>
                  {moveIn.map((report) => (
                    <th key={report.id}>{`${copy.moveIn}: ${who(report.authorIsViewer)}`}</th>
                  ))}
                  {moveOut.map((report) => (
                    <th key={report.id}>{`${copy.moveOut}: ${who(report.authorIsViewer)}`}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROOM_ITEMS.map((room) => (
                  <tr key={room}>
                    <td>{ROOM_COPY[room].title}</td>
                    {[...moveIn, ...moveOut].map((report) => (
                      <td key={report.id}>{cell(report.items[room])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {caution && (
          <Section title={copy.caution} divided>
            <p className="nf-body-sm nf-numeric">
              {copy.cautionLine
                .replace("{amount}", caution.amount)
                .replace("{date}", caution.dueOnLabel)
                .replace("{returned}", caution.returned)
                .replace("{deducted}", caution.deducted)
                .replace("{outstanding}", caution.outstanding)}
            </p>
            {caution.deductions.length > 0 && (
              <ul className="mt-xs grid gap-2xs">
                {caution.deductions.map((line) => (
                  <li key={line.id} className="nf-body-sm nf-numeric">
                    {copy.deductionLine
                      .replace("{item}", ROOM_COPY[line.item].title)
                      .replace("{amount}", line.amount)
                      .replace("{answer}", line.answer === "accepted" ? copy.accepted : line.answer === "disputed" ? copy.disputed : copy.unanswered)}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        )}

        {file.pins.length > 0 && (
          <Section title={copy.pins} divided>
            {/* Pinned messages are the parties' own words and may name a street,
                so they print only when the tenant chooses each one. */}
            <PinnedChoice pins={file.pins} copy={{ warning: copy.pinsWarning, include: copy.pinsInclude }} />
          </Section>
        )}

        {caution && (
          <Section title={copy.letter} divided>
            {!owed ? (
              <p className={TYPE.body}>{copy.letterNothing}</p>
            ) : facts ? (
              <>
                <p className={`mb-md ${TYPE.body}`}>{copy.letterLede}</p>
                <DemandLetter facts={facts} copy={{ personal: copy.personal, send: copy.send }} />
              </>
            ) : (
              <p className={TYPE.body}>{copy.letterNotYet.replace("{date}", caution.dueOnLabel)}</p>
            )}
          </Section>
        )}

        <p className="nf-caption">{t.afterTheGate.tenancy.retention.replace("{date}", file.keptUntilLabel)}</p>
      </Stack>
    </article>,
  );
}
