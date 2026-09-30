"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { passkeyClient, passkeySignInEnabled } from "@/lib/auth/passkey-client";

/**
 * A3. "Sign in with a passkey", drawn only when the flag is on and the
 * browser has WebAuthn. The account is picked on the device (discoverable
 * credentials), so no email is typed. A cancelled prompt says nothing.
 */
export function PasskeySignIn({ label, next, failed }: { label: string; next?: string; failed: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  /* False on the server and in the first client pass, so hydration agrees. */
  const supported = useSyncExternalStore(
    () => () => {},
    () => "PublicKeyCredential" in window,
    () => false,
  );
  if (!passkeySignInEnabled() || !supported) return null;
  return (
    <div className="grid gap-xs">
      <Button
        type="button"
        variant="secondary"
        size="lg"
        full
        leadingIcon="key"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          setError(false);
          try {
            const auth = passkeyClient().auth as unknown as {
              signInWithPasskey: () => Promise<{ error: { name?: string } | null }>;
            };
            const { error: failure } = await auth.signInWithPasskey();
            if (failure) {
              if (!/abort|cancel|NotAllowed/i.test(failure.name ?? "")) setError(true);
              return;
            }
            router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/home");
            router.refresh();
          } finally {
            setBusy(false);
          }
        }}
      >
        {label}
      </Button>
      {error && (
        <p role="alert" className="nf-auth__notice">
          {failed}
        </p>
      )}
    </div>
  );
}
