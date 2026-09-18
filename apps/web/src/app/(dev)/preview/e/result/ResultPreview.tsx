"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/Button";
import { ResultSheet, type ResultState } from "@/components/app/ResultSheet";

const STATES: ResultState[] = ["pending", "sent", "received", "confirmed", "review", "failed", "expired"];

export function ResultPreview() {
  const params = useSearchParams();
  const requested = params.get("state");
  const state: ResultState = STATES.includes(requested as ResultState) ? (requested as ResultState) : "pending";
  const [open, setOpen] = useState(true);

  const common = {
    open,
    onOpenChange: setOpen,
    locale: "en" as const,
    fact: {
      amountMinor: 50_000_00,
      subject: "To Tunde Adebayo",
      at: "18 September 2026, 14:14",
      reference: "rm-p2p-6f1c2a3e-out",
    },
    actions: [
      { label: "See it in your history", href: "/wallet/transactions", tone: "primary" as const },
      { label: "Back to wallet", href: "/wallet", tone: "quiet" as const },
    ] as const,
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Result sheet" />
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Open {state}
      </Button>
      {state === "pending" || state === "review" || state === "failed" ? (
        <ResultSheet
          {...common}
          state={state}
          verdict={state === "pending" ? "Sending" : state === "review" ? "Being checked" : "Payment not sent"}
          consequence={
            state === "failed"
              ? "Nothing left your wallet. Your balance is untouched, and you can try again."
              : "This usually takes a few seconds. If it takes longer, your money has not moved and nothing is lost."
          }
        />
      ) : (
        <ResultSheet
          {...common}
          state={state}
          verdict={
            state === "sent"
              ? "Payment sent"
              : state === "received"
                ? "Money received"
                : state === "confirmed"
                  ? "Booking confirmed"
                  : "Hold expired"
          }
          consequence={
            state === "sent"
              ? "Their wallet has it already, and both sides of the movement are in your history."
              : undefined
          }
        />
      )}
    </div>
  );
}
