"use client";

import { useState } from "react";
import type { Dictionary } from "@vallo/i18n/core";
import { ChoicePicker } from "@/components/app/place/ChoicePicker";
import { RowButton, Sheet as RowsSheet } from "@/components/app/account/rows";

/** The two migrated dialogs that need client state to open. Fixtures only. */
export function SheetsHarness({ t }: { t: Dictionary }) {
  const [value, setValue] = useState("");
  const [rows, setRows] = useState(false);
  const options = Array.from({ length: 60 }, (_, i) => ({ code: `c${i}`, name: `Occupation ${i + 1}` }));
  return (
    <div className="grid gap-md">
      <ChoicePicker
        t={t}
        name="occupationCode"
        label="Occupation"
        placeholder="Choose one"
        value={value}
        onChange={setValue}
        groups={[
          { category: "Common", options: options.slice(0, 5), shortcut: true },
          { category: "All", options },
        ]}
        testId="occupation-picker"
      />
      <RowButton label="Open a settings sheet" onClick={() => setRows(true)} testId="rows-open" />
      <RowsSheet
        open={rows}
        onClose={() => setRows(false)}
        title="A settings sheet"
        footer={
          <button type="button" className="nf-btn nf-btn--primary w-full" data-testid="rows-footer" onClick={() => setRows(false)}>
            Done
          </button>
        }
      >
        <p>Some words inside the sheet.</p>
        <button type="button" className="nf-btn nf-btn--glass mt-md w-full">A control</button>
      </RowsSheet>
    </div>
  );
}
