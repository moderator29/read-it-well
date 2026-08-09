"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { SegmentedProgress } from "@/components/ui/Progress";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { DocumentUploader, type ChosenFile } from "./DocumentUploader";
import {
  BUSINESS_SECTIONS,
  CONSENTS,
  missingFrom,
  progressLabel,
  stepsFor,
  type ConsentId,
  type DocumentKind,
  type KycSubmission,
  type KycSubmitResult,
} from "./kyc";

/**
 * The verification flow.
 *
 * SIX SCREENS AT MOST AND ONE TASK ON EACH. The header of every step carries
 * three things and only three: where you are ("Step 4 of 6") drawn as a
 * segmented bar you can count, a back control that is always present after the
 * first step, and the single question this step is asking. A step that asks two
 * questions is two steps.
 *
 * WHY THE STEP COUNT IS NOT A CONSTANT. The flow branches on whether the person
 * runs a property business, so somebody who says yes sees six steps and
 * somebody who says no sees five. `stepsFor` in `kyc.ts` owns that and this
 * component reads the length off it, which is why the progress bar grows by one
 * segment the instant the answer changes rather than lying in either direction.
 *
 * WHAT THIS COMPONENT DOES NOT KNOW. Where anything is stored. `submit` is a
 * prop, the payload is `KycSubmission`, and there is not a table name, a bucket
 * name or a column name anywhere in this directory. That is deliberate: the
 * storage is landing alongside this and a screen that guessed at its shape
 * would be wrong in a way that still compiles.
 *
 * WHEN SUBMISSION FAILS IT SAYS SO. `submit` returning `{ ok: false }` prints
 * the reason on the review step and leaves every answer where it was. It does
 * NOT show the submitted screen. The submitted screen is a promise that a human
 * is going to look at your passport, and showing it after a failed write is the
 * single worst lie this flow could tell.
 */

export function KycFlow({
  submit,
}: {
  /**
   * Sends the submission. Resolves with `{ ok: true }` only when it is
   * genuinely stored and queued for review.
   */
  submit: (submission: KycSubmission) => Promise<KycSubmitResult>;
}) {
  const [at, setAt] = useState(0);
  const [business, setBusiness] = useState<boolean | null>(null);
  const [documents, setDocuments] = useState<Partial<Record<DocumentKind, ChosenFile>>>({});
  const [businessDetails, setBusinessDetails] = useState<Record<string, string>>({});
  const [consents, setConsents] = useState<ConsentId[]>([]);
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const steps = stepsFor(business);
  const step = steps[Math.min(at, steps.length - 1)]!;
  const submission: KycSubmission = { documents, business: business === true, businessDetails, consents };

  if (sent) return <Submitted />;

  const back = () => {
    setFailure(null);
    setAt((i) => Math.max(0, i - 1));
  };
  const forward = () => {
    setFailure(null);
    setAt((i) => Math.min(steps.length - 1, i + 1));
  };

  /*
   * Whether THIS step may be left. Deliberately per step rather than one
   * validation at the end: being told on screen six that screen two was
   * incomplete is the thing that makes people abandon a form.
   */
  const canAdvance = (() => {
    switch (step.id) {
      case "identity-document":
        return Boolean(documents.identity);
      case "address-document":
        return Boolean(documents.address);
      case "business-question":
        return business !== null;
      case "business-details":
        return BUSINESS_SECTIONS.every((section) =>
          section.fields.every(
            (field) => field.optional || (businessDetails[field.name] ?? "").trim().length > 0,
          ),
        );
      case "consent":
        return CONSENTS.every((c) => consents.includes(c.id));
      default:
        return true;
    }
  })();

  async function send() {
    setSending(true);
    setFailure(null);
    const result = await submit(submission);
    setSending(false);
    if (result.ok) {
      setSent(true);
      return;
    }
    setFailure(result.message);
  }

  const gaps = missingFrom(submission);

  return (
    <div className="mx-auto max-w-xl">
      {/* ------------------------------------------------------------ header */}
      <div className="flex items-center gap-3">
        {/* The back control. Present from the second step onward, and it is a
            real control rather than a reliance on the browser's back button,
            which on a single-route wizard would leave the flow entirely. */}
        {at > 0 ? (
          <button
            type="button"
            onClick={back}
            aria-label={BACK}
            className="nf-icon-btn h-10 w-10 shrink-0"
          >
            <UiIcon name="arrow-left" size="md" />
          </button>
        ) : (
          <Link href="/profile" aria-label={LEAVE} className="nf-icon-btn h-10 w-10 shrink-0">
            <UiIcon name="close" size="md" />
          </Link>
        )}

        <p className="nf-numeric text-[0.8125rem] font-semibold text-[var(--nf-content-muted)]">
          {progressLabel(at, steps.length)}
        </p>
      </div>

      <SegmentedProgress
        steps={steps.length}
        current={at + 1}
        label={progressLabel(at, steps.length)}
        className="mt-3"
      />

      <h1 className="nf-h2 mt-6">{step.title}</h1>
      <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
        {step.hint}
      </p>

      {/* -------------------------------------------------------------- body */}
      <div className="mt-6 space-y-4">
        {step.id === "identity-document" && (
          <DocumentUploader
            kind="identity"
            file={documents.identity ?? null}
            onChange={(file) =>
              setDocuments((d) => ({ ...d, ...(file ? { identity: file } : { identity: undefined }) }))
            }
          />
        )}

        {step.id === "address-document" && (
          <DocumentUploader
            kind="address"
            file={documents.address ?? null}
            onChange={(file) =>
              setDocuments((d) => ({ ...d, ...(file ? { address: file } : { address: undefined }) }))
            }
          />
        )}

        {step.id === "business-question" && (
          /*
           * The branch. Two rows with a divider, the same shape as the role
           * sheet, because they are the same kind of decision: pick one of
           * these, and one of them is already true of you.
           */
          <ul className="divide-y divide-[var(--nf-divider)]">
            {[
              { value: true, label: BUSINESS_YES, detail: BUSINESS_YES_DETAIL },
              { value: false, label: BUSINESS_NO, detail: BUSINESS_NO_DETAIL },
            ].map((option) => (
              <li key={String(option.value)}>
                <button
                  type="button"
                  onClick={() => {
                    setBusiness(option.value);
                    /* Answering the question is enough to move on: a
                       confirmation tap after a two-option choice is a tap that
                       exists only to be counted. */
                    setAt((i) => i + 1);
                  }}
                  aria-pressed={business === option.value}
                  className="flex w-full items-center gap-3.5 px-1 py-4 text-left transition-colors hover:bg-[var(--nf-interactive-hover)]"
                >
                  <span className="nf-role-mark" aria-hidden="true">
                    <UiIcon name={option.value ? "building-apartment" : "user"} size="md" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-[0.8125rem] leading-snug text-[var(--nf-content-muted)]">
                      {option.detail}
                    </span>
                  </span>
                  <UiIcon
                    name="chevron-right"
                    size="sm"
                    className="shrink-0 text-[var(--nf-content-muted)]"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}

        {step.id === "business-details" &&
          /*
           * THREE GROUPS, NOT EIGHT BOXES.
           *
           * The reference platform stacks eight identically outlined inputs
           * with nothing between them, and it is the weakest screen in their
           * product: no way to judge how much is left, no way to tell which
           * fields belong together, no way to resume after an interruption
           * except by rereading every label. Each group here is a card with a
           * heading and one line saying why these fields are together, so this
           * is three small tasks rather than one long one.
           */
          BUSINESS_SECTIONS.map((section) => (
            <section key={section.heading} className="nf-card p-4 sm:p-5">
              <h2 className="text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
                {section.heading}
              </h2>
              <p className="mt-1 text-[0.8125rem] text-[var(--nf-content-muted)]">{section.note}</p>

              <div className="mt-4 space-y-3.5">
                {section.fields.map((field) => (
                  <TextField
                    key={field.name}
                    label={field.label}
                    hint={field.hint}
                    type={field.type ?? "text"}
                    required={!field.optional}
                    optionalText={field.optional ? OPTIONAL : undefined}
                    value={businessDetails[field.name] ?? ""}
                    onChange={(event) =>
                      setBusinessDetails((d) => ({ ...d, [field.name]: event.target.value }))
                    }
                  />
                ))}
              </div>
            </section>
          ))}

        {step.id === "consent" && (
          /*
           * THREE CHECKBOXES, SEPARATELY. One combined "I agree" tick is
           * convenient and is not consent: a statement of fact about the
           * documents, acceptance of a contract, and permission to run identity
           * and fraud checks are three different decisions, and under the NDPA
           * the third has to be specific and freely given.
           */
          <ul className="space-y-3">
            {CONSENTS.map((consent) => {
              const ticked = consents.includes(consent.id);
              return (
                <li key={consent.id}>
                  <label className="nf-card flex cursor-pointer items-start gap-3 p-4">
                    <input
                      type="checkbox"
                      checked={ticked}
                      onChange={(event) =>
                        setConsents((list) =>
                          event.target.checked
                            ? [...list, consent.id]
                            : list.filter((id) => id !== consent.id),
                        )
                      }
                      className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--nf-brand-primary)]"
                    />
                    <span className="min-w-0">
                      <span className="block text-[0.9375rem] font-medium leading-snug text-[var(--nf-content-primary)]">
                        {consent.label}
                      </span>
                      <span className="mt-1 block text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
                        {consent.detail}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        {step.id === "review" && (
          <>
            <ul className="nf-card divide-y divide-[var(--nf-divider)] p-0">
              <ReviewRow label={IDENTITY_ROW} value={documents.identity?.name ?? MISSING} />
              <ReviewRow label={ADDRESS_ROW} value={documents.address?.name ?? MISSING} />
              <ReviewRow label={BUSINESS_ROW} value={business ? YES : NO} />
              {business &&
                BUSINESS_SECTIONS.flatMap((s) => s.fields).map((field) => (
                  <ReviewRow
                    key={field.name}
                    label={field.label}
                    value={businessDetails[field.name]?.trim() || (field.optional ? DASH : MISSING)}
                  />
                ))}
            </ul>

            {/* Never "complete all required fields". The gaps are named. */}
            {gaps.length > 0 && (
              <div role="alert" className="nf-card p-4">
                <p className="text-[0.875rem] font-semibold text-[var(--nf-content-primary)]">
                  {GAPS_TITLE}
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-[0.8125rem] text-[var(--nf-content-secondary)]">
                  {gaps.map((gap) => (
                    <li key={gap}>{gap}</li>
                  ))}
                </ul>
              </div>
            )}

            {failure && (
              <p role="alert" className="text-[0.875rem] leading-relaxed text-[var(--nf-state-error)]">
                {failure}
              </p>
            )}
          </>
        )}
      </div>

      {/* ------------------------------------------------------------ footer */}
      {step.id !== "business-question" && (
        <div className="mt-7">
          {step.id === "review" ? (
            <Button
              variant="primary"
              size="lg"
              full
              loading={sending}
              disabled={gaps.length > 0}
              onClick={send}
            >
              {SEND}
            </Button>
          ) : (
            <Button variant="primary" size="lg" full disabled={!canAdvance} onClick={forward}>
              {CONTINUE}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-baseline justify-between gap-4 px-4 py-3">
      <span className="shrink-0 text-[0.8125rem] text-[var(--nf-content-muted)]">{label}</span>
      <span className="truncate text-right text-[0.875rem] text-[var(--nf-content-primary)]">
        {value}
      </span>
    </li>
  );
}

/**
 * Submitted.
 *
 * It says what happens next and roughly when, and both halves matter. "Thanks,
 * we will be in touch" is the version that generates the support ticket: it
 * leaves somebody who has just handed over a photograph of their passport with
 * no idea whether to wait an hour or a fortnight, and no idea what arriving
 * looks like. "A person reads it, most take one working day, we email you
 * either way, and if anything is wrong we say exactly what" is four facts they
 * can plan around.
 */
function Submitted() {
  return (
    <div className="mx-auto max-w-md py-8 text-center">
      <span className="nf-role-mark nf-role-mark--lg mx-auto" aria-hidden="true">
        <UiIcon name="calendar-booking" size="lg" />
      </span>
      <h1 className="nf-h2 mt-5">{SENT_TITLE}</h1>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
        {SENT_BODY}
      </p>
      <p className="mt-3 text-[0.875rem] leading-relaxed text-[var(--nf-content-muted)]">
        {SENT_MEANWHILE}
      </p>
      <Link
        href="/profile"
        className="mt-6 inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold text-[var(--nf-content-link)] underline-offset-4 hover:underline"
      >
        {SENT_ACTION}
        <UiIcon name="arrow-right" size="sm" />
      </Link>
    </div>
  );
}

/* --------------------------------------------------------------- the copy */
const BACK = "Back a step";
const LEAVE = "Leave verification";
const CONTINUE = "Continue";
const SEND = "Send for review";
const OPTIONAL = "Optional";
const BUSINESS_YES = "Yes, I run a property business";
const BUSINESS_YES_DETAIL = "An agency, a management company, or anything registered with the CAC.";
const BUSINESS_NO = "No, this is just me";
const BUSINESS_NO_DETAIL = "You are listing or selling your own property.";
const IDENTITY_ROW = "Government issued ID";
const ADDRESS_ROW = "Proof of address";
const BUSINESS_ROW = "Property business";
const YES = "Yes";
const NO = "No";
const DASH = "Not given";
const MISSING = "Missing";
const GAPS_TITLE = "Still needed before this can be sent";
const SENT_TITLE = "Sent for review";
const SENT_BODY =
  "A person on our team reads every submission by hand. Most decisions come back within one working day, and we email you either way.";
const SENT_MEANWHILE =
  "You can keep drafting listings while you wait. They publish the moment you are approved. If anything is wrong with a document we tell you exactly what and you replace just that one.";
const SENT_ACTION = "Back to your profile";
