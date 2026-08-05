"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { saveLocalGovernment, saveOccupation } from "@/lib/admin/reference-actions";
import { matchesSearch, type StateOption } from "@/lib/places/reference";
import type { ActionResult } from "@/lib/actions/envelope";

/**
 * The two reference tables, edited in place.
 *
 * Both editors work the same way: a filter over what is already there, an
 * inline form on any row you open, and one form at the top for adding a row
 * that does not exist yet. The list is rendered from the server's own read, so
 * a save followed by a refresh shows the database's answer rather than the
 * form's hope.
 *
 * The code of an existing row is never editable. It is the value stored on
 * every profile that chose it, so changing it would silently orphan them all.
 */

type Occupation = { code: string; name: string; category: string; sortOrder: number };
type LocalGovernment = { code: string; stateCode: string; name: string };

function Field({
  name,
  label,
  defaultValue,
  placeholder,
  error,
  readOnly = false,
  inputMode,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  error?: string | undefined;
  readOnly?: boolean;
  inputMode?: "numeric";
}) {
  return (
    <label className="block">
      <span className="nf-label">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        readOnly={readOnly}
        inputMode={inputMode}
        aria-invalid={error ? true : undefined}
        className="nf-field mt-1.5 w-full text-sm read-only:opacity-60"
      />
      {error && <span className="mt-1.5 block text-xs text-[var(--nf-state-error)]">{error}</span>}
    </label>
  );
}

function Result({ state, done }: { state: ActionResult<{ code: string }> | null; done: string }) {
  if (!state) return null;
  if (state.ok) {
    return (
      <p role="status" className="mt-2 text-xs text-[var(--nf-state-success)]">
        {done}
      </p>
    );
  }
  return (
    <p role="alert" className="mt-2 text-xs text-[var(--nf-state-error)]">
      {state.error}
    </p>
  );
}

/* ------------------------------------------------------------ occupations */

function OccupationForm({
  mode,
  initial,
  onSaved,
}: {
  mode: "create" | "edit";
  initial?: Occupation;
  onSaved: () => void;
}) {
  const [state, formAction, pending] = useActionState<
    ActionResult<{ code: string }> | null,
    FormData
  >(saveOccupation, null);

  useEffect(() => {
    if (state?.ok) onSaved();
  }, [state, onSaved]);

  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="mode" value={mode} />
      <Field
        name="code"
        label="Code"
        defaultValue={initial?.code}
        placeholder="site_engineer"
        readOnly={mode === "edit"}
        error={errors?.code}
      />
      <Field
        name="name"
        label="Name"
        defaultValue={initial?.name}
        placeholder="Site engineer"
        error={errors?.name}
      />
      <Field
        name="category"
        label="Category"
        defaultValue={initial?.category}
        placeholder="Engineering"
        error={errors?.category}
      />
      <Field
        name="sortOrder"
        label="Sort order"
        defaultValue={String(initial?.sortOrder ?? 0)}
        inputMode="numeric"
        error={errors?.sortOrder}
      />
      <div className="sm:col-span-2">
        <button type="submit" disabled={pending} className="nf-btn nf-btn--primary h-9 px-4 text-xs">
          {pending ? "Saving" : mode === "edit" ? "Save this occupation" : "Add occupation"}
        </button>
        <Result state={state} done="Saved. It is on the picker now." />
      </div>
    </form>
  );
}

export function OccupationEditor({ rows }: { rows: Occupation[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(() => {
    if (query.trim().length === 0) return rows.slice(0, 60);
    return rows
      .filter((row) => matchesSearch(`${row.name} ${row.category} ${row.code}`, query))
      .slice(0, 60);
  }, [rows, query]);

  const saved = () => {
    setOpenCode(null);
    setAdding(false);
    router.refresh();
  };

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold text-[var(--nf-content-primary)]">Occupations</h2>
        <span className="nf-numeric rounded-[var(--nf-radius-pill)] border border-[var(--nf-border-default)] px-2 py-0.5 text-xs text-[var(--nf-content-muted)]">
          {rows.length}
        </span>
        <button
          type="button"
          onClick={() => setAdding((open) => !open)}
          className="nf-btn nf-btn--ghost ml-auto h-8 px-3 text-xs"
        >
          {adding ? "Close" : "Add one"}
        </button>
      </div>

      {adding && (
        <div className="nf-card mb-3 p-4">
          <OccupationForm mode="create" onSaved={saved} />
        </div>
      )}

      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Filter by name, category or code"
        aria-label="Filter occupations"
        className="nf-field mb-3 w-full text-sm"
      />

      <ul className="flex flex-col gap-2">
        {filtered.map((row) => (
          <li key={row.code} className="nf-card p-3.5">
            <button
              type="button"
              onClick={() => setOpenCode(openCode === row.code ? null : row.code)}
              className="flex w-full items-center gap-3 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-[var(--nf-content-primary)]">
                  {row.name}
                </span>
                <span className="nf-numeric mt-0.5 block text-xs text-[var(--nf-content-muted)]">
                  {row.category} &middot; {row.code} &middot; {row.sortOrder}
                </span>
              </span>
              <span className="shrink-0 text-xs text-[var(--nf-brand-secondary)]">
                {openCode === row.code ? "Close" : "Edit"}
              </span>
            </button>
            {openCode === row.code && (
              <div className="mt-3 border-t border-[var(--nf-border-subtle)] pt-3">
                <OccupationForm mode="edit" initial={row} onSaved={saved} />
              </div>
            )}
          </li>
        ))}
      </ul>

      {rows.length > filtered.length && (
        <p className="mt-3 text-xs text-[var(--nf-content-muted)]">
          Showing {filtered.length} of {rows.length}. Filter to reach the rest.
        </p>
      )}
    </section>
  );
}

/* ------------------------------------------------------ local governments */

function LocalGovernmentForm({
  mode,
  states,
  initial,
  onSaved,
}: {
  mode: "create" | "edit";
  states: StateOption[];
  initial?: LocalGovernment;
  onSaved: () => void;
}) {
  const [state, formAction, pending] = useActionState<
    ActionResult<{ code: string }> | null,
    FormData
  >(saveLocalGovernment, null);

  useEffect(() => {
    if (state?.ok) onSaved();
  }, [state, onSaved]);

  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="mode" value={mode} />
      <Field
        name="code"
        label="Code"
        defaultValue={initial?.code}
        placeholder="la_ikeja"
        readOnly={mode === "edit"}
        error={errors?.code}
      />
      <label className="block">
        <span className="nf-label">State</span>
        <select
          name="stateCode"
          defaultValue={initial?.stateCode ?? ""}
          className="nf-field mt-1.5 w-full text-sm"
          aria-invalid={errors?.stateCode ? true : undefined}
        >
          <option value="" style={{ background: "var(--nf-surface-elevated)" }}>
            Choose a state
          </option>
          {states.map((option) => (
            <option
              key={option.code}
              value={option.code}
              style={{ background: "var(--nf-surface-elevated)" }}
            >
              {option.name}
            </option>
          ))}
        </select>
        {errors?.stateCode && (
          <span className="mt-1.5 block text-xs text-[var(--nf-state-error)]">
            {errors.stateCode}
          </span>
        )}
      </label>
      <Field
        name="name"
        label="Name"
        defaultValue={initial?.name}
        placeholder="Ikeja"
        error={errors?.name}
      />
      <div className="sm:col-span-2">
        <button type="submit" disabled={pending} className="nf-btn nf-btn--primary h-9 px-4 text-xs">
          {pending ? "Saving" : mode === "edit" ? "Save this local government" : "Add local government"}
        </button>
        <Result state={state} done="Saved. It is on the picker now." />
      </div>
    </form>
  );
}

export function LocalGovernmentEditor({
  rows,
  states,
}: {
  rows: LocalGovernment[];
  states: StateOption[];
}) {
  const router = useRouter();
  const [stateFilter, setStateFilter] = useState("");
  const [query, setQuery] = useState("");
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(() => {
    let out = rows;
    if (stateFilter) out = out.filter((row) => row.stateCode === stateFilter);
    if (query.trim().length > 0) {
      out = out.filter((row) => matchesSearch(`${row.name} ${row.code}`, query));
    }
    return out.slice(0, 80);
  }, [rows, stateFilter, query]);

  const nameByCode = useMemo(
    () => new Map(states.map((option) => [option.code, option.name])),
    [states],
  );

  const saved = () => {
    setOpenCode(null);
    setAdding(false);
    router.refresh();
  };

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold text-[var(--nf-content-primary)]">
          Local governments
        </h2>
        <span className="nf-numeric rounded-[var(--nf-radius-pill)] border border-[var(--nf-border-default)] px-2 py-0.5 text-xs text-[var(--nf-content-muted)]">
          {rows.length}
        </span>
        <button
          type="button"
          onClick={() => setAdding((open) => !open)}
          className="nf-btn nf-btn--ghost ml-auto h-8 px-3 text-xs"
        >
          {adding ? "Close" : "Add one"}
        </button>
      </div>

      {adding && (
        <div className="nf-card mb-3 p-4">
          <LocalGovernmentForm mode="create" states={states} onSaved={saved} />
        </div>
      )}

      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        <select
          value={stateFilter}
          onChange={(event) => setStateFilter(event.target.value)}
          aria-label="Filter by state"
          className="nf-field w-full text-sm"
        >
          <option value="" style={{ background: "var(--nf-surface-elevated)" }}>
            Every state
          </option>
          {states.map((option) => (
            <option
              key={option.code}
              value={option.code}
              style={{ background: "var(--nf-surface-elevated)" }}
            >
              {option.name}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter by name or code"
          aria-label="Filter local governments"
          className="nf-field w-full text-sm"
        />
      </div>

      <ul className="flex flex-col gap-2">
        {filtered.map((row) => (
          <li key={row.code} className="nf-card p-3.5">
            <button
              type="button"
              onClick={() => setOpenCode(openCode === row.code ? null : row.code)}
              className="flex w-full items-center gap-3 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-[var(--nf-content-primary)]">
                  {row.name}
                </span>
                <span className="nf-numeric mt-0.5 block text-xs text-[var(--nf-content-muted)]">
                  {nameByCode.get(row.stateCode) ?? row.stateCode} &middot; {row.code}
                </span>
              </span>
              <span className="shrink-0 text-xs text-[var(--nf-brand-secondary)]">
                {openCode === row.code ? "Close" : "Edit"}
              </span>
            </button>
            {openCode === row.code && (
              <div className="mt-3 border-t border-[var(--nf-border-subtle)] pt-3">
                <LocalGovernmentForm
                  mode="edit"
                  states={states}
                  initial={row}
                  onSaved={saved}
                />
              </div>
            )}
          </li>
        ))}
      </ul>

      {rows.length > filtered.length && (
        <p className="mt-3 text-xs text-[var(--nf-content-muted)]">
          Showing {filtered.length} of {rows.length}. Choose a state or filter to reach the rest.
        </p>
      )}
    </section>
  );
}
