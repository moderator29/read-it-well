"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { subscriptionCheckoutState } from "@/lib/subscriptions/actions";

/** The same easing-out backoff the in-page checkout uses: about a dozen asks in ninety seconds. */
const STEPS_MS = [2_000, 2_000, 3_000, 4_000, 6_000, 8_000, 10_000] as const;
const FOR_MS = 90_000;

/**
 * Asks OUR server (never Paystack, never the browser's word) whether the
 * checkout has turned into a plan, on a bounded backoff. When the answer
 * changes, the server page is re-read; when the clock runs out it says so
 * plainly and stops.
 */
export function ConfirmPoll({ reference, slowTitle, slowBody }: { reference: string; slowTitle: string; slowBody: string }) {
  const router = useRouter();
  const [slow, setSlow] = useState(false);
  const started = useRef(0);

  useEffect(() => {
    let stopped = false;
    let timer: number | undefined;
    started.current = Date.now();
    const ask = async (attempt: number) => {
      if (stopped) return;
      if (Date.now() - started.current > FOR_MS) {
        setSlow(true);
        return;
      }
      const result = await subscriptionCheckoutState(reference).catch(() => null);
      if (stopped) return;
      if (result?.ok && result.data !== "pending") {
        router.refresh();
        return;
      }
      timer = window.setTimeout(() => void ask(attempt + 1), STEPS_MS[Math.min(attempt, STEPS_MS.length - 1)]);
    };
    timer = window.setTimeout(() => void ask(0), STEPS_MS[0]);
    return () => {
      stopped = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [reference, router]);

  if (!slow) return null;
  return (
    <div role="status" data-testid="pro-confirm-slow">
      <p className="nf-pro-mine__name nf-pro-mine__name--quiet">{slowTitle}</p>
      <p className="nf-pro-mine__body">{slowBody}</p>
    </div>
  );
}
