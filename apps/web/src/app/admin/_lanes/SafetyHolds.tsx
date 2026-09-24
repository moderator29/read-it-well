import { getDictionary } from "@vallo/i18n";
import { Panel } from "../_review/parts";
import { SafetyHoldButtons } from "./SafetyHoldButtons";

/**
 * V-63: the open safety holds, soonest to lapse first, each with Clear and
 * Extend. Read under the admin's own session through `open_safety_holds`,
 * which answers staff only. The desk reads English.
 */
const desk = getDictionary("en").trustVisible.desk;

export type SafetyHoldRow = { id: string; heldName: string; expiresAt: string };

function day(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  }).format(new Date(iso));
}

export function SafetyHolds({ rows }: { rows: SafetyHoldRow[] | null }) {
  return (
    <Panel title={desk.holdsTitle} note={desk.holdsLede}>
      {rows === null ? (
        <p className="nf-rv-msg" role="alert">
          {desk.holdsUnavailable}
        </p>
      ) : rows.length === 0 ? (
        <p className="nf-rv-msg" data-testid="safety-holds-empty">
          {desk.holdsEmpty}
        </p>
      ) : (
        <ul className="grid gap-xs" data-testid="safety-holds">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-xs">
              <span className="nf-rv-msg min-w-0 flex-1">
                {desk.holdsRow.replace("{name}", row.heldName).replace("{date}", day(row.expiresAt))}
              </span>
              <SafetyHoldButtons holdId={row.id} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/** `open_safety_holds` rows, narrowed. */
export function safetyHoldRowsFrom(data: unknown): SafetyHoldRow[] {
  if (!Array.isArray(data)) return [];
  return (data as Record<string, unknown>[])
    .filter((r) => typeof r?.id === "string" && typeof r.expires_at === "string")
    .map((r) => ({
      id: r.id as string,
      heldName: typeof r.held_name === "string" ? r.held_name : "A member",
      expiresAt: r.expires_at as string,
    }));
}
