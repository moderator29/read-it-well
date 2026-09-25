"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { amendAgreement, cancelAgreement, confirmAgreement, createClaimEvidenceUpload, fileGuaranteeClaim } from "@/lib/agreements/actions";
import { createClient } from "@/lib/supabase/client";

/**
 * The controls on an agreement page (Track A): confirm the exact version,
 * change the terms (which makes every confirmation lapse), cancel, and, once
 * paid and inside the claim window, raise a Guarantee claim.
 */

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (work: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      setError(null);
      const result = await work();
      if (!result.ok) {
        setError(result.error ?? "That did not go through.");
        return;
      }
      after?.();
      router.refresh();
    });
  return { pending, error, run };
}

export function ConfirmTerms({ agreementId, version, disabled }: { agreementId: string; version: number; disabled?: boolean }) {
  const { pending, error, run } = useAction();
  const [read, setRead] = useState(false);
  return (
    <div className="grid gap-inline" data-testid="confirm-terms">
      <label className="flex items-start gap-inline">
        <input type="checkbox" checked={read} onChange={(e) => setRead(e.target.checked)} />
        <span>I have read these terms (version {version}) and I agree to them.</span>
      </label>
      {error ? <p role="alert" className="text-[var(--nf-status-error)]">{error}</p> : null}
      <button
        type="button"
        className="nf-btn nf-btn--primary nf-btn--md nf-btn--full"
        disabled={!read || pending || disabled}
        onClick={() => run(() => confirmAgreement({ agreementId, version }))}
      >
        Confirm these terms
      </button>
    </div>
  );
}

export function AmendTerms({
  agreementId,
  moveIn,
  handoverOn,
  notes,
  minDate,
}: {
  agreementId: string;
  moveIn: string;
  handoverOn: string;
  notes: string;
  minDate: string;
}) {
  const { pending, error, run } = useAction();
  const [open, setOpen] = useState(false);
  const [a, setA] = useState(moveIn);
  const [b, setB] = useState(handoverOn);
  const [n, setN] = useState(notes);
  if (!open) {
    return (
      <button type="button" className="nf-btn nf-btn--ghost nf-btn--md" onClick={() => setOpen(true)}>
        Change the terms
      </button>
    );
  }
  return (
    <form
      className="grid gap-inline"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => amendAgreement({ agreementId, moveIn: a, handoverOn: b, notes: n }), () => setOpen(false));
      }}
    >
      <p className="nf-caption">Changing the terms means both of you confirm again, and Vallo reviews the new version.</p>
      <label className="nf-field">
        <span className="nf-field__label">Move-in date</span>
        <input className="nf-input" type="date" min={minDate} value={a} onChange={(e) => setA(e.target.value)} required />
      </label>
      <label className="nf-field">
        <span className="nf-field__label">Keys handed over on</span>
        <input className="nf-input" type="date" min={minDate} value={b} onChange={(e) => setB(e.target.value)} />
      </label>
      <label className="nf-field">
        <span className="nf-field__label">Notes</span>
        <textarea className="nf-input min-h-[4.5rem]" maxLength={2000} value={n} onChange={(e) => setN(e.target.value)} />
      </label>
      {error ? <p role="alert" className="text-[var(--nf-status-error)]">{error}</p> : null}
      <div className="flex gap-inline">
        <button type="submit" className="nf-btn nf-btn--primary nf-btn--md" disabled={pending}>
          Save the new terms
        </button>
        <button type="button" className="nf-btn nf-btn--ghost nf-btn--md" onClick={() => setOpen(false)}>
          Keep the current terms
        </button>
      </div>
    </form>
  );
}

export function CancelAgreement({ agreementId }: { agreementId: string }) {
  const { pending, error, run } = useAction();
  const [sure, setSure] = useState(false);
  return (
    <div className="grid gap-inline">
      {error ? <p role="alert" className="text-[var(--nf-status-error)]">{error}</p> : null}
      {!sure ? (
        <button type="button" className="nf-btn nf-btn--ghost nf-btn--md" onClick={() => setSure(true)}>
          Cancel this agreement
        </button>
      ) : (
        <button
          type="button"
          className="nf-btn nf-btn--secondary nf-btn--md"
          disabled={pending}
          onClick={() => run(() => cancelAgreement({ agreementId }))}
        >
          Yes, cancel it
        </button>
      )}
    </div>
  );
}

const ITEMS: { key: string; label: string }[] = [
  { key: "exterior", label: "Exterior" },
  { key: "interior", label: "Interior" },
  { key: "kitchen", label: "Kitchen" },
  { key: "bathrooms", label: "Bathrooms" },
  { key: "utilities", label: "Utilities" },
  { key: "appliances", label: "Appliances" },
  { key: "safety", label: "Safety" },
  { key: "overall", label: "Overall condition" },
];

export function ClaimForm({ agreementId, capNaira }: { agreementId: string; capNaira: string }) {
  const { pending, error, run } = useAction();
  const [items, setItems] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paths, setPaths] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  async function addFile(file: File) {
    setUploading(true);
    try {
      const prepared = await createClaimEvidenceUpload({ agreementId, fileName: file.name });
      if (!prepared.ok) return;
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from("guarantee-evidence")
        .uploadToSignedUrl(prepared.data.path, prepared.data.token, file);
      if (!upErr) setPaths((now) => [...now, prepared.data.path]);
    } finally {
      setUploading(false);
    }
  }

  if (done) {
    return (
      <p className="nf-body" data-testid="claim-filed">
        Your claim is with Vallo. A person will review it against the inspection report and tell you the decision.
      </p>
    );
  }

  return (
    <form
      className="grid gap-inline"
      data-testid="claim-form"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => fileGuaranteeClaim({ agreementId, items, description, evidencePaths: paths, amountNaira: amount }), () => setDone(true));
      }}
    >
      <fieldset className="grid gap-2xs">
        <legend className="nf-field__label">Which inspection items is this about?</legend>
        <div className="flex flex-wrap gap-2xs">
          {ITEMS.map((item) => {
            const on = items.includes(item.key);
            return (
              <button
                key={item.key}
                type="button"
                role="checkbox"
                aria-checked={on}
                className={`nf-chip${on ? " nf-chip--on" : ""}`}
                onClick={() => setItems((now) => (on ? now.filter((k) => k !== item.key) : [...now, item.key]))}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </fieldset>
      <label className="nf-field">
        <span className="nf-field__label">What happened</span>
        <textarea
          className="nf-input min-h-[6rem]"
          value={description}
          maxLength={4000}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is different from the inspection report, and when you found it"
        />
      </label>
      <label className="nf-field">
        <span className="nf-field__label">New photos (optional)</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void addFile(file);
          }}
        />
        <span className="nf-caption">{uploading ? "Adding photo" : `${paths.length} added`}</span>
      </label>
      <label className="nf-field">
        <span className="nf-field__label">Amount you are claiming (₦, at most {capNaira})</span>
        <input className="nf-input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </label>
      {error ? <p role="alert" className="text-[var(--nf-status-error)]">{error}</p> : null}
      <button type="submit" className="nf-btn nf-btn--primary nf-btn--md nf-btn--full" disabled={pending || uploading}>
        Send the claim to Vallo
      </button>
    </form>
  );
}
