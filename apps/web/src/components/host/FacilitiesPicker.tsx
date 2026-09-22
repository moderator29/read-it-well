"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button } from "@/components/ui/Button";
import { setAccommodationFacilities } from "@/lib/host/actions";
import { STAY_FACILITIES } from "@/lib/host/facilities";

/**
 * WHAT THE PROPERTY OFFERS. `GOVERNING-10` screen four, the facilities half.
 *
 * WHY IT MATTERS MORE THAN IT LOOKS. `accommodation_amenities` has had its
 * table, its owner helper and its RLS since M3 and nothing ever wrote a row,
 * while the stays filter lets a guest ask for wifi, parking or air
 * conditioning by name and the catalogue projection folds the codes into
 * `catalogue_entries.amenity_codes`. So every one of those filters returned
 * nothing for every hotel on the platform. This is the control that fills the
 * table.
 *
 * THE RENDER DRAWS THESE AS GLOWING TILES WITH SOFT ENDS AND THEY SHIP AS
 * ROUNDED RECTANGLES. `nf-chip` is the existing control for exactly this act,
 * carries the selected state the render shows as a lit border, and draws at
 * 14px on a 44px control, a ratio of 0.32. The shape law wins over the image
 * and the folder's README names these tiles among the capsules it translates.
 *
 * TWO TILES OF THE RENDER ARE ABSENT AND IT IS SAID IN `lib/host/facilities.ts`
 * RATHER THAN QUIETLY: "Restaurant" and "Airport shuttle" have no row in
 * `public.amenities`, so drawing them would be drawing a control that saves
 * nothing. That is the defect the property wizard shipped with, three codes in
 * the interface and none in the table, and it is not repeated here.
 */
export function FacilitiesPicker({
  accommodationId,
  chosen,
}: {
  accommodationId: string;
  /** The codes on record. */
  chosen: readonly string[];
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<Set<string>>(() => new Set(chosen));
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  function toggle(code: string) {
    setNotice(null);
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function save() {
    setNotice(null);
    start(async () => {
      const result = await setAccommodationFacilities({
        accommodationId,
        codes: [...picked],
      });
      if (!result.ok) {
        setNotice({ tone: "error", text: result.error });
        return;
      }
      setNotice({
        tone: "ok",
        text:
          result.data.codes.length === 0
            ? "Saved. This property claims no facilities, so none is shown to a guest."
            : `Saved. ${result.data.codes.length} facilit${result.data.codes.length === 1 ? "y" : "ies"} on record.`,
      });
      router.refresh();
    });
  }

  return (
    <section className="nf-host-group">
      <h2 className="nf-host-group__title">What the property offers</h2>
      <p className="nf-host-group__note">
        Only what a guest can actually use. A guest searching for parking or air conditioning is
        shown the places that claim them, so a claim that is not true is a bad review waiting.
      </p>

      <div className="mt-md flex flex-wrap gap-inline">
        {STAY_FACILITIES.map((facility) => {
          const on = picked.has(facility.code);
          return (
            <button
              key={facility.code}
              type="button"
              aria-pressed={on}
              disabled={pending}
              className={`nf-chip${on ? " nf-chip--active" : ""}`}
              onClick={() => toggle(facility.code)}
            >
              <UiIcon name={facility.mark} size={16} className="shrink-0" />
              {facility.label}
            </button>
          );
        })}
      </div>

      <Button
        variant="secondary"
        size="lg"
        full
        className="mt-md"
        disabled={pending}
        loading={pending}
        onClick={save}
      >
        Save the facilities
      </Button>

      {notice && (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className={`nf-caption mt-row ${
            notice.tone === "error"
              ? "text-[var(--nf-state-error)]"
              : "text-[var(--nf-state-success)]"
          }`}
        >
          {notice.text}
        </p>
      )}
    </section>
  );
}
