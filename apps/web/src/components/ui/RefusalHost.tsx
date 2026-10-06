"use client";

import { useEffect } from "react";
import { watchRefusals } from "@/lib/ui/refusal";

/** Mounted once with the shared details (`DetailsHost`): a field that is refused shakes once (`lib/ui/refusal.ts`). Renders nothing. */
export function RefusalHost() {
  useEffect(() => watchRefusals(document), []);
  return null;
}
