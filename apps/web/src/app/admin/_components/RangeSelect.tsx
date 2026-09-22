"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * The renders' "Last 12 months" select. A native select, so the platform's
 * own control handles the keyboard and the screen reader, writing its value
 * to the URL (`?range=`) so the chosen window is a link and survives a
 * reload. The page reads the parameter on the server.
 */
export function RangeSelect<T extends string>({
  value,
  options,
  label,
  param = "range",
}: {
  value: T;
  options: Record<T, string>;
  label: string;
  param?: string;
}) {
  const router = useRouter();
  const pathname = usePathname() ?? "/admin";
  const search = useSearchParams();
  return (
    <label className="nf-admin-filterbar">
      <span className="sr-only">{label}</span>
      <select
        className="nf-admin-select"
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
    </label>
  );
}
