"use client";

import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";

/**
 * The retry control on the offline screen.
 *
 * A full reload rather than a router navigation, because the client router
 * cannot fetch a payload with no network and would fail quietly. Reloading
 * asks the browser to try the connection again, which is what the user means
 * when they tap it.
 *
 * The label reflects reality: while the browser reports itself offline the
 * button says so and stays useful anyway, because a phone's online flag lies
 * often on Nigerian networks (an attached but dead mobile data session still
 * reads as online). It is never disabled for that reason.
 */
export function RetryButton() {
  const [online, setOnline] = useState(true);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  return (
    <div className="mt-7 flex flex-col items-center gap-4">
      <Button
        variant="primary"
        size="lg"
        full
        loading={retrying}
        onClick={() => {
          setRetrying(true);
          window.location.reload();
        }}
      >
        Try again
      </Button>
      <ButtonLink href="/home" variant="secondary" full>
        Back to home
      </ButtonLink>
      <p
        className="text-[0.8125rem] text-[var(--nf-content-muted)]"
        role="status"
        aria-live="polite"
      >
        {online
          ? "Your phone reports a connection. Tap Try again."
          : "Your phone reports no connection right now."}
      </p>
    </div>
  );
}
