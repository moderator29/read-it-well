"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

/**
 * The ONE action on the offline screen (W11: one Island, one action).
 *
 * A full reload rather than a router navigation, because the client router
 * cannot fetch a payload with no network and would fail quietly. Reloading
 * asks the browser to try the connection again, which is what the user means
 * when they tap it. It carries the real-step feel of the button system's
 * `loading` state (the button holds its width and says it is working) and no
 * spinner of its own.
 *
 * The status line reflects reality: while the browser reports itself offline
 * the line says so and the button stays useful anyway, because a phone's
 * online flag lies often on Nigerian networks (an attached but dead mobile
 * data session still reads as online). It is never disabled for that reason,
 * and the page tries again by itself the moment the browser says the
 * connection is back (`online`), as the packaged shell's card does.
 */
export function RetryButton({
  label,
  statusOnline,
  statusOffline,
}: {
  label: string;
  statusOnline: string;
  statusOffline: string;
}) {
  const [online, setOnline] = useState(true);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    const back = () => {
      setOnline(true);
      window.location.reload();
    };
    sync();
    window.addEventListener("online", back);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", back);
      window.removeEventListener("offline", sync);
    };
  }, []);

  return (
    <>
      <Button
        variant="primary"
        size="lg"
        full
        loading={retrying}
        className="nf-offline__action"
        onClick={() => {
          setRetrying(true);
          window.location.reload();
        }}
      >
        {label}
      </Button>
      <p className="nf-offline__status" role="status" aria-live="polite">
        {online ? statusOnline : statusOffline}
      </p>
    </>
  );
}
