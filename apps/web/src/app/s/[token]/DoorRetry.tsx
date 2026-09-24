"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/Button";

/**
 * Ask again, without a full reload. The door said it could not reach the
 * database; the link itself is fine, so the honest next step is the same
 * request a moment later.
 */
export function DoorRetry({ label }: { label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button variant="primary" full disabled={pending} onClick={() => start(() => router.refresh())}>
      {label}
    </Button>
  );
}
