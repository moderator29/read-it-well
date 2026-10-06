"use client";

import { useState, useTransition } from "react";
import { getDictionary } from "@vallo/i18n";
import { decideSafetyHold } from "@/lib/admin/safety-holds";
import { Button } from "@/components/ui/Button";

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
      <Button variant="secondary" size="sm" type="button" disabled={pending} onClick={() => act("clear")}>
        {pending ? desk.holdsWorking : desk.holdsClear}
      </Button>
      <Button variant="quiet" size="sm" type="button" disabled={pending} onClick={() => act("extend")}>
        {desk.holdsExtend}
      </Button>
      {error && (
        <span role="alert" className="nf-caption text-[var(--nf-state-error)]">
          {error}
        </span>
      )}
    </span>
  );
}
