"use client";

import { useState } from "react";
import { ListerFeeGate } from "@/components/money/ListerFeeGate";
import type { ListerFeeAcceptance } from "@/lib/money/lister-fee";
import { FIXTURE_POLICY } from "./fixtures";

/** The fee gate with its own state, so the accept can be tried. Fixture policy only. */
export function FeeGateFixture() {
  const [accepted, setAccepted] = useState<ListerFeeAcceptance | null>(null);
  return (
    <ListerFeeGate kind="rent" priceMinor={1_800_000_00} policy={FIXTURE_POLICY} locale="en" accepted={accepted} onAcceptedChange={setAccepted} />
  );
}
