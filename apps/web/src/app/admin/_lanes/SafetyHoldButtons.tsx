"use client";

import { useState, useTransition } from "react";
import { getDictionary } from "@vallo/i18n";
import { decideSafetyHold } from "@/lib/admin/safety-holds";

const desk = getDictionary("en").trustVisible.desk;

/** V-63: Clear or Extend one safety hold. */
export function SafetyHoldButtons({ holdId }: { holdId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function act(action: "clear" | "extend") {
    setError(null);
    startTransition(async () => {
      const result = await decideSafetyHold({ holdId, action });
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <span className="flex flex-wrap items-center gap-xs">
      <button type="button" disabled={pending} onClick={() => act("clear")} className="nf-btn nf-btn--glass nf-btn--sm">
        {pending ? desk.holdsWorking : desk.holdsClear}
      </button>
      <button type="button" disabled={pending} onClick={() => act("extend")} className="nf-btn nf-btn--ghost nf-btn--sm">
        {desk.holdsExtend}
      </button>
      {error && (
        <span role="alert" className="nf-caption text-[var(--nf-state-error)]">
          {error}
        </span>
      )}
    </span>
  );
}
