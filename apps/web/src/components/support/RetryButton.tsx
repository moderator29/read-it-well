"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

/**
 * Try again, for a support screen whose read failed.
 *
 * The screens are server-rendered, so a retry is a fresh render of the same
 * route: `router.refresh()` re-runs the reads without losing the page, and
 * the button shows it is working until the new render lands.
 */
export function RetryButton({ label = "Try again" }: { label?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="primary"
      size="lg"
      loading={pending}
      disabled={pending}
      onClick={() => start(() => router.refresh())}
      data-testid="support-retry"
    >
      {label}
    </Button>
  );
}
