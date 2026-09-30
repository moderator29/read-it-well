"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useClientCopyOptional } from "@/lib/i18n/client-copy";

/**
 * "Try again", in place (details pass, 30 September 2026). A read that failed
 * on the server is asked again with `router.refresh()`, inside a transition,
 * so the page keeps what it has and the button shows the (late) spinner until
 * the answer lands. No full reload, no lost scroll, no second tap needed to
 * find out whether the first one did anything.
 */
export function RetryInPlace({ label, full = false }: { label?: string; full?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const words = useClientCopyOptional()?.details.retry;
  return (
    <Button
      variant="secondary"
      full={full}
      leadingIcon="repost-loop"
      loading={pending}
      onClick={() => start(() => router.refresh())}
      data-testid="retry-in-place"
    >
      {label ?? words ?? "Try again"}
    </Button>
  );
}
