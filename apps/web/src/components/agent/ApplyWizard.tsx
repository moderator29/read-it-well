"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { Dictionary } from "@naijafinds/i18n";
import {
  submitAgentApplication,
  type ApplicationField,
  type ApplicationResult,
} from "@/lib/agent/application";
import { NIGERIAN_BANKS, NIGERIAN_STATES } from "@/lib/data/nigeria";
import { createClient } from "@/lib/supabase/client";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button } from "@/components/ui/Button";
import { PhoneField } from "@/components/app/PhoneField";
import { SegmentedProgress } from "@/components/ui/Progress";
import { Switch } from "@/components/ui/Switch";
import { TextField, SelectField as UiSelectField } from "@/components/ui/Field";

const EMPTY: ApplicationResult = { ok: false };
const DRAFT_KEY = "nf_agent_application_draft";
const DOCUMENT_BUCKET = "agent-documents";

/** Refuse a file too big to be a photo of an ID, before it leaves the phone. */
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

type Values = Record<string, string>;
type AgentType = "individual" | "business";

/**
 * One document slot's state.
 *
 * `path` is the only field that matters to the server: it is the object in the
 * private bucket. `preview` is a local blob URL purely so the applicant can see
 * what they picked, and it is deliberately not what proves the upload happened.
 * The wizard used to hold nothing but that preview, which is why every
 * application ever filed arrived with no documents attached to it.
 */
type DocumentSlot = {
  preview?: string;
  path?: string;
  fileName: string;
  isPdf: boolean;
  uploading: boolean;
  error?: string;
};

/**
 * Which step owns each field the server is allowed to reject.
 *
 * Every step of this form stays mounted and is merely `hidden`, which is what
 * lets one submit carry all six steps' fields. The cost of that decision was a
 * dead end nobody could get out of: the applicant is standing on the review
 * step when the action answers, and a rejected first name renders its message
 * inside a `hidden` fieldset five steps behind them. They saw the button stop
 * spinning and nothing else. No sentence, no highlight, no clue which of
 * thirteen fields was wrong, and pressing Submit again produced the same
 * silence, forever. That is the single worst thing this flow could do to
 * somebody ten minutes into an application, and it is indistinguishable from
 * the platform being broken.
 *
 * So the wizard now walks to the earliest step the server complained about.
 * The field errors were already being rendered correctly by the shared field
 * primitives; the only thing missing was standing in front of them. Earliest
 * rather than any, because an applicant fixing errors from the top down passes
 * every later one on the way back to Submit, whereas jumping to the last error
 * hides the earlier ones behind them a second time.
 *
 * The map is written out rather than derived because the step indices are
 * already literals in this file (`hidden={step !== 3}`), and one table a reader
 * can check against those literals is safer than a clever derivation that
 * silently drifts from them.
 */
const STEP_OF_FIELD: Record<ApplicationField, number> = {
  firstName: 0,
  lastName: 0,
  phone: 0,
  idType: 1,
  idNumber: 1,
  businessName: 2,
  rcNumber: 2,
  state: 2,
  city: 2,
  address: 2,
  documents: 3,
  bankName: 4,
  accountNumber: 4,
  accountName: 4,
  agreeTerms: 5,
};

/** A stable folder per wizard session, so retries do not scatter objects. */
function newBatchId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `b-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  }
}

/** The file extension to store under, from the type rather than the name. */
function extensionFor(file: File): string {
  if (file.type === "application/pdf") return "pdf";
  if (file.type === "image/png") return "png";
  return "jpg";
}

const TEXT_FIELDS = [
  "firstName", "lastName", "phone", "idType", "idNumber",
  "businessName", "rcNumber", "state", "city", "address",
  "bankName", "accountNumber", "accountName",
] as const;

/**
 * A document slot as it survives a closed tab.
 *
 * The preview is a blob URL and dies with the page, which is why it is not
 * here. The path is not: it names an object that is already sitting in the
 * private bucket, uploaded under this account's own folder, and it stays there
 * whether or not the browser remembers it. The file name and the PDF flag come
 * along only so the restored slot can say which file it is holding instead of
 * looking like an empty one.
 */
type StoredDocument = { kind: string; path: string; fileName: string; isPdf: boolean };

type StoredDraft = {
  values?: Values;
  agentType?: AgentType;
  batchId?: string;
  documents?: StoredDocument[];
};

/** Read back the document half of a stored draft, discarding anything odd. */
function slotsFrom(stored: StoredDocument[] | undefined): Record<string, DocumentSlot> {
  const out: Record<string, DocumentSlot> = {};
  if (!Array.isArray(stored)) return out;
  for (const item of stored) {
    if (item === null || typeof item !== "object") continue;
    if (typeof item.kind !== "string" || typeof item.path !== "string") continue;
    if (item.kind.length === 0 || item.path.length === 0) continue;
    out[item.kind] = {
      path: item.path,
      fileName: typeof item.fileName === "string" ? item.fileName : "",
      isPdf: item.isPdf === true,
      uploading: false,
    };
  }
  return out;
}

/**
 * The role the person switched into, mapped to the column the database keeps.
 *
 * There is no third kind of agent row: `individual` is somebody listing their
 * own property and `business` is somebody doing it professionally, which is
 * exactly the two profiles the switch-profile sheet offers. So once the sheet
 * has been used the type is ALREADY ANSWERED, and asking again on step one is
 * asking somebody to repeat the decision that got them here.
 */
const TYPE_OF_ROLE: Record<SetupRole, AgentType> = {
  owner: "individual",
  professional: "business",
};

export type SetupRole = "owner" | "professional";

export function ApplyWizard({ t, role }: { t: Dictionary; role?: SetupRole }) {
  const a = t.agent.apply;
  const stepTitles = [a.steps.personal, a.steps.identity, a.steps.business, a.steps.documents, a.steps.payout, a.steps.review];

  const [step, setStep] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [agentType, setAgentType] = useState<AgentType>(
    role ? TYPE_OF_ROLE[role] : "individual",
  );
  const [values, setValues] = useState<Values>({});
  const [docs, setDocs] = useState<Record<string, DocumentSlot>>({});
  const [state, formAction, pending] = useActionState(submitAgentApplication, EMPTY);
  const restored = useRef(false);

  /* A lazy ref rather than `useMemo`, because a restored draft has to be able
     to REPLACE this before the first upload runs. Re-uploading a slot into the
     batch its earlier attempt used overwrites that object (`upsert: true`)
     instead of leaving a stray copy of somebody's identity document behind in
     a private bucket that nothing will ever collect. */
  const batchId = useRef<string | null>(null);
  if (batchId.current === null) batchId.current = newBatchId();

  // What the server action is actually given: the objects that exist in the
  // bucket, never the local previews.
  const manifest = useMemo(
    () =>
      Object.entries(docs)
        .filter(([, slot]) => typeof slot.path === "string")
        .map(([kind, slot]) => ({ kind, path: slot.path })),
    [docs],
  );
  const uploading = Object.values(docs).some((slot) => slot.uploading);

  /*
   * Restore draft once, on mount (Master Rule 57).
   *
   * The documents come back too, and that is the point of the change. Photos
   * of both sides of an ID are the slowest step of this form by a wide margin
   * on a Nigerian mobile connection, and they were the one part of it that did
   * not survive a closed tab: the objects were sitting in the bucket the whole
   * time, uploaded and paid for in data, while the wizard had forgotten their
   * paths and asked for them again. A host who put the phone down at the
   * documents step and came back an hour later was made to re-shoot and
   * re-upload work that had already succeeded, which is precisely the point in
   * the flow where somebody decides this is not worth it.
   *
   * Nothing is trusted on the way back in. Every restored path is re-checked
   * server side against the caller's own uid prefix before it is recorded, the
   * same check a fresh upload passes, so a tampered localStorage entry can only
   * ever name an object this account already owns.
   */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as StoredDraft;
        if (d.values) setValues(d.values);
        /* A draft never overrides the profile that was just switched into. The
           person chose Seller or Realtor a screen ago; a week-old draft saying
           the other one would silently file the wrong kind of application. */
        if (d.agentType && !role) setAgentType(d.agentType);
        if (typeof d.batchId === "string" && d.batchId.length > 0) batchId.current = d.batchId;
        const slots = slotsFrom(d.documents);
        if (Object.keys(slots).length > 0) setDocs(slots);
      }
    } catch {
      /* ignore malformed draft */
    }
    restored.current = true;
    /* `role` is a route parameter and cannot change while this is mounted, so
       the restore still runs exactly once. It is listed because the effect
       reads it. */
  }, [role]);

  // Autosave after the first restore so we never overwrite the draft with empty.
  useEffect(() => {
    if (!restored.current) return;
    try {
      const documents: StoredDocument[] = Object.entries(docs)
        .filter(([, slot]) => typeof slot.path === "string")
        .map(([kind, slot]) => ({
          kind,
          path: slot.path as string,
          fileName: slot.fileName,
          isPdf: slot.isPdf,
        }));
      const draft: StoredDraft = { values, agentType, batchId: batchId.current ?? "", documents };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* storage full or unavailable, non-fatal */
    }
  }, [values, agentType, docs]);

  /*
   * Once the application is filed, the draft has done its job and keeping it
   * is a hazard rather than a courtesy: the next visit to this page would
   * reload thirteen fields belonging to an application that already exists and
   * invite the applicant to file it a second time.
   */
  useEffect(() => {
    if (!state.ok) return;
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* nothing depends on this */
    }
  }, [state.ok]);

  /*
   * Stand in front of whatever the server refused. See STEP_OF_FIELD above for
   * why this is not cosmetic: without it a rejected field on a hidden step is
   * a submit button that does nothing and says nothing.
   */
  useEffect(() => {
    const errors = state.fieldErrors;
    if (!errors) return;
    const steps = Object.keys(errors)
      .map((field) => STEP_OF_FIELD[field as ApplicationField])
      .filter((index): index is number => typeof index === "number");
    if (steps.length === 0) return;
    setStep(Math.min(...steps));
  }, [state]);

  function set(name: string, v: string) {
    setValues((prev) => ({ ...prev, [name]: v }));
  }

  /**
   * Take a chosen file and actually put it somewhere.
   *
   * The upload goes straight from the browser into the private agent-documents
   * bucket, under `<auth uid>/<batch>/<kind>.<ext>`, which storage RLS restricts
   * to this user's own folder. The preview is shown immediately so the wizard
   * feels instant, but the slot only counts as filled once the object exists and
   * a real path came back. Every failure says what happened in one sentence and
   * leaves the slot empty, so nobody submits believing a document went through.
   */
  async function onFile(name: string, file: File | undefined) {
    if (!file) return;

    if (file.size > MAX_DOCUMENT_BYTES) {
      setDocs((prev) => ({
        ...prev,
        [name]: {
          fileName: file.name,
          isPdf: false,
          uploading: false,
          error: "That file is over 10MB. Please choose a smaller photo or PDF.",
        },
      }));
      return;
    }

    const isPdf = file.type === "application/pdf";
    const preview = isPdf ? undefined : URL.createObjectURL(file);

    setDocs((prev) => {
      const old = prev[name];
      if (old?.preview) URL.revokeObjectURL(old.preview);
      return {
        ...prev,
        [name]: { fileName: file.name, isPdf, uploading: true, ...(preview ? { preview } : {}) },
      };
    });

    const finish = (patch: Partial<DocumentSlot>) => {
      setDocs((prev) => {
        const slot = prev[name];
        if (!slot) return prev;
        return { ...prev, [name]: { ...slot, uploading: false, ...patch } };
      });
    };

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        finish({
          error: "Please sign in before uploading, so the file is filed to your account.",
        });
        return;
      }

      const path = `${user.id}/${batchId.current}/${name}.${extensionFor(file)}`;
      const upload = await supabase.storage
        .from(DOCUMENT_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: true });

      if (upload.error) {
        finish({ error: "That upload did not go through. Please try again." });
        return;
      }

      finish({ path });
    } catch {
      finish({ error: "That upload did not go through. Please try again." });
    }
  }

  const last = stepTitles.length - 1;
  const err = state.fieldErrors;

  return (
    <div className="mx-auto max-w-2xl">
      {/*
        Progress, then the step markers.

        The 2px connector rules between the circles were the progress bar, and
        they told assistive technology nothing: `role="progressbar"` appeared
        nowhere in this codebase, so a screen reader user filling in a six-step
        application had no way to ask how much was left. `SegmentedProgress`
        states the position properly and animates the fill on the compositor.

        The numbered circles stay, because they are the only way back to a
        finished step, and each button keeps a 44pt target: `min-h-11` on the
        button itself rather than the `nf-tap` overlay, so the target is the
        control instead of a pseudo-element sitting over it.
      */}
      <SegmentedProgress
        steps={stepTitles.length}
        current={step + 1}
        /* The same "1 / 6" the footer already shows, plus the step's own name.
           There is no `stepCounter` key in this dictionary slice yet, so the
           bar reuses the wording that is already on the screen rather than
           inventing an English sentence in a four-locale flow. */
        label={`${step + 1} / ${stepTitles.length}: ${stepTitles[step]}`}
        className="mb-3"
      />
      <ol className="mb-2 flex items-start sm:mb-8" aria-label={a.title}>
        {stepTitles.map((title, i) => {
          const done = i < step;
          const current = i === step;
          return (
            /* Every marker takes an equal share now. `last:flex-none` existed
               only because the final step had no connector rule after it. */
            <li key={title} className="flex-1">
              <button
                type="button"
                onClick={() => i <= step && setStep(i)}
                disabled={i > step}
                aria-current={current ? "step" : undefined}
                className="flex min-h-11 w-full flex-col items-center justify-center gap-1.5"
                title={title}
              >
                <span
                  className="nf-numeric grid h-8 w-8 place-items-center rounded-full text-[0.75rem] font-bold transition-colors sm:h-9 sm:w-9 sm:text-[0.8125rem]"
                  style={{
                    background: done || current ? "var(--nf-gradient-agent)" : "var(--nf-surface-raised)",
                    color: done || current ? "var(--nf-content-on-brand)" : "var(--nf-content-muted)",
                  }}
                >
                  {done ? <UiIcon name="verified" size={16} /> : i + 1}
                </span>
                <span className="hidden max-w-[7rem] text-center text-[0.625rem] font-medium leading-tight text-[var(--nf-content-muted)] sm:block">
                  {title}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mb-5 text-center text-[0.75rem] font-semibold text-[var(--nf-content-secondary)] sm:hidden">
        {stepTitles[step]}
      </p>

      <form action={formAction} className="nf-card p-5 sm:p-8">
        {/* Keep every step in the DOM so all fields reach the server action;
            only the active step is shown. */}

        {/* The uploaded objects, as one field. Paths only: the server re-checks
            that every one sits under the caller's own uid before recording it. */}
        <input type="hidden" name="documents" value={JSON.stringify(manifest)} />

        {/* Step 1: Personal */}
        <fieldset hidden={step !== 0} className="space-y-4">
          <Legend title={a.steps.personal} />
          <div>
            <span className="nf-label">{a.agentType}</span>
            {role ? (
              /*
                ALREADY ANSWERED, SO STATED RATHER THAN ASKED.
                Arriving from the switch-profile sheet means the profile is
                chosen. Redrawing the two tiles here would invite somebody to
                contradict the choice that opened this form, and then the
                sheet's explanation and the wizard's answer disagree.
              */
              <p className="nf-body-sm text-[var(--nf-content-secondary)]">
                <span className="font-semibold text-[var(--nf-content-primary)]">
                  {agentType === "individual" ? a.individual : a.business}.{" "}
                </span>
                {agentType === "individual" ? a.individualDesc : a.businessDesc}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {(["individual", "business"] as AgentType[]).map((tp) => (
                  <button
                    type="button"
                    key={tp}
                    onClick={() => setAgentType(tp)}
                    aria-pressed={agentType === tp}
                    className={[
                      "rounded-[var(--nf-radius-lg)] border p-3 text-left transition-colors",
                      agentType === tp
                        ? "border-[var(--nf-border-brand)] bg-[color-mix(in_oklab,var(--nf-mode-agent)_14%,transparent)]"
                        : "border-[var(--nf-border-subtle)] hover:border-[var(--nf-border-default)]",
                    ].join(" ")}
                  >
                    <span className="nf-body-sm block font-semibold">
                      {tp === "individual" ? a.individual : a.business}
                    </span>
                    <span className="nf-caption block">
                      {tp === "individual" ? a.individualDesc : a.businessDesc}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <input type="hidden" name="agentType" value={agentType} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field name="firstName" label={a.fields.firstName} value={values} set={set} err={err} autoComplete="given-name" />
            <Field name="lastName" label={a.fields.lastName} value={values} set={set} err={err} autoComplete="family-name" />
          </div>
          {/* The applicant's own number, which is how the reviewer reaches
              them about their documents. It states +234, groups as it is
              typed, names the network and posts the canonical form, and it
              now applies the SAME rule the guest booking form does; this
              screen used to accept `01234567890`. */}
          <PhoneField
            id="phone"
            name="phone"
            label={a.fields.phone}
            value={values.phone ?? ""}
            onChange={(next) => set("phone", next)}
            error={err?.phone}
          />
        </fieldset>

        {/* Step 2: Identity */}
        <fieldset hidden={step !== 1} className="space-y-4">
          <Legend title={a.steps.identity} />
          <SelectField name="idType" label={a.fields.idType} value={values} set={set} err={err}
            options={["NIN", "BVN", "Passport", "Driver's Licence", "Voter's Card"]} />
          <Field name="idNumber" label={a.fields.idNumber} value={values} set={set} err={err} />
        </fieldset>

        {/* Step 3: Business / Location */}
        <fieldset hidden={step !== 2} className="space-y-4">
          <Legend title={a.steps.business} />
          {agentType === "business" && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field name="businessName" label={a.fields.businessName} value={values} set={set} err={err} />
              <Field name="rcNumber" label={a.fields.rcNumber} value={values} set={set} err={err} />
            </div>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField name="state" label={a.fields.state} value={values} set={set} err={err} options={[...NIGERIAN_STATES]} />
            <Field name="city" label={a.fields.city} value={values} set={set} err={err} />
          </div>
          <Field name="address" label={a.fields.address} value={values} set={set} err={err} autoComplete="street-address" />
        </fieldset>

        {/* Step 4: Documents */}
        <fieldset hidden={step !== 3} className="space-y-4">
          <Legend title={a.documents.title} sub={a.documents.body} />
          <div className="grid gap-5 sm:grid-cols-2">
            <UploadZone id="idFront" label={a.documents.idFront} hint={a.documents.chooseFile} slot={docs.idFront} onFile={onFile} />
            <UploadZone id="idBack" label={a.documents.idBack} hint={a.documents.chooseFile} slot={docs.idBack} onFile={onFile} />
            {agentType === "business" && (
              <UploadZone id="registration" label={a.documents.registration} hint={a.documents.chooseFile} slot={docs.registration} onFile={onFile} />
            )}
          </div>
          {err?.documents && (
            <p role="alert" className="text-[0.75rem] text-[var(--nf-state-error)]">
              {err.documents}
            </p>
          )}
          <p className="text-[0.75rem] leading-relaxed text-[var(--nf-content-muted)]">
            These files are stored privately and are only ever seen by the RentMe team reviewing
            your application. They are never shown on your public profile.
          </p>
        </fieldset>

        {/* Step 5: Payout */}
        <fieldset hidden={step !== 4} className="space-y-4">
          <Legend title={a.steps.payout} />
          <SelectField name="bankName" label={a.fields.bankName} value={values} set={set} err={err} options={[...NIGERIAN_BANKS]} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field name="accountNumber" label={a.fields.accountNumber} value={values} set={set} err={err} inputMode="numeric" />
            <Field name="accountName" label={a.fields.accountName} value={values} set={set} err={err} />
          </div>
        </fieldset>

        {/* Step 6: Review */}
        <fieldset hidden={step !== last} className="space-y-4">
          <Legend title={a.review.title} sub={a.review.body} />
          <dl className="nf-card divide-y divide-[var(--nf-border-subtle)] p-0">
            {TEXT_FIELDS.filter((f) => values[f]).map((f) => (
              <div key={f} className="flex items-center justify-between gap-4 px-4 py-2.5 text-[0.8125rem]">
                <dt className="text-[var(--nf-content-muted)]">{a.fields[f as keyof typeof a.fields] ?? f}</dt>
                <dd className="font-medium [overflow-wrap:anywhere]">{values[f]}</dd>
              </div>
            ))}
          </dl>

          {/*
            The terms gate.

            This was a raw 16px native checkbox - a 16px target on the one
            control in the flow that is a legal acceptance, on a form built for
            one thumb. It is now a Switch: 52x32 painted, 44pt to hit, with a
            real `role="switch"` and its state announced.

            A switch is a button, so it submits nothing on its own. The hidden
            input carries the exact value the server action checks for ("on"),
            and only exists while the switch is on - so an unaccepted form
            reaches the action with the field absent, which is precisely what
            an unticked checkbox did.
          */}
          {agreed && <input type="hidden" name="agreeTerms" value="on" />}
          <Switch
            checked={agreed}
            onCheckedChange={setAgreed}
            label={a.fields.agreeTerms}
            className="rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] p-3"
          />
          {err?.agreeTerms && (
            <p role="alert" className="text-[0.75rem] text-[var(--nf-state-error)]">{err.agreeTerms}</p>
          )}

          {/*
            One box, two meanings, and until now it painted both of them as a
            problem. A filed application answers here with its NF-AGT reference,
            and it was arriving inside a warning-toned panel, which reads as
            "something went wrong" on the one screen where the applicant most
            needs to know that nothing did. The tone follows the outcome now:
            the four state tokens carry the meaning, so this picks the state
            rather than a colour.
          */}
          {state.message && (
            <p
              role="alert"
              className="rounded-[var(--nf-radius-md)] border px-3.5 py-2.5 text-[0.8125rem]"
              style={
                state.ok
                  ? {
                      borderColor: "color-mix(in oklab, var(--nf-state-success) 35%, transparent)",
                      background: "var(--nf-state-success-surface)",
                      color: "var(--nf-state-success)",
                    }
                  : {
                      borderColor: "color-mix(in oklab, var(--nf-state-warning) 35%, transparent)",
                      background: "var(--nf-state-warning-surface)",
                      color: "var(--nf-state-warning)",
                    }
              }
            >
              {state.message}
            </p>
          )}
        </fieldset>

        {/* Nav */}
        <div className="mt-7 flex items-center justify-between gap-4">
          <Button
            variant="secondary"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            leadingIcon="arrow-left"
          >
            {a.back}
          </Button>

          <span className="nf-numeric text-[0.75rem] text-[var(--nf-content-muted)]">
            {step + 1} / {stepTitles.length}
          </span>

          {step < last ? (
            <Button
              variant="primary"
              onClick={() => setStep((s) => Math.min(last, s + 1))}
              trailingIcon="arrow-right"
            >
              {a.next}
            </Button>
          ) : (
            /* Disabled once the application is filed. The action has no
               "already applied" guard of its own, so a second press wrote a
               second SUBMITTED row against the same account: two references
               support would be asked about, and two items in the review queue
               describing one person. The reference is on screen at that point,
               so there is nothing left for this button to do. */
            <Button
              type="submit"
              variant="primary"
              loading={pending || uploading}
              disabled={state.ok}
            >
              {a.submit}
            </Button>
          )}
        </div>
      </form>

      <p className="mt-3 text-center text-[0.75rem] text-[var(--nf-content-muted)]">{a.draftSaved}</p>
    </div>
  );
}

function Legend({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-2">
      <h2 className="nf-h3">{title}</h2>
      {sub && <p className="mt-1 text-[0.8125rem] text-[var(--nf-content-muted)]">{sub}</p>}
    </div>
  );
}

/*
 * Both wrappers now delegate to the shared field primitives.
 *
 * They used to set `aria-invalid` on a `.nf-field` and render the message
 * beneath it. That class paints its border with a border-box gradient, and the
 * error rule beside it sets `border-color` - a surface the gradient covers - so
 * an invalid field looked exactly as it had a moment earlier. Thirteen fields
 * on this form, every one of them silently invalid. The primitive replaces the
 * gradient's own border-box layer and adds a ring, and wires the label, the
 * error id and `aria-describedby` on the way past.
 */
function Field({
  name, label, value, set, err, type = "text", placeholder, autoComplete, inputMode,
}: {
  name: string; label: string; value: Values; set: (n: string, v: string) => void;
  err?: Record<string, string>; type?: string; placeholder?: string; autoComplete?: string;
  inputMode?: "numeric" | "text";
}) {
  return (
    <TextField
      name={name}
      label={label}
      type={type}
      value={value[name] ?? ""}
      onChange={(ev) => set(name, ev.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      inputMode={inputMode}
      error={err?.[name]}
    />
  );
}

function SelectField({
  name, label, value, set, err, options,
}: {
  name: string; label: string; value: Values; set: (n: string, v: string) => void;
  err?: Record<string, string>; options: string[];
}) {
  return (
    <UiSelectField
      name={name}
      label={label}
      value={value[name] ?? ""}
      onChange={(ev) => set(name, ev.target.value)}
      error={err?.[name]}
    >
      <option value="" disabled style={{ background: "var(--nf-surface-elevated)" }}>Select</option>
      {options.map((o) => (
        <option key={o} value={o} style={{ background: "var(--nf-surface-elevated)" }}>{o}</option>
      ))}
    </UiSelectField>
  );
}

/**
 * One document slot.
 *
 * The three states it can be in are all visible, because "did my ID actually
 * upload" is the single question this step has to answer honestly: uploading,
 * uploaded (a tick, not just a picture), or failed with the reason. A preview
 * alone would look identical whether the bytes reached the bucket or not.
 */
function UploadZone({
  id, label, hint, slot, onFile,
}: {
  id: string; label: string; hint: string; slot?: DocumentSlot;
  onFile: (name: string, file: File | undefined) => void;
}) {
  const done = typeof slot?.path === "string";
  /* A slot restored from a stored draft has a real object behind it and no
     preview, because the blob URL died with the page that made it. Naming the
     file is what stops that slot from looking like an empty one sitting under
     an "Uploaded" tick, which is a contradiction the applicant would resolve by
     uploading the document a second time. */
  const named = slot !== undefined && !slot.preview && (slot.isPdf || done);
  return (
    <div>
      <span className="nf-label">{label}</span>
      <label
        htmlFor={id}
        aria-busy={slot?.uploading ? true : undefined}
        className={[
          "relative flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-[var(--nf-radius-lg)] border border-dashed bg-[var(--nf-surface-inset)] text-center transition-colors",
          slot?.error
            ? "border-[var(--nf-state-error)]"
            : done
              ? "border-[var(--nf-border-brand)]"
              : "border-[var(--nf-border-default)] hover:border-[var(--nf-border-brand)]",
        ].join(" ")}
      >
        {slot?.preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={slot.preview} alt="" className="h-full w-full object-cover" />
        ) : named && slot ? (
          /* A PDF has no thumbnail to show, and a restored slot no longer has
             one, so the file itself is the label in both cases. */
          <>
            {slot.isPdf && (
              <span className="rounded-[var(--nf-radius-xs)] border border-[var(--nf-border-default)] px-1.5 py-0.5 text-[0.625rem] font-bold tracking-wide text-[var(--nf-content-secondary)]">
                PDF
              </span>
            )}
            <span className="max-w-full truncate px-3 text-[0.6875rem] text-[var(--nf-content-secondary)]">
              {slot.fileName}
            </span>
          </>
        ) : (
          <>
            <UiIcon name="sparkle" size={28} className="text-[var(--nf-content-muted)]" />
            <span className="px-3 text-[0.6875rem] text-[var(--nf-content-muted)]">{hint}</span>
          </>
        )}

        {slot?.uploading && (
          <span className="absolute inset-0 grid place-items-center bg-[color-mix(in_oklab,var(--nf-surface-inset)_82%,transparent)] text-[0.6875rem] font-semibold text-[var(--nf-content-secondary)]">
            Uploading...
          </span>
        )}
        {done && !slot?.uploading && (
          <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-[var(--nf-radius-pill)] bg-[var(--nf-brand-primary)] px-2 py-0.5 text-[0.625rem] font-bold text-[var(--nf-content-on-brand)]">
            <UiIcon name="verified" size={12} />
            Uploaded
          </span>
        )}
      </label>
      {slot?.error && (
        <p role="alert" className="mt-1 text-[0.6875rem] text-[var(--nf-state-error)]">
          {slot.error}
        </p>
      )}
      <input
        id={id}
        type="file"
        accept="image/png,image/jpeg,application/pdf"
        className="sr-only"
        onChange={(e) => {
          void onFile(id, e.target.files?.[0]);
        }}
      />
    </div>
  );
}
