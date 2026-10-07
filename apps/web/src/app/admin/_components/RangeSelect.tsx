"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Segmented } from "@/components/ui/Segmented";

/**
 * THE CONSOLE'S RANGE PILL (P6, 7 October 2026; the founder's reference 5 and
 * D74's dashboard rule: "one big figure with the unit in grey, a smooth
 * chart, a range pill"). It was a native select; on a phone that is a system
 * wheel over the chart, and on the founder's own reference the range is a
 * segmented capsule whose chosen segment is lit. The value still lives in the
 * URL (`?range=`), so a reload or a shared link keeps the range, and the
 * server reads the series for it exactly as before.
 *
 * `short` gives each option its pill word ("30 days"); the full words stay the
 * group's accessible name and each option's label where no short word is
 * given.
 */
export function RangeSelect<T extends string>({
  value,
  options,
  short,
  label,
  param = "range",
}: {
  value: T;
  options: Record<T, string>;
  short?: Partial<Record<T, string>>;
  label: string;
  param?: string;
}) {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const search = useSearchParams();
  const keys = Object.keys(options) as T[];
  return (
    <Segmented<T>
      label={label}
      semantics="radio"
      shape="pill"
      size="sm"
      options={keys.map((key) => ({ value: key, label: short?.[key] ?? options[key] }))}
      value={value}
      onChange={(next) => {
        const query = new URLSearchParams(search?.toString() ?? "");
        query.set(param, next);
        router.push(`${pathname}?${query.toString()}`, { scroll: false });
      }}
      className="nf-admin-range"
    />
  );
}
