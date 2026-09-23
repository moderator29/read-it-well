import type { InspectionOutcome, InspectionState } from "./types";

/**
 * THE INSPECTION REPORT, AS THE SCREEN HOLDS IT.
 *
 * F6A8A482 (and founder/inspection-target.jpg) draws eight rooms to tick, a
 * notes field and Add Photos, and a Submit that stays disabled until all
 * eight are ticked. Request I1 (Session A, applied 23 September, migration
 * 20260923135847) is the storage: `inspection_reports`,
 * `inspection_report_items`, `inspection_report_photos`, the private
 * `inspection-photos` bucket, and a trigger that refuses a submission with
 * fewer than eight ticks and moves the parent to COMPLETED in the same
 * transaction. The writes are Session A's `saveInspectionReport` and
 * `createInspectionPhotoUpload` and `addReportPhoto` (lib/inspections/actions.ts,
 * I1 and I1b).
 *
 * This module is the screen's own view of a report and the rules for what
 * may be pressed. Pure, so it is tested rather than trusted.
 */

export const ROOM_ITEMS = [
  "exterior",
  "interior",
  "kitchen",
  "bathrooms",
  "utilities",
  "appliances",
  "safety",
  "overall",
] as const;

export type RoomItem = (typeof ROOM_ITEMS)[number];

/** The render's own words, row by row. */
export const ROOM_COPY: Record<RoomItem, { title: string; detail: string }> = {
  exterior: { title: "Exterior", detail: "Building structure, compound, security, parking" },
  interior: { title: "Interior", detail: "Rooms, walls, ceilings, doors, windows" },
  kitchen: { title: "Kitchen", detail: "Cabinets, appliances, plumbing, ventilation" },
  bathrooms: { title: "Bathrooms", detail: "Fixtures, tiles, water pressure, drainage" },
  utilities: { title: "Utilities", detail: "Power, water, internet, AC" },
  appliances: { title: "Appliances", detail: "Fridge, cooker, washing machine, others" },
  safety: { title: "Safety", detail: "Smoke detectors, fire safety, locks, security" },
  overall: { title: "Overall Condition", detail: "General notes and photos" },
};

export type InspectionReport = {
  notes: string | null;
  items: Partial<Record<RoomItem, boolean>>;
  photoCount: number;
  submittedAt: string | null;
};

/** The one sentence every report write returns while storage is off. */
export const REPORT_NOT_YET =
  "Ticking the checklist starts when inspection report storage is switched on. Nothing has been saved.";

export const EMPTY_REPORT: InspectionReport = { notes: null, items: {}, photoCount: 0, submittedAt: null };

export function isRoomItem(value: unknown): value is RoomItem {
  return typeof value === "string" && (ROOM_ITEMS as readonly string[]).includes(value);
}

export function checkedCount(items: InspectionReport["items"]): { done: number; total: number } {
  return { done: ROOM_ITEMS.filter((item) => items[item] === true).length, total: ROOM_ITEMS.length };
}

export function allChecked(items: InspectionReport["items"]): boolean {
  return ROOM_ITEMS.every((item) => items[item] === true);
}

/**
 * Whether the rooms can be ticked and the notes typed: storage is live, the
 * inspection is agreed (the report exists only for a CONFIRMED inspection,
 * I1's RLS), and the report has not been submitted.
 */
export function canEditReport(live: boolean, state: InspectionState, report: InspectionReport | null): boolean {
  return live && state === "CONFIRMED" && !report?.submittedAt;
}

/**
 * Whether Submit Inspection Report is live. With report storage: all eight
 * rooms ticked (the render's disabled-until-complete rule, which I1's trigger
 * also holds in the database). Without it: an outcome chosen, recorded
 * through the existing close action, the only record that exists then.
 *
 * With storage on there is no outcome on the report: I1 has no outcome
 * column and the parent's outcome can be written only on its move to
 * COMPLETED, which the report's trigger makes. Request I1a asks Session A to
 * carry one through; until then the outcome choice is not drawn with storage
 * on, rather than drawn and dropped.
 */
export function canSubmit(
  live: boolean,
  state: InspectionState,
  report: InspectionReport | null,
  outcome: InspectionOutcome | null,
): boolean {
  if (state !== "CONFIRMED") return false;
  if (!live) return outcome !== null;
  return !report?.submittedAt && allChecked(report?.items ?? {});
}

/** The shape `saveInspectionReport` returns (lib/inspections/actions.ts). */
export type SavedReport = {
  notes: string | null;
  submittedAt: string | null;
  items: { item: string; checked: boolean }[];
};

/** Fold what the action read back onto the screen's view, keeping the photo count. */
export function fromSaved(saved: SavedReport, photoCount: number): InspectionReport {
  const items: InspectionReport["items"] = {};
  for (const row of saved.items) if (isRoomItem(row.item)) items[row.item] = row.checked === true;
  return { notes: saved.notes, submittedAt: saved.submittedAt, items, photoCount };
}
