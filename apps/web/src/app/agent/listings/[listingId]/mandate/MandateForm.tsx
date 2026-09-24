"use client";

import { useState, useTransition } from "react";
import type { Dictionary } from "@vallo/i18n";
import { Button } from "@/components/ui/Button";
import { fileListingMandate } from "@/lib/compliance/beneficial-ownership-actions";
import { MANDATE_KINDS, RELATIONSHIPS, type MyMandate } from "@/lib/compliance/beneficial-ownership";

type Copy = Dictionary["complianceBeneficialOwnership"]["lister"];

/**
 * SCUML item 17: the lister's mandate form. Sends a new mandate, or corrects
 * one still waiting; once staff approve it the page shows the date instead.
 */
export function MandateForm({ listingId, copy, initial }: { listingId: string; copy: Copy; initial: MyMandate | null }) {
  const [kind, setKind] = useState<string>(initial?.kind ?? "letting");
  const [name, setName] = useState(initial?.principalName ?? "");
  const [phone, setPhone] = useState(initial?.principalPhone ?? "");
  const [relationship, setRelationship] = useState<string>(initial?.relationship ?? "");
  const [exclusive, setExclusive] = useState<"yes" | "no" | "unknown">(
    initial?.exclusive === true ? "yes" : initial?.exclusive === false ? "no" : "unknown",
  );
  const [signedOn, setSignedOn] = useState(initial?.signedOn ?? "");
  const [expiresOn, setExpiresOn] = useState(initial?.expiresOn ?? "");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await fileListingMandate({
        listingId,
        form: { kind, principalName: name, principalPhone: phone, relationship, exclusive, signedOn, expiresOn },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSent(true);
    });
  }

  if (sent) {
    return (
      <p className="nf-body-sm" role="status" data-testid="mandate-sent">
        {copy.sent}
      </p>
    );
  }

  return (
    <form className="grid gap-xs" onSubmit={submit} data-testid="mandate-form">
      <label className="nf-label" htmlFor="mandate-kind">
        {copy.kind}
      </label>
      <select id="mandate-kind" className="nf-field" value={kind} onChange={(e) => setKind(e.target.value)}>
        {MANDATE_KINDS.map((k) => (
          <option key={k} value={k}>
            {copy.kinds[k]}
          </option>
        ))}
      </select>
      <label className="nf-label" htmlFor="mandate-name">
        {copy.name}
      </label>
      <input
        id="mandate-name"
        className="nf-field"
        value={name}
        maxLength={160}
        autoComplete="off"
        required
        onChange={(e) => setName(e.target.value)}
      />
      <label className="nf-label" htmlFor="mandate-phone">
        {copy.phone}
      </label>
      <input
        id="mandate-phone"
        className="nf-field"
        type="tel"
        inputMode="tel"
        value={phone}
        autoComplete="off"
        onChange={(e) => setPhone(e.target.value)}
        aria-describedby="mandate-phone-hint"
      />
      <p id="mandate-phone-hint" className="nf-caption text-[var(--nf-content-secondary)]">
        {copy.phoneHint}
      </p>
      <label className="nf-label" htmlFor="mandate-relationship">
        {copy.relationship}
      </label>
      <select
        id="mandate-relationship"
        className="nf-field"
        value={relationship}
        required
        onChange={(e) => setRelationship(e.target.value)}
      >
        <option value="" disabled>
          {copy.relationship}
        </option>
        {RELATIONSHIPS.map((r) => (
          <option key={r} value={r}>
            {copy.relationships[r]}
          </option>
        ))}
      </select>
      <fieldset className="grid gap-2xs">
        <legend className="nf-label">{copy.exclusive}</legend>
        {(
          [
            ["yes", copy.exclusiveYes],
            ["no", copy.exclusiveNo],
            ["unknown", copy.exclusiveUnknown],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="flex items-center gap-xs nf-body-sm">
            <input type="radio" name="exclusive" value={value} checked={exclusive === value} onChange={() => setExclusive(value)} />
            {label}
          </label>
        ))}
      </fieldset>
      <label className="nf-label" htmlFor="mandate-signed">
        {copy.signedOn}
      </label>
      <input id="mandate-signed" className="nf-field" type="date" value={signedOn} onChange={(e) => setSignedOn(e.target.value)} />
      <label className="nf-label" htmlFor="mandate-expires">
        {copy.expiresOn}
      </label>
      <input id="mandate-expires" className="nf-field" type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
      {error && (
        <p role="alert" className="nf-body-sm" style={{ color: "var(--nf-state-error)" }}>
          {error}
        </p>
      )}
      <Button type="submit" variant="primary" loading={pending} data-testid="mandate-send">
        {initial ? copy.update : copy.send}
      </Button>
    </form>
  );
}
