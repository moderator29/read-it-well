"use client";

import type { ComponentProps } from "react";
import { WithdrawFlow } from "@/components/app/referral/WithdrawFlow";
import type { WithdrawActions } from "@/lib/referral/rewards";
import { FIXTURE_DESTINATION, FIXTURE_FEE_MINOR } from "../fixtures";

/**
 * The withdraw flow with FIXTURE actions, development only. `quote` answers
 * after a beat with the invented fixture fee, so the order of the screen (the
 * minimum first, the fee only once prepared, then Confirm) can be walked. Type
 * 999 to see the minimum refused before anything is asked.
 */
const FIXTURE_ACTIONS: WithdrawActions = {
  async quote(amountMinor) {
    await new Promise((resolve) => window.setTimeout(resolve, 600));
    return {
      ok: true,
      quote: {
        quoteId: `fixture-${amountMinor}`,
        amountMinor,
        feeMinor: FIXTURE_FEE_MINOR,
        receiveMinor: amountMinor - FIXTURE_FEE_MINOR,
        destination: FIXTURE_DESTINATION,
      },
    };
  },
  async confirm() {
    await new Promise((resolve) => window.setTimeout(resolve, 600));
    return { ok: true };
  },
};

export function WithdrawFixture(props: Omit<ComponentProps<typeof WithdrawFlow>, "actions">) {
  return <WithdrawFlow {...props} actions={FIXTURE_ACTIONS} />;
}
