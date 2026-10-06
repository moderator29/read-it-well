"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatMoney, type Locale } from "@vallo/i18n/core";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { updateRatePlan } from "@/lib/host/calendar-actions";
import { nairaToMinor, type RatePlanLite } from "@/lib/host/rate-calendar";

/**
 * EDIT A PUBLISHED RATE (C1). Before this there was no way to change a rate
 * once it existed: `addRatePlanDraft` was the only writer and it only adds.
 * The nightly rate and the shortest and longest stay are what a hotel
 * changes; the cancellation policy stays where the application set it,
 * because changing terms under a guest's feet is not a calendar decision.
 */
export function RatePlanSheet({
  open,
  onOpenChange,
  plan,
  locale,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: RatePlanLite;
  locale: Locale;
  onDone: (message: string) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [rate, setRate] = useState(String(plan.rateMinor / 100));
  const [minStay, setMinStay] = useState(String(plan.minStayNights ?? 1));
  const [maxStay, setMaxStay] = useState(plan.maxStayNights ? String(plan.maxStayNights) : "");
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const rateMinor = nairaToMinor(rate);
  const min = Number.parseInt(minStay, 10);
  const max = maxStay.trim() === "" ? null : Number.parseInt(maxStay, 10);

  const save = () =>
    start(async () => {
      setError(null);
      setFields({});
      const result = await updateRatePlan({
        ratePlanId: plan.id,
        rateMinor: rateMinor ?? 0,
        minStayNights: Number.isFinite(min) ? min : 1,
        maxStayNights: max !== null && Number.isFinite(max) ? max : null,
      });
      if (!result.ok) {
        setError(result.error);
        setFields(result.fieldErrors ?? {});
        return;
      }
      onDone(`${plan.name} is now ${formatMoney(rateMinor ?? 0, locale)} a night.`);
      onOpenChange(false);
      router.refresh();
    });

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => !pending && onOpenChange(next)}
      title={`Edit ${plan.name}`}
      detents={[0.8]}
      footer={
        <div className="flex flex-wrap gap-sm">
          <Button variant="secondary" size="lg" full disabled={pending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="lg" full loading={pending} disabled={pending || rateMinor === null} onClick={save}>
            Save the rate
          </Button>
        </div>
      }
    >
      <div className="grid gap-md">
        <TextField
          label="A night, in naira"
          inputMode="decimal"
          value={rate}
          onChange={(event) => setRate(event.target.value)}
          error={fields.rateMinor}
          hint="Nights you priced yourself keep their own price."
        />
        <div className="grid grid-cols-2 gap-sm">
          <TextField
            label="Shortest stay"
            inputMode="numeric"
            value={minStay}
            onChange={(event) => setMinStay(event.target.value)}
            error={fields.minStayNights}
            hint="Nights"
          />
          <TextField
            label="Longest stay"
            inputMode="numeric"
            value={maxStay}
            onChange={(event) => setMaxStay(event.target.value)}
            error={fields.maxStayNights}
            hint="Leave empty for no limit"
          />
        </div>
        <p className="nf-caption">
          New requests are priced from the new rate. A request already made keeps the price it was made at.
        </p>
        {error ? (
          <p className="nf-rcal-panel__error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </Sheet>
  );
}
