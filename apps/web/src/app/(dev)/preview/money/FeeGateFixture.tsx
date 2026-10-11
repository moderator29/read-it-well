"use client";

import { useState } from "react";
import { ListerFeeGate, type ListerFeeGateProps } from "@/components/money/ListerFeeGate";
import type { ListerFeeAcceptance } from "@/lib/money/lister-fee";
import { FIXTURE_POLICY } from "./fixtures";

/**
 * The fee gate with its own state, so the accept can be tried. Fixture policy
 * only. `blocking` draws it as it will be once the flag is on; off, it is the
 * screen the wizard draws today.
 */
export function FeeGateFixture({
  blocking,
  kind = "rent",
  priceMinor = 1_800_000_00,
  policy = FIXTURE_POLICY,
}: { blocking: boolean } & Partial<Pick<ListerFeeGateProps, "kind" | "priceMinor" | "policy">>) {
  const [accepted, setAccepted] = useState<ListerFeeAcceptance | null>(null);
  return (
    <ListerFeeGate
      kind={kind}
      priceMinor={priceMinor}
      policy={policy}
      locale="en"
      blocking={blocking}
      accepted={accepted}
      onAcceptedChange={setAccepted}
    />
  );
}
