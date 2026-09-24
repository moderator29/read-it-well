import type { Dictionary, Locale } from "@vallo/i18n";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { TYPE } from "@/components/app/Screen";
import { recordLines, type RecordLineKey, type RecordRow } from "@/lib/trust/record";

/**
 * THE VALLO RECORD ON A SCREEN (V-34).
 *
 * The supplier page, the listing's agent card and `/record/[code]`: the
 * title, the counted lines, the code the lister can carry off Vallo, and the
 * sentence that says what the Record is not. The thread header draws the
 * same lines, worded by the same `recordLines`, in its own slim row.
 *
 * NOTHING RENDERS FOR A NULL. No row, or a row whose every line was gated
 * away, draws no panel at all. The one exception is deliberate: a
 * Record that has a code but nothing counted yet still shows the code and the
 * joining month, because the lister needs the code on day one and "On Vallo
 * since" is a fact, not a claim.
 *
 * A stopped lister's Record is one line in the error colour and nothing else:
 * no code to carry, because the code would point at the stop.
 */

const ICON: Record<RecordLineKey, UiIconName> = {
  stopped: "shield-stop",
  replies: "chat-bubble",
  answered: "chat-bubble",
  described: "eye",
  lets: "key",
  since: "calendar-booking",
};

export function ValloRecord({
  record,
  t,
  locale,
  className = "",
}: {
  record: RecordRow | null;
  t: Dictionary;
  locale: Locale;
  className?: string;
}) {
  const copy = t.trustVisible.record;
  const lines = recordLines(record, copy, locale);
  if (!record || lines.length === 0) return null;
  const stopped = lines[0]?.key === "stopped";

  return (
    <section
      className={`nf-panel nf-panel--card p-card ${className}`}
      aria-label={copy.title}
      data-testid="vallo-record"
    >
      <h3 className={TYPE.rowTitle}>{copy.title}</h3>
      <ul className="mt-inline grid gap-inline">
        {lines.map((line) => (
          <li
            key={line.key}
            className={`flex items-start gap-inline ${
              line.key === "stopped" ? "nf-body text-[var(--nf-state-error)]" : TYPE.body
            }`}
            data-testid={`record-line-${line.key}`}
          >
            <UiIcon name={ICON[line.key]} size={18} className="mt-3xs shrink-0" />
            <span className="min-w-0 break-words">{line.text}</span>
          </li>
        ))}
      </ul>
      {!stopped && record.recordCode && (
        <div className="mt-block">
          <p className={`${TYPE.rowTitle} nf-numeric`} data-testid="record-code">
            {copy.code.replace("{code}", record.recordCode)}
          </p>
          <p className="nf-caption mt-3xs text-[var(--nf-content-muted)]">{copy.codeHint}</p>
        </div>
      )}
      {!stopped && <p className="nf-caption mt-inline text-[var(--nf-content-muted)]">{copy.note}</p>}
    </section>
  );
}
