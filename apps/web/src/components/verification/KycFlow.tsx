"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { SegmentedProgress } from "@/components/ui/Progress";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ICON_PLATE_GLYPH, IconPlate } from "@/components/ui/IconPlate";
import { DocumentUploader } from "./DocumentUploader";
import { SuccessSheet } from "@/components/ui/SuccessSheet";
import { successCopy, type SuccessWords } from "@/lib/ui/success-moments";
import {
  BUSINESS_SECTIONS,
  CONSENTS,
  addressDateProblem,
  isSubtypeOf,
  lagosToday,
  missingFrom,
  progressLabel,
  stepsFor,
  type ConsentId,
  type DocumentKind,
  type KycDocument,
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
 * WHAT THIS COMPONENT DOES NOT KNOW. Where the rows go. `submit` is a prop and
 * the payload is `KycSubmission`; the uploader holds each file's real storage
 * path once it is up, and the server action files it.
 *
 * WHEN SUBMISSION FAILS IT SAYS SO. `submit` returning `{ ok: false }` prints
 * the reason on the review step and leaves every answer where it was. It does
 * NOT show the submitted screen. The submitted screen is a promise that a human
 * is going to look at your passport, and showing it after a failed write is the
 * single worst lie this flow could tell.
 */

export function KycFlow({
  submit,
  success,
}: {
  /** The page's `t.success`, for the "Documents sent" sheet. Absent, no sheet. */
  success?: SuccessWords;
  /**
   * Sends the submission. Resolves with `{ ok: true }` only when it is
   * genuinely stored and queued for review.
   */
  submit: (submission: KycSubmission) => Promise<KycSubmitResult>;
}) {
  const [at, setAt] = useState(0);
  const [business, setBusiness] = useState<boolean | null>(null);
  const [documents, setDocuments] = useState<Partial<Record<DocumentKind, KycDocument>>>({});
  /* One storage folder per visit, so a replaced photo lands beside the one
     it replaces rather than in a new folder every time. */
  const [batchId] = useState(() => {
    try {
      return crypto.randomUUID();
    } catch {
      return `b-${Date.now()}`;
    }
  });
  const [businessDetails, setBusinessDetails] = useState<Record<string, string>>({});
  const [consents, setConsents] = useState<ConsentId[]>([]);
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const steps = stepsFor(business);
  const step = steps[Math.min(at, steps.length - 1)]!;
  const submission: KycSubmission = { documents, business: business === true, businessDetails, consents };

  /* `sent` is set only by the action's own ok, so the sheet opens once, at
     filing, over the "in review" screen it leaves behind. */
  if (sent)
    return (
      <>
        <Submitted />
        {success ? <KycSentSheet copy={success} /> : null}
      </>
    );

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
        return Boolean(documents.identity) && isSubtypeOf("identity", documents.identity?.subtype);
      case "address-document":
        return (
          Boolean(documents.address) &&
          isSubtypeOf("address", documents.address?.subtype) &&
          addressDateProblem(documents.address?.issuedOn, lagosToday()) === null
        );
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
    if (sending) return;
    setSending(true);
    setFailure(null);
    let result: KycSubmitResult;
    try {
      result = await submit(submission);
    } catch {
      /* A dropped connection or a deploy between taps throws rather than
         answering. Nothing is lost: every answer is still on this screen. */
      result = { ok: false, message: SEND_UNREACHED };
    }
    setSending(false);
    if (result.ok) {
      /* The server revalidates /verification, so the next visit reads "in
         review" rather than an empty form. */
      setSent(true);
      return;
    }
    setFailure(result.message);
  }

  const gaps = missingFrom(submission);

  return (
    <div className="mx-auto max-w-xl">
      {/* ------------------------------------------------------------ header */}
      <div className="flex items-center gap-sm">
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

        <p className="nf-numeric text-[length:var(--nf-text-caption)] font-semibold text-[var(--nf-content-muted)]">
          {progressLabel(at, steps.length)}
        </p>
      </div>

      <SegmentedProgress
        steps={steps.length}
        current={at + 1}
        label={progressLabel(at, steps.length)}
        className="mt-sm"
      />

      <h1 className="nf-h2 mt-lg">{step.title}</h1>
      <p className="mt-2xs text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
        {step.hint}
      </p>

      {/* -------------------------------------------------------------- body */}
      <div className="mt-lg space-y-md">
        {step.id === "identity-document" && (
          <DocumentUploader
            kind="identity"
            batchId={batchId}
            file={documents.identity ?? null}
            onChange={(file) =>
              setDocuments((d) => ({ ...d, ...(file ? { identity: file } : { identity: undefined }) }))
            }
          />
        )}

        {step.id === "address-document" && (
          <DocumentUploader
            kind="address"
            batchId={batchId}
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
                  className="flex w-full items-center gap-sm px-2xs py-md text-left transition-colors hover:bg-[var(--nf-interactive-hover)]"
                >
                  <IconPlate size="md">
                    <UiIcon
                      name={option.value ? "building-apartment" : "user"}
                      size={ICON_PLATE_GLYPH.md}
                    />
                  </IconPlate>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[length:var(--nf-text-body-sm)] font-semibold text-[var(--nf-content-primary)]">
                      {option.label}
                    </span>
                    <span className="mt-3xs block text-[length:var(--nf-text-caption)] leading-snug text-[var(--nf-content-muted)]">
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
            <section key={section.heading} className="nf-panel nf-panel--card block p-md sm:p-lg">
              <h2 className="text-[length:var(--nf-text-body-sm)] font-semibold text-[var(--nf-content-primary)]">
                {section.heading}
              </h2>
              <p className="mt-2xs text-[length:var(--nf-text-caption)] text-[var(--nf-content-muted)]">{section.note}</p>

              <div className="mt-md space-y-sm">
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
          <ul className="space-y-sm">
            {CONSENTS.map((consent) => {
              const ticked = consents.includes(consent.id);
              return (
                <li key={consent.id}>
                  <label className="nf-panel nf-panel--card flex-row cursor-pointer items-start gap-sm">
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
                      className="mt-3xs h-5 w-5 shrink-0 accent-[var(--nf-brand-primary)]"
                    />
                    <span className="min-w-0">
                      <span className="block text-[length:var(--nf-text-body-sm)] font-medium leading-snug text-[var(--nf-content-primary)]">
                        {consent.label}
                      </span>
                      <span className="mt-2xs block text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-muted)]">
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
            <ul className="nf-panel nf-panel--card block divide-y divide-[var(--nf-divider)] p-0">
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
              <div role="alert" className="nf-panel nf-panel--card block border-[color-mix(in_oklab,var(--nf-state-error)_55%,transparent)]">
                <p className="text-[length:var(--nf-text-body-sm)] font-semibold text-[var(--nf-content-primary)]">
                  {GAPS_TITLE}
                </p>
                <ul className="mt-xs list-disc space-y-2xs pl-lg text-[length:var(--nf-text-caption)] text-[var(--nf-content-secondary)]">
                  {gaps.map((gap) => (
                    <li key={gap}>{gap}</li>
                  ))}
                </ul>
              </div>
            )}

            {failure && (
              <p role="alert" className="text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-state-error)]">
                {failure}
              </p>
            )}
          </>
        )}
      </div>

      {/* ------------------------------------------------------------ footer */}
      {step.id !== "business-question" && (
        <div className="mt-lg">
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
    <li className="flex items-baseline justify-between gap-md px-md py-sm">
      <span className="shrink-0 text-[length:var(--nf-text-caption)] text-[var(--nf-content-muted)]">{label}</span>
      <span className="truncate text-right text-[length:var(--nf-text-body-sm)] text-[var(--nf-content-primary)]">
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
    <div className="mx-auto max-w-md py-xl text-center">
      <IconPlate size="lg" className="mx-auto">
        <UiIcon name="calendar-booking" size={ICON_PLATE_GLYPH.lg} />
      </IconPlate>
      <h1 className="nf-h2 mt-md">{SENT_TITLE}</h1>
      <p className="mt-sm text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
        {SENT_BODY}
      </p>
      <p className="mt-sm text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-muted)]">
        {SENT_MEANWHILE}
      </p>
      <Link
        href="/profile"
        className="mt-lg inline-flex items-center gap-2xs text-[length:var(--nf-text-body-sm)] font-semibold text-[var(--nf-content-link)] underline-offset-4 hover:underline"
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
const SEND_UNREACHED =
  "We could not reach Vallo to send this. Nothing was lost. Check your connection and press Send for review again.";
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

/** "Documents sent", once, over the in-review screen. */
function KycSentSheet({ copy }: { copy: SuccessWords }) {
  const [open, setOpen] = useState(true);
  const words = successCopy(copy, "kycSubmitted");
  return (
    <SuccessSheet
      open={open}
      onOpenChange={setOpen}
      variant={words.variant}
      title={words.title}
      body={words.body}
      primary={{ label: copy.continue }}
    />
  );
}
