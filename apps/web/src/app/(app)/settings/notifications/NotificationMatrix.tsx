"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/Switch";
import { Button } from "@/components/ui/Button";
import { updateSettings } from "@/lib/profile/actions";
import type { NotificationTopic, ResolvedProfileSettings } from "@/lib/profile/model";
import {
  MATRIX_CAPTION,
  MATRIX_COL_EMAIL,
  MATRIX_COL_EVENT,
  MATRIX_COL_PUSH,
  MATRIX_NOTE,
  MATRIX_NOT_EMAILED,
  MATRIX_ROWS,
  MATRIX_SAVED,
  MATRIX_TITLE,
  QUIET_FROM,
  QUIET_SAVE,
  QUIET_SUB,
  QUIET_SWITCH,
  QUIET_TITLE,
  QUIET_TO,
  QUIET_ZONE,
} from "@/lib/settings/notifications-copy";

/**
 * NOTIFICATION SETTINGS AS A REAL MATRIX (R3-14): event by channel, and quiet
 * hours.
 *
 * Every cell is a preference delivery actually reads, and no cell is a control
 * that does nothing:
 *
 *   Email  the topic's own boolean in `profiles.settings.notifications`,
 *          which `lib/email/recipients.ts` reads for email and
 *          `private.notify` for the in-app row. Payments' is stored under
 *          `wallet` until Session 2's rename (R3-31).
 *   Push   `notifications.channels.<topic>.push`, which `wantsPush` reads
 *          first (lib/push/preferences.ts, rule 1). Shown as the policy would
 *          decide it today: the explicit answer, else the topic's boolean,
 *          else on (marketing: off).
 *   Quiet  `notifications.quiet_hours`, read by `readQuietHours`; payments are
 *          the one kind that ignores it (`isUrgentKind`).
 *
 * Price drops are push-only (B13), so their email cell is a sentence, not a
 * switch. Optimistic, reverting on refusal, like every settings toggle.
 */
type Row = "bookings" | "messages" | "payments" | "savedPriceDrops" | "marketing";
type Flags = ResolvedProfileSettings["notifications"];

const STORED_FLAG = { bookings: "bookings", messages: "messages", payments: "wallet", marketing: "marketing" } as const;
const PUSH_TOPIC: Partial<Record<Row, NotificationTopic>> = { bookings: "bookings", messages: "messages", payments: "wallet", marketing: "marketing" };
const ROWS: readonly Row[] = ["bookings", "messages", "payments", "savedPriceDrops", "marketing"];

/** The push answer as `wantsPush` would give it for this row today. */
export function pushFor(row: Row, flags: Flags): boolean {
  if (row === "savedPriceDrops") return flags.savedPriceDrops ?? true;
  const topic = PUSH_TOPIC[row] as NotificationTopic;
  const explicit = flags.channels?.[topic]?.push;
  if (typeof explicit === "boolean") return explicit;
  const legacy = flags[STORED_FLAG[row as keyof typeof STORED_FLAG]];
  if (typeof legacy === "boolean") return legacy;
  return row !== "marketing";
}

export function NotificationMatrix({ initial }: { initial: Flags }) {
  const [flags, setFlags] = useState<Flags>(initial);
  const [quiet, setQuiet] = useState(initial.quiet_hours ?? { enabled: false, from: "22:00", to: "07:00", timezone: "Africa/Lagos" });
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const save = (patch: Parameters<typeof updateSettings>[0], revert: () => void) => {
    setNote(null);
    start(async () => {
      const result = await updateSettings(patch);
      if (result.ok) {
        setFlags(result.data.notifications);
        setNote({ tone: "ok", text: MATRIX_SAVED });
        return;
      }
      revert();
      setNote({ tone: "error", text: result.error });
    });
  };

  const setEmail = (row: Exclude<Row, "savedPriceDrops">, next: boolean) => {
    const previous = flags;
    const key = STORED_FLAG[row];
    setFlags({ ...flags, [key]: next });
    save({ notifications: { [key]: next } }, () => setFlags(previous));
  };

  const setPush = (row: Row, next: boolean) => {
    const previous = flags;
    if (row === "savedPriceDrops") {
      setFlags({ ...flags, savedPriceDrops: next });
      save({ notifications: { savedPriceDrops: next } }, () => setFlags(previous));
      return;
    }
    const topic = PUSH_TOPIC[row] as NotificationTopic;
    setFlags({ ...flags, channels: { ...(flags.channels ?? {}), [topic]: { push: next } } });
    save({ notifications: { channels: { [topic]: { push: next } } } }, () => setFlags(previous));
  };

  return (
    <div className="space-y-block" data-testid="notification-matrix">
      <section className="nf-panel nf-panel--card" aria-labelledby="nf-matrix-title">
        <h2 id="nf-matrix-title" className="nf-body font-semibold text-[var(--nf-content-primary)]">
          {MATRIX_TITLE}
        </h2>
        <table className="mt-row w-full border-collapse">
          <caption className="sr-only">{MATRIX_CAPTION}</caption>
          <thead>
            <tr className="nf-caption text-[var(--nf-content-muted)]">
              <th scope="col" className="py-inline text-left font-semibold">{MATRIX_COL_EVENT}</th>
              <th scope="col" className="py-inline text-center font-semibold">{MATRIX_COL_EMAIL}</th>
              <th scope="col" className="py-inline text-center font-semibold">{MATRIX_COL_PUSH}</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const words = MATRIX_ROWS[row];
              const headId = `nf-matrix-${row}`;
              return (
                <tr key={row} className="border-t border-[var(--nf-panel-hair)]" data-testid={`matrix-row-${row}`}>
                  <th scope="row" id={headId} className="py-row pr-sm text-left align-top font-normal">
                    <span className="nf-body-sm block font-semibold text-[var(--nf-content-primary)]">{words.label}</span>
                    <span className="nf-caption block text-[var(--nf-content-muted)]">{words.sub}</span>
                  </th>
                  <td className="py-row text-center align-middle">
                    {row === "savedPriceDrops" ? (
                      <span className="nf-caption text-[var(--nf-content-muted)]">{MATRIX_NOT_EMAILED}</span>
                    ) : (
                      <span className="inline-flex justify-center">
                        <Switch
                          checked={flags[STORED_FLAG[row]] ?? row !== "marketing"}
                          onCheckedChange={(next) => setEmail(row, next)}
                          aria-label={`${words.label}: ${MATRIX_COL_EMAIL}`}
                          disabled={pending}
                          data-testid={`matrix-${row}-email`}
                        />
                      </span>
                    )}
                  </td>
                  <td className="py-row text-center align-middle">
                    <span className="inline-flex justify-center">
                      <Switch
                        checked={pushFor(row, flags)}
                        onCheckedChange={(next) => setPush(row, next)}
                        aria-label={`${words.label}: ${MATRIX_COL_PUSH}`}
                        disabled={pending}
                        data-testid={`matrix-${row}-push`}
                      />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="nf-caption mt-row text-[var(--nf-content-muted)]">{MATRIX_NOTE}</p>
      </section>

      <section className="nf-panel nf-panel--card" aria-labelledby="nf-quiet-title" data-testid="quiet-hours">
        <h2 id="nf-quiet-title" className="nf-body font-semibold text-[var(--nf-content-primary)]">
          {QUIET_TITLE}
        </h2>
        <div className="mt-row">
          <Switch
            label={QUIET_SWITCH}
            description={QUIET_SUB}
            checked={quiet.enabled}
            onCheckedChange={(next) => setQuiet({ ...quiet, enabled: next })}
            disabled={pending}
          />
        </div>
        <div className="mt-row grid grid-cols-2 gap-sm">
          <label className="grid gap-2xs">
            <span className="nf-caption text-[var(--nf-content-muted)]">{QUIET_FROM}</span>
            <input type="time" className="nf-field" value={quiet.from} onChange={(e) => setQuiet({ ...quiet, from: e.currentTarget.value })} disabled={pending} />
          </label>
          <label className="grid gap-2xs">
            <span className="nf-caption text-[var(--nf-content-muted)]">{QUIET_TO}</span>
            <input type="time" className="nf-field" value={quiet.to} onChange={(e) => setQuiet({ ...quiet, to: e.currentTarget.value })} disabled={pending} />
          </label>
        </div>
        <p className="nf-caption mt-inline text-[var(--nf-content-muted)]">{QUIET_ZONE}</p>
        <div className="mt-row">
          <Button
            variant="secondary"
            size="md"
            loading={pending}
            onClick={() => {
              const previous = flags.quiet_hours;
              save({ notifications: { quiet_hours: { ...quiet, timezone: "Africa/Lagos" } } }, () =>
                setQuiet(previous ?? { enabled: false, from: "22:00", to: "07:00", timezone: "Africa/Lagos" }),
              );
            }}
            data-testid="quiet-save"
          >
            {QUIET_SAVE}
          </Button>
        </div>
      </section>

      {note ? (
        <p role={note.tone === "error" ? "alert" : "status"} className={`nf-body-sm ${note.tone === "error" ? "text-[var(--nf-state-error)]" : "text-[var(--nf-state-success)]"}`}>
          {note.text}
        </p>
      ) : null}
    </div>
  );
}
