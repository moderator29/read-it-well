"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { joinArea, leaveArea } from "@/lib/social/areas-actions";

/**
 * Join or leave a place.
 *
 * Optimistic, because a membership toggle that waits on a round trip on a
 * Nigerian mobile connection feels broken even when it works. The optimism is
 * reverted the moment the server disagrees, and `router.refresh()` makes the
 * page tell the truth again either way, so a reload can never disagree with
 * what the button says. That last part is the rule: the UI may be ahead of the
 * database for a second, and it may never be wrong about it after a reload.
 */
export function JoinButton({
  areaId,
  joined,
  signedIn,
  size = "md",
}: {
  areaId: string;
  joined: boolean;
  signedIn: boolean;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [isJoined, setIsJoined] = useState(joined);
  const [error, setError] = useState<string | null>(null);

  const label = isJoined ? "Joined" : "Join";
  const height = size === "sm" ? "h-9 px-4 text-xs" : "h-11 px-5 text-sm";

  const toggle = () => {
    if (!signedIn) {
      router.push(`/sign-in?next=${encodeURIComponent("/around")}`);
      return;
    }
    const next = !isJoined;
    setIsJoined(next);
    setError(null);

    startTransition(async () => {
      const result = next
        ? await joinArea({ areaId })
        : await leaveArea({ areaId });
      if (!result.ok) {
        setIsJoined(!next);
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={isJoined}
        className={`inline-flex items-center justify-center rounded-[var(--nf-radius-pill)] font-semibold transition-colors ${height} ${
          isJoined
            ? "border border-[var(--nf-border-default)] bg-transparent text-[var(--nf-content-primary)]"
            : "nf-btn nf-btn--primary"
        }`}
      >
        {label}
      </button>
      {error ? (
        <span role="alert" className="max-w-[14rem] text-right text-xs text-[var(--nf-state-error)]">
          {error}
        </span>
      ) : null}
    </div>
  );
}
