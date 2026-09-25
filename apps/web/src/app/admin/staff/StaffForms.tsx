"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { grantStaff, revokeStaff } from "@/lib/admin/staff-actions";

export function GrantStaffForm({ scopes }: { scopes: { value: string; label: string }[] }) {
  const [email, setEmail] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="grid gap-xs"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const result = await grantStaff({ email, scopes: picked, note });
          if (!result.ok) setMessage({ ok: false, text: result.error });
          else {
            setMessage({ ok: true, text: "Access given. They have been told by email and in the app." });
            setEmail("");
            setPicked([]);
            setNote("");
            router.refresh();
          }
        });
      }}
    >
      <label className="grid gap-2xs nf-body">
        <span>Email on their Vallo account</span>
        <input className="nf-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <fieldset className="grid gap-2xs">
        <legend className="nf-body">Access areas</legend>
        {scopes.map((s) => (
          <label key={s.value} className="flex items-center gap-xs nf-body">
            <input
              type="checkbox"
              checked={picked.includes(s.value)}
              onChange={(e) =>
                setPicked((prev) => (e.target.checked ? [...prev, s.value] : prev.filter((v) => v !== s.value)))
              }
            />
            <span>{s.label}</span>
          </label>
        ))}
      </fieldset>
      <label className="grid gap-2xs nf-body">
        <span>Note (only you see it)</span>
        <input className="nf-input" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
      </label>
      <div>
        <Button type="submit" variant="primary" size="md" disabled={pending || picked.length === 0}>
          Give access
        </Button>
      </div>
      {message ? (
        <p className="nf-body" role={message.ok ? "status" : "alert"}>
          {message.text}
        </p>
      ) : null}
    </form>
  );
}

export function RevokeStaffForm({ userId }: { userId: string }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="mt-2xs flex flex-wrap items-end gap-xs"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const result = await revokeStaff({ userId, reason });
          if (!result.ok) setError(result.error);
          else router.refresh();
        });
      }}
    >
      <label className="grid gap-2xs nf-caption">
        <span>Reason (they read it)</span>
        <input className="nf-input" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
      </label>
      <Button type="submit" variant="secondary" size="sm" disabled={pending || reason.trim().length < 5}>
        End access
      </Button>
      {error ? (
        <p className="nf-caption" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
