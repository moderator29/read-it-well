"use client";

import { useState, useTransition } from "react";
import type { Dictionary } from "@vallo/i18n/core";
import { panelClass } from "@/components/ui/Panel";
import { TextField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { verifyIdentityWithVnin } from "@/lib/identity/actions";

/**
 * THE vNIN ROUTE TO THE IDENTITY RUNG (V-49). Drawn by the verification page
 * only when `vnin_identity` is on and a merchant code is configured; the photo
 * route below it stays, as the fallback for a broken NIMC record. States:
 * typing, checking, passed, sent to a person, and every refusal in words.
 */
export function VninPanel({
  copy,
  merchantCode,
}: {
  copy: Dictionary["trustVisible"]["vnin"];
  merchantCode: string;
}) {
  const [vnin, setVnin] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setMessage(null);
    startTransition(async () => {
      const result = await verifyIdentityWithVnin({ vnin });
      setMessage(result.ok ? { tone: "ok", text: result.data.message } : { tone: "error", text: result.error });
    });
  }

  return (
    <section className={panelClass({ className: "mb-block grid gap-md p-card" })} aria-label={copy.title} data-testid="vnin-panel">
      <h2 className="nf-body font-semibold text-[var(--nf-content-primary)]">{copy.title}</h2>
      <p className="nf-body-sm text-[var(--nf-content-secondary)]">{copy.lede.replace("{code}", merchantCode)}</p>
      <TextField
        label={copy.label}
        value={vnin}
        autoComplete="off"
        maxLength={24}
        onChange={(event) => setVnin(event.target.value)}
      />
      <Button type="button" variant="primary" full loading={pending} onClick={submit} disabled={vnin.trim() === ""}>
        {pending ? copy.checking : copy.submit}
      </Button>
      {message && (
        <p
          role={message.tone === "error" ? "alert" : "status"}
          className={`nf-body-sm ${message.tone === "error" ? "text-[var(--nf-state-error)]" : "text-[var(--nf-content-primary)]"}`}
        >
          {message.text}
        </p>
      )}
    </section>
  );
}
