import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getTenancyFile, type TenancyFile } from "@/lib/tenancy/queries";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, FactGrid, Section, Stack, TYPE } from "@/components/app/Screen";
import { EmptyActions } from "@/components/app/EmptyActions";
import { ROOM_COPY } from "@/lib/inspections/report";
import { DeductionAnswer, ProposeDeduction, RecordReturn } from "@/components/app/tenancy/CautionControls";
import { TenancyReportCard } from "@/components/app/tenancy/TenancyReportCard";
import { ReceiptCodePanel } from "@/components/app/tenancy/ReceiptCodePanel";

/** A private record. Never indexed, never in a tab title. */
export const metadata: Metadata = { title: "Tenancy", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

/**
 * THE TENANCY FILE. V-47, holding V-36's caution register and V-54's reports.
 *
 * After a tenant paid a move-in total there was no page they could open six
 * months later: no copy of what the listing promised, no record that anybody
 * owed the caution back, no date the tenancy ends. This is that page, for the
 * tenant and the lister alike, in reading order: the tenancy, the money, the
 * caution, what was promised, and the record of the flat.
 *
 * THE AREA, NEVER THE ADDRESS. The page names the area and city only, like
 * every other surface; the promise snapshot never carried the address.
 *
 * A tenancy that is not the reader's answers exactly as one that does not
 * exist, so a stranger guessing ids learns nothing. A read that failed says
 * so rather than claiming there is nothing.
 */
export default async function TenancyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const t = getDictionary(locale);
  const copy = t.afterTheGate.tenancy;
  const read = await getTenancyFile(id, locale);

  const shell = (children: React.ReactNode, subtitle?: string) => (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={copy.title} subtitle={subtitle} fallback="/bookings" />
      {children}
    </div>
  );

  if (read.state === "unavailable") {
    return shell(
      <EmptyState icon="calendar-home" title={copy.unavailableTitle} body={copy.unavailableBody} data-testid="tenancy-unavailable" />,
    );
  }
  if (read.state !== "ready") {
    return shell(
      <EmptyState
        icon="calendar-home"
        title={copy.missingTitle}
        body={copy.missingBody}
        action={<EmptyActions primary={{ label: t.catalogue.bookings.openBookings, href: "/bookings" }} />}
        data-testid="tenancy-missing"
      />,
    );
  }

  const file = read.file;
  return shell(
    <Stack>
      <TenancyHead file={file} copy={copy} />
      <MoneySection file={file} copy={copy} />
      {file.viewer === "tenant" && file.paid && (
        <Section>
          <ReceiptCodePanel tenancyId={file.id} live={file.receiptCode} copy={t.afterTheGate.receipt} />
        </Section>
      )}
      <CautionSection file={file} copy={copy} />
      <PromiseSection file={file} copy={copy} />
      <Section title={copy.evidenceHeading} divided>
        <p className={TYPE.body} data-testid="tenancy-viewing">
          <span className="font-semibold">{copy.viewingReport}: </span>
          {file.viewing?.submittedLabel
            ? copy.viewingSubmitted.replace("{date}", file.viewing.submittedLabel).replace("{ticked}", String(file.viewing.ticked))
            : copy.viewingNone}
        </p>
        <div className="mt-md grid gap-md sm:grid-cols-2">
          {file.reports.map((report) => (
            <TenancyReportCard
              key={report.stage}
              tenancyId={file.id}
              report={report}
              copy={copy}
              locale={locale}
              canWrite={file.viewer !== "staff" && file.paid}
            />
          ))}
        </div>
      </Section>
      <Section title={copy.pinsHeading} divided>
        {file.pins.length === 0 ? (
          <p className={TYPE.body}>{copy.pinsNone}</p>
        ) : (
          <ul className="grid gap-sm">
            {file.pins.map((pin) => (
              <li key={pin.id} className="nf-card p-card">
                <p className="nf-caption">{pin.date}</p>
                <p className="nf-body-sm mt-2xs whitespace-pre-line">{pin.body}</p>
              </li>
            ))}
          </ul>
        )}
        <p className="nf-caption mt-md">{copy.retention.replace("{date}", file.keptUntilLabel)}</p>
      </Section>
    </Stack>,
    file.area || undefined,
  );
}

type Copy = ReturnType<typeof getDictionary>["afterTheGate"]["tenancy"];

function TenancyHead({ file, copy }: { file: TenancyFile; copy: Copy }) {
  return (
    <Section>
      <h2 className="nf-h3">{file.title}</h2>
      <p className={`mt-2xs nf-numeric ${TYPE.body}`}>
        {copy.periodLine.replace("{start}", file.moveInLabel).replace("{end}", file.endsOnLabel)}
      </p>
      <p className={`mt-2xs ${TYPE.rowMeta}`}>{copy.renews.replace("{date}", file.endsOnLabel)}</p>
      {file.viewer === "tenant" && file.listerName && (
        <p className={`mt-2xs ${TYPE.rowMeta}`}>{copy.partiesTenant.replace("{name}", file.listerName)}</p>
      )}
    </Section>
  );
}

function MoneySection({ file, copy }: { file: TenancyFile; copy: Copy }) {
  return (
    <Section title={copy.moneyHeading} divided>
      <dl className="grid gap-xs" data-testid="tenancy-money">
        {file.lines.map((line) => (
          <div key={line.label} className="flex items-baseline justify-between gap-md">
            <dt className="nf-body-sm text-[var(--nf-content-secondary)]">{line.label}</dt>
            <dd className="nf-body-sm nf-numeric font-semibold">{line.display}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-md border-t border-[var(--nf-line)] pt-xs">
          <dt className="nf-body font-semibold">{copy.totalPaid}</dt>
          <dd className="nf-body nf-numeric font-semibold">{file.total}</dd>
        </div>
      </dl>
      <h3 className="nf-h4 mt-md">{copy.receiptsHeading}</h3>
      {file.receipts.length === 0 ? (
        <p className={`mt-xs ${TYPE.body}`}>{copy.noReceipt}</p>
      ) : (
        <ul className="mt-xs grid gap-xs">
          {file.receipts.map((receipt) => (
            <li key={receipt.id} className="nf-body-sm">
              <span className="nf-numeric font-semibold">
                {copy.receiptLine.replace("{amount}", receipt.amount).replace("{date}", receipt.date)}
              </span>
              {receipt.reference && (
                <span className="nf-caption block nf-numeric">{copy.receiptRef.replace("{ref}", receipt.reference)}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function CautionSection({ file, copy }: { file: TenancyFile; copy: Copy }) {
  const caution = file.caution;
  return (
    <Section title={copy.cautionHeading} divided>
      {!caution ? (
        <p className={TYPE.body} data-testid="tenancy-caution-empty">
          {file.cautionPending ? copy.cautionNotOpen : copy.cautionNone}
        </p>
      ) : (
        <div className="grid gap-md" data-testid="tenancy-caution">
          <div>
            <p className="nf-body font-semibold nf-numeric">
              {copy.cautionOwed.replace("{amount}", caution.amount).replace("{date}", caution.dueOnLabel)}
            </p>
            <p className={`mt-2xs ${TYPE.rowMeta}`}>{copy.cautionStates[caution.state]}</p>
            <p className="nf-body-sm mt-2xs nf-numeric text-[var(--nf-content-secondary)]">
              {copy.cautionCovered
                .replace("{returned}", caution.returned)
                .replace("{deducted}", caution.deducted)
                .replace("{outstanding}", caution.outstanding)}
            </p>
            <p className="nf-caption mt-xs">{copy.cautionNotHeld}</p>
          </div>

          {caution.returns.length > 0 && (
            <ul className="grid gap-2xs">
              {caution.returns.map((row, index) => (
                <li key={index} className="nf-body-sm nf-numeric">
                  {copy.returnedLine.replace("{amount}", row.amount).replace("{date}", row.date)}
                </li>
              ))}
            </ul>
          )}

          {caution.deductions.length > 0 && (
            <div>
              <h3 className="nf-h4">{copy.deductionsHeading}</h3>
              <ul className="mt-xs grid gap-sm">
                {caution.deductions.map((deduction) => (
                  <li key={deduction.id} className="nf-card p-card">
                    <p className="nf-body-sm nf-numeric font-semibold">
                      {copy.deductionLine.replace("{item}", ROOM_COPY[deduction.item].title).replace("{amount}", deduction.amount)}
                    </p>
                    {deduction.note && <p className="nf-body-sm mt-2xs">{deduction.note}</p>}
                    {deduction.photoUrl && (
                      // A signed, short-lived URL to a private object.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={deduction.photoUrl} alt="" className="mt-xs h-24 w-24 rounded-[var(--nf-radius-sm)] object-cover" />
                    )}
                    <p className="nf-caption mt-xs">
                      {deduction.answer === "accepted"
                        ? copy.deductionAccepted
                        : deduction.answer === "disputed"
                          ? copy.deductionDisputed
                          : copy.deductionPending}
                    </p>
                    {file.viewer === "tenant" && deduction.answer === null && (
                      <DeductionAnswer tenancyId={file.id} deductionId={deduction.id} copy={copy} />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {file.viewer === "lister" && caution.state !== "returned" && (
            <>
              <div className="nf-panel nf-panel--card block p-md">
                <h3 className="nf-h4">{copy.proposeHeading}</h3>
                <div className="mt-sm">
                  <ProposeDeduction
                    tenancyId={file.id}
                    obligationId={caution.obligationId}
                    copy={copy}
                    photos={(file.reports.find((report) => report.stage === "move_out")?.photos ?? []).map((photo, index) => ({
                      id: photo.id,
                      item: photo.item,
                      label: `${photo.item ? ROOM_COPY[photo.item].title : copy.moveOut} ${index + 1}`,
                    }))}
                  />
                </div>
              </div>
              <div className="nf-panel nf-panel--card block p-md">
                <h3 className="nf-h4">{copy.returnHeading}</h3>
                <div className="mt-sm">
                  <RecordReturn
                    tenancyId={file.id}
                    obligationId={caution.obligationId}
                    sendHref={`/wallet/send?note=${encodeURIComponent("Caution return")}`}
                    copy={copy}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </Section>
  );
}

function PromiseSection({ file, copy }: { file: TenancyFile; copy: Copy }) {
  return (
    <Section title={copy.promiseHeading} divided>
      {!file.snapshot ? (
        <p className={TYPE.body}>{copy.promiseNone}</p>
      ) : (
        <div data-testid="tenancy-promise">
          <p className={`${TYPE.body} mb-md`}>{copy.promiseLede.replace("{date}", file.snapshot.takenAtLabel)}</p>
          <FactGrid facts={file.snapshot.facts} />
          {file.snapshot.description && (
            <p className="nf-body-sm mt-md whitespace-pre-line text-[var(--nf-content-secondary)]">{file.snapshot.description}</p>
          )}
        </div>
      )}
    </Section>
  );
}
