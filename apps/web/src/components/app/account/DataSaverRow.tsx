"use client";

import { useEffect, useState } from "react";
import type { Dictionary } from "@vallo/i18n";
import { RowSwitch, SettingsGroup } from "@/components/app/account/rows";
import { isDataSaver } from "@/lib/ui/data-saver";
import { readLite, setLite } from "@/lib/ui/lite";
import { METER_KEY, megabytes, readDays, weekBytes } from "@/lib/ui/data-meter";

/**
 * DATA SAVER, WHERE PEOPLE LOOK FOR IT. V-79.
 *
 * Its own group at the top of Settings, not a row inside Privacy. The switch
 * writes the `vallo_lite` cookie the server reads (`lib/ui/lite.ts`), so the
 * next page is rendered lighter, not only this one. Beneath it, what this
 * phone measured this week, in megabytes and never in naira
 * (`lib/ui/data-meter.ts` says why), or nothing at all when nothing has been
 * measured yet.
 */
export function DataSaverRow({ copy }: { copy: Dictionary["platform"]["lite"] }) {
  const [on, setOn] = useState(false);
  const [week, setWeek] = useState<number | null>(null);

  useEffect(() => {
    /* Read after mount: the cookie, the device setting and the meter all
       live on the phone. Every update follows an await-free read, which the
       microtask makes explicit to the effect rule. */
    void Promise.resolve().then(() => {
      setOn(readLite() || isDataSaver());
      try {
        const bytes = weekBytes(readDays(window.localStorage.getItem(METER_KEY)), Date.now());
        setWeek(bytes > 0 ? bytes : null);
      } catch {
        setWeek(null);
      }
    });
  }, []);

  const note =
    week === null
      ? undefined
      : (on ? copy.meterOn : copy.meterOff).replace("{mb}", megabytes(week));

  return (
    <SettingsGroup note={note}>
      <RowSwitch
        icon="compass"
        label={copy.label}
        sub={copy.sub}
        value={on ? copy.on : copy.off}
        checked={on}
        onChange={(next) => {
          setOn(next);
          setLite(next);
        }}
        testId="hub-data-saver"
      />
    </SettingsGroup>
  );
}
