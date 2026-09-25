import type { Metadata } from "next";
import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getTenancyFile, type TenancyFile } from "@/lib/tenancy/queries";
import { PageHeader } from "@/components/app/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState, FactGrid, Section, Stack, TYPE } from "@/components/app/Screen";
import { EmptyActions } from "@/components/app/EmptyActions";
import { ROOM_COPY } from "@/lib/inspections/report";
import { DeductionAnswer, ProposeDeduction } from "@/components/app/tenancy/CautionControls";
import { MONEY_BETWEEN_PEOPLE_RETIRED } from "@/lib/tenancy/money-copy";
import { koboToNairaInput } from "@/lib/agent/listings-schema";
import { TenancyReportCard } from "@/components/app/tenancy/TenancyReportCard";
import { ReceiptCodePanel } from "@/components/app/tenancy/ReceiptCodePanel";
import { PinMessages } from "@/components/app/tenancy/PinMessages";
import { AddFlatmate, RemoveFlatmate } from "@/components/app/tenancy/FlatmateControls";
import { ExitAccountForm, RelistButton, RenewalAnswer, RenewalOfferForm } from "@/components/app/tenancy/RenewalControls";

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
 * every other surface. The promise snapshot never copies the address,
 * landmark or coordinates; its title and description are the lister's own
 * words as written.
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
  const mates = t.afterTheGate.flatmates;
  return shell(
    <Stack>
      <TenancyHead file={file} copy={copy} />
      <MoneySection file={file} copy={copy} />
      {/* Flatmates' shares are the lead tenant's business, not the lister's. */}
      {file.viewer === "tenant" && (!file.void || file.flatmates.rows.some((row) => row.paid)) && (
        <FlatmatesSection file={file} copy={mates} locale={locale} />
      )}
      {file.viewer === "tenant" && file.paid && (
        <Section>
          <ReceiptCodePanel tenancyId={file.id} live={file.receiptCode} copy={t.afterTheGate.receipt} />
        </Section>
      )}
      <CautionSection file={file} copy={copy} locale={locale} />
      {file.paid && !file.void && <RenewalSection file={file} copy={copy} />}
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
              key={`${report.stage}-${report.id ?? "new"}`}
              tenancyId={file.id}
              report={report}
              copy={copy}
              locale={locale}
              canWrite={file.viewer !== "staff" && file.paid}
            />
          ))}
        </div>
      </Section>
      {file.viewer === "tenant" && file.paid && (
        <Section>
          <ButtonLink href={`/tenancy/${file.id}/complaint`} variant="secondary" full trailingIcon="arrow-right">
            {t.afterTheGate.complaint.open}
          </ButtonLink>
        </Section>
      )}
      {(file.pins.length > 0 || file.pinCandidates.length > 0) && (
        <Section title={copy.pinsHeading} divided>
          {file.pins.length > 0 && (
            <ul className="mb-md grid gap-sm">
              {file.pins.map((pin) => (
                <li key={pin.id} className="nf-card p-card">
                  <p className="nf-caption">{pin.date}</p>
                  <p className="nf-body-sm mt-2xs whitespace-pre-line">{pin.body}</p>
                </li>
              ))}
            </ul>
          )}
          <PinMessages tenancyId={file.id} candidates={file.pinCandidates} copy={copy} />
        </Section>
      )}
      <p className="nf-caption">{copy.retention.replace("{date}", file.keptUntilLabel)}</p>
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
      {/* The lister cannot read the tenant's payment rows, so the receipts are the tenant's and staff's. */}
      {file.viewer !== "lister" && <h3 className="nf-h4 mt-md">{copy.receiptsHeading}</h3>}
      {file.viewer === "lister" ? null : file.receipts.length === 0 ? (
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

function CautionSection({ file, copy }: { file: TenancyFile; copy: Copy; locale: Locale }) {
  const caution = file.caution;
  return (
    <Section title={copy.cautionHeading} divided>
      {file.void ? (
        <p className={TYPE.body} data-testid="tenancy-caution-void">
          {copy.cautionVoid}
        </p>
      ) : !caution ? (
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
                  {file.ended ? (
                    <ProposeDeduction
                      tenancyId={file.id}
                      obligationId={caution.obligationId}
                      copy={copy}
                      photos={file.reports
                        .filter((report) => report.stage === "move_out" && report.authorIsViewer && report.submitted)
                        .flatMap((report) => report.photos)
                        .map((photo, index) => ({
                          id: photo.id,
                          item: photo.item,
                          label: `${photo.item ? ROOM_COPY[photo.item].title : copy.moveOut} ${index + 1}`,
                        }))}
                    />
                  ) : (
                    <p className="nf-body-sm text-[var(--nf-content-secondary)]">
                      {copy.proposeNotEnded.replace("{date}", file.endsOnLabel)}
                    </p>
                  )}
                </div>
              </div>
              <div className="nf-panel nf-panel--card block p-md">
                <h3 className="nf-h4">{copy.returnHeading}</h3>
                <div className="mt-sm">
                  <p className={TYPE.body} data-testid="money-between-people-retired">{MONEY_BETWEEN_PEOPLE_RETIRED}</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </Section>
  );
}

function FlatmatesSection({
  file,
  copy,
}: {
  file: TenancyFile;
  copy: ReturnType<typeof getDictionary>["afterTheGate"]["flatmates"];
  locale: Locale;
}) {
  const mates = file.flatmates;
  if (mates.unavailable) {
    return (
      <Section title={copy.heading} divided>
        <p className={TYPE.body}>{copy.unavailable}</p>
      </Section>
    );
  }
  return (
    <Section title={copy.heading} description={copy.lede} divided>
      <div id="flatmates" className="grid gap-md" data-testid="tenancy-flatmates">
        {mates.rows.length > 0 && (
          <ul className="grid gap-sm">
            {mates.rows.map((row) => (
              <li key={row.id} className="nf-card flex flex-wrap items-start justify-between gap-sm p-card">
                <div className="min-w-0">
                  <p className="nf-body-sm nf-numeric font-semibold">
                    {copy.row.replace("{name}", row.name ?? copy.someone).replace("{share}", row.share)}
                  </p>
                  <p className="nf-caption mt-2xs">
                    {row.returned
                      ? copy.returnedLine
                      : row.paid
                        ? copy.paid
                        : row.answer === "declined"
                          ? copy.declined
                          : row.answer === "accepted"
                            ? copy.accepted
                            : copy.invited}
                  </p>
                  {row.cautionPart && (
                    <p className="nf-caption mt-2xs nf-numeric">{copy.cautionPart.replace("{amount}", row.cautionPart)}</p>
                  )}
                </div>
                {!row.paid && !file.void && <RemoveFlatmate tenancyId={file.id} contributorId={row.id} copy={copy} />}
                {row.paid && !row.returned && file.void && row.paidMinor !== null && (
                  <p className={TYPE.rowMeta}>{MONEY_BETWEEN_PEOPLE_RETIRED}</p>
                )}
              </li>
            ))}
          </ul>
        )}
        {file.void && <p className={TYPE.body}>{copy.voidLead}</p>}
        {!file.void && (
          <>
            <p className="nf-body-sm nf-numeric font-semibold">{copy.lead.replace("{share}", mates.leadShare)}</p>
            {mates.leadCautionPart && mates.rows.length > 0 && (
              <p className="nf-caption nf-numeric">{copy.leadCautionPart.replace("{amount}", mates.leadCautionPart)}</p>
            )}
            <div className="nf-panel nf-panel--card block p-md">
              <AddFlatmate tenancyId={file.id} copy={copy} />
            </div>
          </>
        )}
      </div>
    </Section>
  );
}

function RenewalSection({ file, copy }: { file: TenancyFile; copy: Copy }) {
  const renewal = file.renewal;
  if (renewal.unavailable) {
    return (
      <Section title={copy.renewalHeading} divided>
        <p className={TYPE.body}>{copy.renewalUnavailable}</p>
      </Section>
    );
  }
  const party = file.viewer !== "staff";
  return (
    <Section title={copy.renewalHeading} divided>
      <div className="grid gap-md" data-testid="tenancy-renewal">
        <p className="nf-body nf-numeric">
          {renewal.daysLeft >= 0
            ? copy.renewalDays.replace("{days}", String(renewal.daysLeft)).replace("{date}", file.endsOnLabel)
            : copy.renewalEnded.replace("{date}", file.endsOnLabel)}
        </p>
        {renewal.offer ? (
          <div>
            <p className="nf-body-sm nf-numeric font-semibold">
              {copy.renewalOffer
                .replace("{date}", renewal.offer.offeredOn)
                .replace("{total}", renewal.offer.total)
                .replace("{rent}", renewal.offer.rent)}
            </p>
            {renewal.offer.service && (
              <p className={`mt-2xs nf-numeric ${TYPE.rowMeta}`}>{copy.renewalService.replace("{amount}", renewal.offer.service)}</p>
            )}
            {renewal.offer.rise && (
              <p className={`mt-2xs nf-numeric ${TYPE.rowMeta}`}>
                {(file.viewer === "lister" ? copy.renewalRiseLister : copy.renewalRise)
                  .replace("{amount}", renewal.offer.rise)
                  .replace("{percent}", renewal.offer.percent ?? "")}
              </p>
            )}
            {renewal.offer.fall && (
              <p className={`mt-2xs nf-numeric ${TYPE.rowMeta}`}>
                {(file.viewer === "lister" ? copy.renewalFallLister : copy.renewalFall)
                  .replace("{amount}", renewal.offer.fall)
                  .replace("{percent}", renewal.offer.percent ?? "")}
              </p>
            )}
            {renewal.offer.fees && (
              <p className="nf-body-sm mt-2xs nf-numeric text-[var(--nf-state-warning)]">
                {copy.renewalFees.replace("{amount}", renewal.offer.fees)}
              </p>
            )}
          </div>
        ) : (
          <p className={TYPE.body}>{copy.renewalNoOffer}</p>
        )}
        {renewal.answer && (
          <p className={TYPE.rowMeta}>{renewal.answer === "renewing" ? copy.renewalAnswerRenewing : copy.renewalAnswerLeaving}</p>
        )}
        {file.viewer === "tenant" && renewal.answer === null && renewal.daysLeft >= 0 && (
          <RenewalAnswer tenancyId={file.id} copy={copy} />
        )}
        {party && renewal.answer === "renewing" && <p className="nf-caption">{copy.renewalPayNote}</p>}

        {file.viewer === "lister" && renewal.daysLeft >= 0 && (
          <div className="nf-panel nf-panel--card block p-md">
            <h3 className="nf-h4">{copy.renewalOfferHeading}</h3>
            <div className="mt-sm">
              <RenewalOfferForm
                tenancyId={file.id}
                rentNaira={koboToNairaInput(renewal.rentMinor)}
                serviceNaira={koboToNairaInput(renewal.serviceMinor)}
                copy={copy}
              />
            </div>
          </div>
        )}
        {file.viewer === "lister" && (
          <div className="nf-panel nf-panel--card block p-md">
            <h3 className="nf-h4">{copy.relistHeading}</h3>
            <div className="mt-sm">
              {renewal.successorId || renewal.relistOpen ? (
                <RelistButton tenancyId={file.id} successorId={renewal.successorId} copy={copy} />
              ) : (
                <p className="nf-body-sm text-[var(--nf-content-secondary)]">
                  {renewal.answer === "renewing" ? copy.relistBlocked : copy.relistOpensOn.replace("{date}", renewal.relistOpensOnLabel)}
                </p>
              )}
            </div>
          </div>
        )}
        {file.viewer === "tenant" && (renewal.exitAnswered || renewal.exitOpen) && (
          <div className="nf-panel nf-panel--card block p-md">
            <h3 className="nf-h4">{copy.exitHeading}</h3>
            <div className="mt-sm">
              {renewal.exitAnswered ? (
                <p className="nf-body-sm">{copy.exitDone}</p>
              ) : (
                <ExitAccountForm tenancyId={file.id} copy={copy} />
              )}
            </div>
          </div>
        )}
      </div>
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
