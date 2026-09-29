"use client";

import { RangeSelect as DeskRangeSelect } from "@/components/app/desk/RangeSelect";

/**
 * The console's "Last 12 months" select: the shared desk control
 * (`components/app/desk/RangeSelect.tsx`, plan item 14) in the console's own
 * field classes, so every console page that draws it is unchanged.
 */
export function RangeSelect<T extends string>(props: {
  value: T;
  options: Record<T, string>;
  label: string;
  param?: string;
}) {
  return <DeskRangeSelect<T> {...props} tone="console" />;
}
