"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * THE DESKS' PERIOD SELECT (plan item 14, spec 13's top bar: "Last 30
 * days", a quiet select with a calendar glyph). Generalised from the
 * console's own so the host, agent and console desks share one control.
 *
 * A native select, so the platform's own control handles the keyboard and
 * the screen reader, writing its value to the URL (`?range=` by default) so
 * the chosen window is a link and survives a reload. The page reads the
 * parameter on the server; this control never computes a figure.
 *
 * `tone="console"` keeps the console's existing field classes, so the admin
 * pages that already draw it look exactly as they did.
 */
export function RangeSelect<T extends string>({
  value,
  options,
  label,
  param = "range",
  tone = "desk",
}: {
  value: T;
  options: Record<T, string>;
  label: string;
  param?: string;
  tone?: "desk" | "console";
}) {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const search = useSearchParams();
  const inConsole = tone === "console";
  return (
    <label className={inConsole ? "nf-admin-filterbar" : "nf-desk-range"}>
      <span className="sr-only">{label}</span>
      {inConsole ? null : <UiIcon name="calendar-booking" size={16} className="nf-desk-range__glyph" />}
      <select
        className={inConsole ? "nf-admin-select" : "nf-desk-range__select"}
        value={value}
        onChange={(event) => {
          const next = new URLSearchParams(search?.toString() ?? "");
          next.set(param, event.target.value);
          router.push(`${pathname}?${next.toString()}`, { scroll: false });
        }}
      >
        {(Object.keys(options) as T[]).map((key) => (
          <option key={key} value={key}>
            {options[key]}
          </option>
        ))}
      </select>
      {inConsole ? null : <UiIcon name="chevron-down" size={16} className="nf-desk-range__chev" />}
    </label>
  );
}
