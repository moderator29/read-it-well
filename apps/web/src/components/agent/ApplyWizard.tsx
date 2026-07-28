"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { Dictionary } from "@naijafinds/i18n";
import { submitAgentApplication, type ApplicationResult } from "@/lib/agent/application";
import { NIGERIAN_BANKS, NIGERIAN_STATES } from "@/lib/data/nigeria";
import { UiIcon } from "@/design-system/icons/UiIcon";

const EMPTY: ApplicationResult = { ok: false };
const DRAFT_KEY = "nf_agent_application_draft";

type Values = Record<string, string>;
type AgentType = "individual" | "business";

const TEXT_FIELDS = [
  "firstName", "lastName", "phone", "idType", "idNumber",
  "businessName", "rcNumber", "state", "city", "address",
  "bankName", "accountNumber", "accountName",
] as const;

export function ApplyWizard({ t }: { t: Dictionary }) {
  const a = t.agent.apply;
  const stepTitles = [a.steps.personal, a.steps.identity, a.steps.business, a.steps.documents, a.steps.payout, a.steps.review];

  const [step, setStep] = useState(0);
  const [agentType, setAgentType] = useState<AgentType>("individual");
  const [values, setValues] = useState<Values>({});
  const [docs, setDocs] = useState<Record<string, string>>({});
  const [state, formAction, pending] = useActionState(submitAgentApplication, EMPTY);
  const restored = useRef(false);

  // Restore draft once, on mount (Master Rule 57).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as { values?: Values; agentType?: AgentType };
        if (d.values) setValues(d.values);
        if (d.agentType) setAgentType(d.agentType);
      }
    } catch {
      /* ignore malformed draft */
    }
    restored.current = true;
  }, []);

  // Autosave after the first restore so we never overwrite the draft with empty.
  useEffect(() => {
    if (!restored.current) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ values, agentType }));
    } catch {
      /* storage full or unavailable, non-fatal */
    }
  }, [values, agentType]);

  function set(name: string, v: string) {
    setValues((prev) => ({ ...prev, [name]: v }));
  }

  function onFile(name: string, file: File | undefined) {
    if (!file) return;
    setDocs((prev) => {
      const next = { ...prev };
      if (prev[name]) URL.revokeObjectURL(prev[name]!);
      next[name] = URL.createObjectURL(file);
      return next;
    });
  }

  const last = stepTitles.length - 1;
  const err = state.fieldErrors;

  return (
    <div className="mx-auto max-w-2xl">
      {/* Stepper: circles shrink a step on phones so all six fit without a
          squeeze; the per-step captions are desktop only, so the current step
          name is echoed beneath for small screens. */}
      <ol className="mb-2 flex items-center sm:mb-8" aria-label={a.title}>
        {stepTitles.map((title, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={title} className="flex flex-1 items-center last:flex-none">
              <button
                type="button"
                onClick={() => i <= step && setStep(i)}
                aria-current={current ? "step" : undefined}
                className="flex flex-col items-center gap-1.5"
                title={title}
              >
                <span
                  className="nf-numeric grid h-8 w-8 place-items-center rounded-full text-[0.75rem] font-bold transition-colors sm:h-9 sm:w-9 sm:text-[0.8125rem]"
                  style={{
                    background: done || current ? "var(--nf-gradient-agent)" : "var(--nf-surface-raised)",
                    color: done || current ? "#fff" : "var(--nf-content-muted)",
                  }}
                >
                  {done ? <UiIcon name="verified" size={16} strokeWidth={2.4} /> : i + 1}
                </span>
                <span className="hidden max-w-[7rem] text-center text-[0.625rem] font-medium leading-tight text-[var(--nf-content-muted)] sm:block">
                  {title}
                </span>
              </button>
              {i < last && (
                <span
                  className="mx-1 h-0.5 flex-1 rounded-full transition-colors"
                  style={{ background: i < step ? "var(--nf-mode-agent)" : "var(--nf-border-subtle)" }}
                />
              )}
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

        {/* Step 1: Personal */}
        <fieldset hidden={step !== 0} className="space-y-4">
          <Legend title={a.steps.personal} />
          <div>
            <span className="nf-label">{a.agentType}</span>
            <div className="grid grid-cols-2 gap-3">
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
                  <span className="block text-[0.875rem] font-semibold">
                    {tp === "individual" ? a.individual : a.business}
                  </span>
                  <span className="block text-[0.75rem] text-[var(--nf-content-muted)]">
                    {tp === "individual" ? a.individualDesc : a.businessDesc}
                  </span>
                </button>
              ))}
            </div>
            <input type="hidden" name="agentType" value={agentType} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="firstName" label={a.fields.firstName} value={values} set={set} err={err} autoComplete="given-name" />
            <Field name="lastName" label={a.fields.lastName} value={values} set={set} err={err} autoComplete="family-name" />
          </div>
          <Field name="phone" label={a.fields.phone} value={values} set={set} err={err} type="tel" placeholder="0803 000 0000" autoComplete="tel" />
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
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="businessName" label={a.fields.businessName} value={values} set={set} err={err} />
              <Field name="rcNumber" label={a.fields.rcNumber} value={values} set={set} err={err} />
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField name="state" label={a.fields.state} value={values} set={set} err={err} options={[...NIGERIAN_STATES]} />
            <Field name="city" label={a.fields.city} value={values} set={set} err={err} />
          </div>
          <Field name="address" label={a.fields.address} value={values} set={set} err={err} autoComplete="street-address" />
        </fieldset>

        {/* Step 4: Documents */}
        <fieldset hidden={step !== 3} className="space-y-4">
          <Legend title={a.documents.title} sub={a.documents.body} />
          <div className="grid gap-3 sm:grid-cols-2">
            <UploadZone id="idFront" label={a.documents.idFront} hint={a.documents.chooseFile} preview={docs.idFront} onFile={onFile} />
            <UploadZone id="idBack" label={a.documents.idBack} hint={a.documents.chooseFile} preview={docs.idBack} onFile={onFile} />
            {agentType === "business" && (
              <UploadZone id="registration" label={a.documents.registration} hint={a.documents.chooseFile} preview={docs.registration} onFile={onFile} />
            )}
          </div>
        </fieldset>

        {/* Step 5: Payout */}
        <fieldset hidden={step !== 4} className="space-y-4">
          <Legend title={a.steps.payout} />
          <SelectField name="bankName" label={a.fields.bankName} value={values} set={set} err={err} options={[...NIGERIAN_BANKS]} />
          <div className="grid gap-4 sm:grid-cols-2">
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
                <dd className="truncate font-medium">{values[f]}</dd>
              </div>
            ))}
          </dl>

          <label className="flex items-start gap-2.5 text-[0.8125rem]">
            <input type="checkbox" name="agreeTerms" className="mt-0.5 h-4 w-4 accent-[var(--nf-brand-primary)]" />
            <span>{a.fields.agreeTerms}</span>
          </label>
          {err?.agreeTerms && (
            <p role="alert" className="text-[0.75rem] text-[var(--nf-state-error)]">{err.agreeTerms}</p>
          )}

          {state.message && (
            <p
              role="alert"
              className="rounded-[var(--nf-radius-md)] border border-[color-mix(in_oklab,var(--nf-state-warning)_35%,transparent)] bg-[var(--nf-state-warning-surface)] px-3.5 py-2.5 text-[0.8125rem] text-[var(--nf-state-warning)]"
            >
              {state.message}
            </p>
          )}
        </fieldset>

        {/* Nav */}
        <div className="mt-7 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="nf-btn nf-btn--glass disabled:opacity-40"
          >
            <UiIcon name="arrow-right" size={16} className="rotate-180" />
            {a.back}
          </button>

          <span className="nf-numeric text-[0.75rem] text-[var(--nf-content-muted)]">
            {step + 1} / {stepTitles.length}
          </span>

          {step < last ? (
            <button type="button" onClick={() => setStep((s) => Math.min(last, s + 1))} className="nf-btn nf-btn--primary">
              {a.next}
              <UiIcon name="arrow-right" size={16} />
            </button>
          ) : (
            <button type="submit" disabled={pending} className="nf-btn nf-btn--primary">
              {pending ? a.submitting : a.submit}
            </button>
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

function Field({
  name, label, value, set, err, type = "text", placeholder, autoComplete, inputMode,
}: {
  name: string; label: string; value: Values; set: (n: string, v: string) => void;
  err?: Record<string, string>; type?: string; placeholder?: string; autoComplete?: string;
  inputMode?: "numeric" | "text";
}) {
  const e = err?.[name];
  return (
    <div>
      <label htmlFor={name} className="nf-label">{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        value={value[name] ?? ""}
        onChange={(ev) => set(name, ev.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={e ? true : undefined}
        className="nf-field"
      />
      {e && <p role="alert" className="mt-1 text-[0.75rem] text-[var(--nf-state-error)]">{e}</p>}
    </div>
  );
}

function SelectField({
  name, label, value, set, err, options,
}: {
  name: string; label: string; value: Values; set: (n: string, v: string) => void;
  err?: Record<string, string>; options: string[];
}) {
  const e = err?.[name];
  return (
    <div>
      <label htmlFor={name} className="nf-label">{label}</label>
      <select
        id={name}
        name={name}
        value={value[name] ?? ""}
        onChange={(ev) => set(name, ev.target.value)}
        aria-invalid={e ? true : undefined}
        className="nf-field"
      >
        <option value="" disabled style={{ background: "#151029" }}>Select</option>
        {options.map((o) => (
          <option key={o} value={o} style={{ background: "#151029" }}>{o}</option>
        ))}
      </select>
      {e && <p role="alert" className="mt-1 text-[0.75rem] text-[var(--nf-state-error)]">{e}</p>}
    </div>
  );
}

function UploadZone({
  id, label, hint, preview, onFile,
}: {
  id: string; label: string; hint: string; preview?: string;
  onFile: (name: string, file: File | undefined) => void;
}) {
  return (
    <div>
      <span className="nf-label">{label}</span>
      <label
        htmlFor={id}
        className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-[var(--nf-radius-lg)] border border-dashed border-[var(--nf-border-default)] bg-[var(--nf-surface-inset)] text-center transition-colors hover:border-[var(--nf-border-brand)]"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <>
            <UiIcon name="sparkle" size={26} className="text-[var(--nf-content-muted)]" />
            <span className="px-3 text-[0.6875rem] text-[var(--nf-content-muted)]">{hint}</span>
          </>
        )}
      </label>
      <input
        id={id}
        type="file"
        accept="image/png,image/jpeg,application/pdf"
        className="sr-only"
        onChange={(e) => onFile(id, e.target.files?.[0])}
      />
    </div>
  );
}
