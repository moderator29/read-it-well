"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { beginConsoleStepUp, finishConsoleStepUp } from "@/lib/security/console-step-up";
import { assertPlatformKey } from "@/lib/security/webauthn-client";

/**
 * THE CONSOLE'S SECOND FACTOR, AS STAFF SEE IT.
 *
 * Every admin and staff member confirms it is them with their security key
 * (the passkey on their phone or computer) before any desk opens, once per
 * sign-in and again after twelve hours. Somebody without a key is sent to set
 * one up first; there is no password-only way in.
 */
export function ConsoleStepUp({ name }: { name: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [needsKey, setNeedsKey] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const confirm = () =>
    start(async () => {
      setMessage(null);
      const begun = await beginConsoleStepUp();
      if (begun.state === "enrol") {
        setNeedsKey(true);
        return;
      }
      if (begun.state !== "ready") {
        setMessage("That did not start. Try again in a moment.");
        return;
      }
      const proof = await assertPlatformKey({ challenge: begun.challenge, rpId: begun.rpId, allow: begun.credentialIds });
      if (!proof) {
        setMessage("Your key did not answer. Try again, on the device where you set it up.");
        return;
      }
      const done = await finishConsoleStepUp({ challenge: begun.challenge, ...proof });
      if ("ok" in done) router.refresh();
      else setMessage(done.error === "rejected" ? "That key was not accepted. Try again." : "That did not go through. Try again.");
    });

  return (
    /* In the page gutter: rendered straight from the admin layout, the card
       ran flush to both edges of a phone. The safe area covers a notch. */
    <div className="nf-safe-top px-gutter pb-block">
      <section className="nf-console nf-panel nf-panel--card mx-auto mt-block max-w-lg p-card" data-testid="console-step-up">
        <p className="nf-caption text-[var(--nf-content-secondary)]">Vallo console</p>
        <h1 className="nf-h2 mt-inline">Confirm it is you, {name}</h1>
        <p className="nf-body mt-inline">
          The console opens only after you confirm with your security key, once each time you sign in and again after
          twelve hours. A password on its own never opens it.
        </p>
        {needsKey ? (
          <div className="mt-block grid gap-xs" role="status">
            <p className="nf-body">
              You have not set up a security key yet. Set one up in your privacy settings (it uses your phone&apos;s or
              computer&apos;s screen lock), then come back here.
            </p>
            <ButtonLink href="/settings/privacy" variant="primary" size="md">
              Set up a security key
            </ButtonLink>
          </div>
        ) : (
          <div className="mt-block">
            <Button variant="primary" size="md" onClick={confirm} disabled={pending} loading={pending}>
              Confirm with my security key
            </Button>
          </div>
        )}
        {message ? (
          <p className="nf-body mt-inline text-[var(--nf-state-error)]" role="alert">
            {message}
          </p>
        ) : null}
      </section>
    </div>
  );
}
