"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChoicePicker, type ChoiceGroup } from "./ChoicePicker";
import { fetchLocalGovernments, fetchOccupations } from "@/lib/places/actions";
import { groupOccupations, type StateOption } from "@/lib/places/reference";

/**
 * Country, state, local government, and what you do.
 *
 * Nigeria is fixed and says so rather than pretending to be a choice. State
 * comes down with the page, because 37 rows are small and every screen needs
 * them immediately. Local governments and occupations arrive when their picker
 * is first opened: 774 and 749 rows are roughly 70KB of JSON that nobody on a
 * metered connection should pay for before they have decided to answer.
 *
 * Choosing a state clears the local government under it, because a local
 * government from the previous state is exactly the contradiction the database
 * refuses with RM020, and offering to submit it would only produce an error a
 * person could have been spared.
 */

export type PlaceValues = {
  stateCode: string;
  lgaCode: string;
  occupationCode: string;
};

export function PlaceFields({
  states,
  value,
  onChange,
  fieldErrors,
  /** Names for values already chosen, so a saved answer reads back before the
      long lists have been fetched. */
  initialLabels,
}: {
  states: StateOption[];
  value: PlaceValues;
  onChange: (next: PlaceValues) => void;
  fieldErrors?: Record<string, string> | undefined;
  initialLabels?: { lgaName?: string; occupationName?: string };
}) {
  const [lgas, setLgas] = useState<ChoiceGroup[]>([]);
  const [lgaLoading, setLgaLoading] = useState(false);
  const [occupations, setOccupations] = useState<ChoiceGroup[]>([]);
  const [occupationsLoading, setOccupationsLoading] = useState(false);
  const occupationsAsked = useRef(false);
  const loadedStateRef = useRef("");

  const stateGroups: ChoiceGroup[] = useMemo(
    () => [
      {
        category: "",
        options: states.map((state) => ({ code: state.code, name: state.name })),
      },
    ],
    [states],
  );

  /* Read off the optional object once, into plain locals.
     `initialLabels?.lgaName` in a dependency array is narrower than what the
     compiler can infer from the body, which is the whole object, so the two
     disagreed and the component was dropped from optimisation entirely. A
     local is the same value stated in a form both can see. */
  const lgaLabel = initialLabels?.lgaName;
  const occupationLabel = initialLabels?.occupationName;

  /* A chosen value has to render its own name before its list exists, or a
     saved profile would read as empty until the person opened the picker. */
  const lgaGroups = useMemo<ChoiceGroup[]>(() => {
    if (lgas.length > 0) return lgas;
    if (value.lgaCode && lgaLabel) {
      return [{ category: "", options: [{ code: value.lgaCode, name: lgaLabel }] }];
    }
    return [];
  }, [lgas, value.lgaCode, lgaLabel]);

  const occupationGroups = useMemo<ChoiceGroup[]>(() => {
    if (occupations.length > 0) return occupations;
    if (value.occupationCode && occupationLabel) {
      return [
        {
          category: "",
          options: [{ code: value.occupationCode, name: occupationLabel }],
        },
      ];
    }
    return [];
  }, [occupations, value.occupationCode, occupationLabel]);

  const loadLgas = useCallback(async (stateCode: string) => {
    if (stateCode === "" || loadedStateRef.current === stateCode) return;
    loadedStateRef.current = stateCode;
    setLgaLoading(true);
    try {
      const result = await fetchLocalGovernments(stateCode);
      setLgas(
        result.ok && result.data.length > 0
          ? [
              {
                category: "",
                options: result.data.map((row) => ({ code: row.code, name: row.name })),
              },
            ]
          : [],
      );
    } catch {
      // The picker's own empty state explains that the list would not load.
      setLgas([]);
      loadedStateRef.current = "";
    } finally {
      setLgaLoading(false);
    }
  }, []);

  /* A state chosen on a previous visit should not force a tap before the local
     governments under it are available. */
  useEffect(() => {
    if (value.stateCode && lgas.length === 0 && loadedStateRef.current === "") {
      void loadLgas(value.stateCode);
    }
  }, [value.stateCode, lgas.length, loadLgas]);

  const loadOccupations = useCallback(async () => {
    if (occupationsAsked.current) return;
    occupationsAsked.current = true;
    setOccupationsLoading(true);
    try {
      const result = await fetchOccupations();
      setOccupations(result.ok ? groupOccupations(result.data) : []);
      if (!result.ok) occupationsAsked.current = false;
    } catch {
      setOccupations([]);
      occupationsAsked.current = false;
    } finally {
      setOccupationsLoading(false);
    }
  }, []);

  const chooseState = (stateCode: string) => {
    setLgas([]);
    loadedStateRef.current = "";
    onChange({ ...value, stateCode, lgaCode: "" });
    if (stateCode) void loadLgas(stateCode);
  };

  const stateName = states.find((state) => state.code === value.stateCode)?.name ?? "";

  return (
    <div className="space-y-5">
      <div>
        <span className="nf-label">Country</span>
        <div className="nf-field mt-1.5 flex items-center justify-between gap-3 opacity-80">
          <span>Nigeria</span>
          <span className="text-[0.75rem] text-[var(--nf-content-muted)]">
            The only one, for now
          </span>
        </div>
      </div>

      <ChoicePicker
        name="stateCode"
        label="State"
        placeholder="Choose your state"
        searchPlaceholder="Search 37 states"
        value={value.stateCode}
        groups={stateGroups}
        onChange={chooseState}
        error={fieldErrors?.stateCode}
        testId="state-picker"
      />

      <ChoicePicker
        name="lgaCode"
        label="Local government"
        placeholder={value.stateCode ? "Choose your local government" : "Choose a state first"}
        searchPlaceholder={stateName ? `Search ${stateName}` : "Search"}
        value={value.lgaCode}
        groups={lgaGroups}
        loading={lgaLoading}
        disabled={value.stateCode === ""}
        disabledHint="Your state decides which local governments are on this list."
        onChange={(lgaCode) => onChange({ ...value, lgaCode })}
        onOpen={() => void loadLgas(value.stateCode)}
        error={fieldErrors?.lgaCode}
        testId="lga-picker"
      />

      <ChoicePicker
        name="occupationCode"
        label="What you do"
        hint="Grouped by field. Prefer not to say is on the list and is a real answer."
        placeholder="Choose your occupation"
        searchPlaceholder="Search 749 occupations"
        value={value.occupationCode}
        groups={occupationGroups}
        loading={occupationsLoading}
        onChange={(occupationCode) => onChange({ ...value, occupationCode })}
        onOpen={() => void loadOccupations()}
        error={fieldErrors?.occupationCode}
        testId="occupation-picker"
      />
    </div>
  );
}
