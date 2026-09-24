"use client";

import { useRouter } from "next/navigation";
import { Segmented } from "@/components/ui/Segmented";

/**
 * V-99: which firm the desk is showing, for a principal of more than one.
 * A segmented row (each segment 44px tall, the control size); choosing one loads that firm's desk
 * at /agent/firm?firm=, which the page checks against the caller's own firms.
 */
export function FirmPicker({ firms, current, label }: { firms: { firmId: string; firmName: string }[]; current: string; label: string }) {
  const router = useRouter();
  return (
    <Segmented
      className="mt-row"
      label={label}
      value={current}
      options={firms.map((f) => ({ value: f.firmId, label: f.firmName }))}
      onChange={(next) => router.push(`/agent/firm?firm=${next}`)}
    />
  );
}
