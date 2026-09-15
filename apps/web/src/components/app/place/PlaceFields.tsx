"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChoicePicker, type ChoiceGroup } from "./ChoicePicker";
import { fetchLocalGovernments, fetchOccupations } from "@/lib/places/actions";
import { groupOccupations, type StateOption } from "@/lib/places/reference";
import type { Dictionary } from "@vallo/i18n";

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
  t,
  states,
  value,
  onChange,
  fieldErrors,
  /** Names for values already chosen, so a saved answer reads back before the
      long lists have been fetched. */
  initialLabels,
}: {
  /* Handed down from the server component that resolved the locale. Both
     pickers below draw a dozen words each and none of them may be English. */
  t: Dictionary;
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

  /* Read once into a local: the callback below closes over the label, and a
     property access inside a dependency array is narrower than what the
     compiler infers from the body, which drops the component from
     optimisation - the same trap `initialLabels` records above. */
  const commonLabel = t.pickers.commonOccupations;

  const loadOccupations = useCallback(async () => {
    if (occupationsAsked.current) return;
    occupationsAsked.current = true;
    setOccupationsLoading(true);
    try {
      const result = await fetchOccupations();
      setOccupations(result.ok ? groupOccupations(result.data, commonLabel) : []);
      if (!result.ok) occupationsAsked.current = false;
    } catch {
      setOccupations([]);
      occupationsAsked.current = false;
    } finally {
      setOccupationsLoading(false);
    }
  }, [commonLabel]);

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
        <span className="nf-label">{t.pickers.countryLabel}</span>
        <div className="nf-field mt-1.5 flex items-center justify-between gap-3 opacity-80">
          <span>{t.pickers.countryName}</span>
          <span className="text-[0.75rem] text-[var(--nf-content-muted)]">
            {t.pickers.countryOnly}
          </span>
        </div>
      </div>

      <ChoicePicker
        t={t}
        name="stateCode"
        label={t.pickers.stateLabel}
        placeholder={t.pickers.statePlaceholder}
        searchPlaceholder={t.pickers.stateSearch}
        value={value.stateCode}
        groups={stateGroups}
        onChange={chooseState}
        error={fieldErrors?.stateCode}
        testId="state-picker"
      />

      <ChoicePicker
        t={t}
        name="lgaCode"
        label={t.pickers.lgaLabel}
        placeholder={value.stateCode ? t.pickers.lgaPlaceholder : t.pickers.lgaLocked}
        searchPlaceholder={
          stateName ? t.pickers.searchIn.replace("{place}", stateName) : t.pickers.search
        }
        value={value.lgaCode}
        groups={lgaGroups}
        loading={lgaLoading}
        disabled={value.stateCode === ""}
        disabledHint={t.pickers.lgaDisabledHint}
        onChange={(lgaCode) => onChange({ ...value, lgaCode })}
        onOpen={() => void loadLgas(value.stateCode)}
        error={fieldErrors?.lgaCode}
        testId="lga-picker"
      />

      <ChoicePicker
        t={t}
        name="occupationCode"
        label={t.pickers.occupationLabel}
        hint={t.pickers.occupationHint}
        placeholder={t.pickers.occupationPlaceholder}
        searchPlaceholder={t.pickers.occupationSearch}
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
