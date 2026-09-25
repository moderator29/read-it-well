"use client";

import { useState, type ReactNode } from "react";
import type { Locale } from "@vallo/i18n/core";
import { FacilitiesStep } from "@/components/host/stays/FacilitiesStep";
import { HotelStep } from "@/components/host/stays/HotelStep";
import { HouseRulesStep } from "@/components/host/stays/HouseRulesStep";
import { PlaceStep } from "@/components/host/stays/PlaceStep";
import { RatesStep } from "@/components/host/stays/RatesStep";
import { RestaurantStep } from "@/components/host/stays/RestaurantStep";
import { RoomTypesStep } from "@/components/host/stays/RoomTypesStep";
import { StaysHead } from "@/components/host/stays/StaysParts";
import { TablesStep } from "@/components/host/stays/TablesStep";
import type { StaysStepProps } from "@/components/host/stays/types";
import { progressLabel, type HostDraft } from "@/lib/host/onboarding";

/**
 * THE DRAWN STAYS PANELS, ON THE PREVIEW HARNESS.
 *
 * REAL COMPONENTS, FIXTURE PROPS, NO SESSION. These six screens are the middle
 * of a signed-in application against a database this box cannot reach, and the
 * founder's proof rule is a fresh screenshot of each one beside its governing
 * image, taken on a server that actually hydrates. This is the only door
 * through which that is possible, and it is the same door every other sweep
 * worker on this build used.
 *
 * EVERY WRITE IS A NO-OP HERE AND THAT IS THE POINT. `run` never calls its
 * action: a preview that wrote to the estate would be a fixture page creating
 * real businesses. What is being read off these pages is the LOOK, exactly as
 * `lib/preview-harness.ts` says: never the proof of the ONE LAW, only the
 * proof of the drawing.
 */
export function StaysPreview({
  panel,
  title,
  hint,
  draft,
  locale,
  steps = 10,
  current = 4,
}: {
  panel:
    | "hotel"
    | "room-types"
    | "rates"
    | "place"
    | "house-rules"
    | "facilities"
    | "restaurant"
    | "tables";
  title?: string;
  hint?: string;
  draft: HostDraft;
  locale: Locale;
  steps?: number;
  current?: number;
}) {
  const [held, setHeld] = useState(draft);
  const [expectedRooms, setExpectedRooms] = useState(50);

  const props: StaysStepProps & { userId: string; expectedRooms: number; onExpectedRooms(n: number): void } = {
    draft: held,
    set: (key, value) => setHeld((current) => ({ ...current, [key]: value })),
    policies: PREVIEW_POLICIES,
    locale,
    pending: false,
    fieldErrors: {},
    /* Nothing is sent. See the note above. */
    run: () => {},
    saveText: (_extra, then) => then?.(),
    setNotice: () => {},
    goTo: () => {},
    advance: () => {},
    userId: PREVIEW_USER,
    expectedRooms,
    onExpectedRooms: setExpectedRooms,
  };

  let body: ReactNode = null;
  if (panel === "hotel") body = <HotelStep {...props} />;
  if (panel === "room-types") body = <RoomTypesStep {...props} />;
  if (panel === "rates") body = <RatesStep {...props} />;
  if (panel === "place") body = <PlaceStep {...props} />;
  if (panel === "house-rules") body = <HouseRulesStep {...props} />;
  if (panel === "facilities") body = <FacilitiesStep {...props} />;
  if (panel === "restaurant") body = <RestaurantStep {...props} />;
  if (panel === "tables") body = <TablesStep {...props} />;

  return (
    <div>
      <StaysHead
        title={title}
        hint={hint}
        steps={steps}
        current={current}
        label={progressLabel(current - 1, steps)}
        onBack={() => {}}
      />
      <div className="mt-lg flex flex-col gap-md">{body}</div>
    </div>
  );
}

const PREVIEW_USER = "00000000-0000-4000-8000-0000000000a1";

/**
 * THREE CANCELLATION POLICIES, AND THEY ARE A FIXTURE RATHER THAN THE
 * PLATFORM'S OWN, WHICH IS WORTH SAYING PLAINLY.
 *
 * `GOVERNING-11` screen two draws Flexible, Moderate and Strict with those
 * refund sentences, and `cancellation_policies` in this estate is seeded with
 * TWO different rows, "Free cancellation until 48 hours before" and
 * "Non-refundable" (`20260918140100`). These three exist so the drawn tiles
 * can be photographed beside the image that governs them. The live screen
 * reads whatever the table holds and draws fewer tiles when there are fewer
 * rows, which is the behaviour `HouseRulesStep` documents and this fixture
 * deliberately does not stand in for.
 *
 * Nothing here reaches the database: the preview harness never writes.
 */
export const PREVIEW_POLICIES = [
  {
    id: "ef000000-0000-4000-8000-000000000001",
    name: "Flexible",
    summary: "Full refund up to 7 days before check-in.",
    isFreeUntilHours: 168,
  },
  {
    id: "ef000000-0000-4000-8000-000000000003",
    name: "Moderate",
    summary: "Half the stay is returned up to 3 days before check-in.",
    isFreeUntilHours: 72,
  },
  {
    id: "ef000000-0000-4000-8000-000000000002",
    name: "Strict",
    summary: "The lowest rate, paid in full when you book. Nothing is returned if you cancel.",
    isFreeUntilHours: null,
  },
];
