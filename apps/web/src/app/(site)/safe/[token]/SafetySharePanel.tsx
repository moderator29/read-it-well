import { formatDate, type Dictionary, type Locale } from "@vallo/i18n/core";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { SafetyShareView } from "@/lib/doors/safety";

function time(iso: string | null, locale: Locale): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return formatDate(date, locale, { hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" });
}

type ShareCopy = Dictionary["trustDoors"]["safetyShare"];

/** The live page, apart from its read, so the preview harness can draw it from fixtures. */
export function SafetySharePanel({
  view,
  copy,
  locale,
}: {
  view: Extract<SafetyShareView, { state: "live" }>;
  copy: ShareCopy;
  locale: Locale;
}) {
  const area = view.area ?? "";
  const title = view.firstName
    ? copy.pageTitle.replace("{name}", view.firstName).replace("{area}", area)
    : copy.pageTitleNoName.replace("{area}", area);
  const status = view.checkedInAt ? "done" : view.overdue ? "overdue" : "waiting";

  return (
    <article className="px-lg py-section" data-testid="safety-live">
      <h1 className="nf-h2 text-[var(--nf-content-primary)]">{title}</h1>

      <div className="mt-md space-y-xs text-[length:var(--nf-text-body)] leading-relaxed text-[var(--nf-content-secondary)]">
        {view.slotAt && view.expectedBackAt && (
          <p className="nf-numeric">
            {copy.pageWhen.replace("{start}", time(view.slotAt, locale)).replace("{back}", time(view.expectedBackAt, locale))}
          </p>
        )}
      </div>

      <div
        role="status"
        className="mt-lg rounded-[var(--nf-container-radius)] border p-md"
        style={{
          borderColor:
            status === "done"
              ? "color-mix(in oklab, var(--nf-state-success) 45%, transparent)"
              : status === "overdue"
                ? "color-mix(in oklab, var(--nf-state-error) 45%, transparent)"
                : "var(--nf-border-subtle)",
        }}
        data-testid={`safety-${status}`}
      >
        <p
          className="flex items-center gap-xs font-semibold"
          style={{
            color:
              status === "done"
                ? "var(--nf-state-success)"
                : status === "overdue"
                  ? "var(--nf-state-error)"
                  : "var(--nf-content-primary)",
          }}
        >
          <UiIcon
            name={status === "done" ? "verified" : status === "overdue" ? "shield-stop" : "history"}
            size={20}
            className="shrink-0"
          />
          <span>
            {status === "done"
              ? copy.pageDone.replace("{time}", time(view.checkedInAt, locale))
              : status === "overdue"
                ? copy.pageOverdue
                : copy.pageWaiting}
          </span>
        </p>
        {status !== "done" && (
          <a href="tel:112" className="nf-btn nf-btn--danger nf-btn--md mt-sm inline-flex min-h-11">
            {copy.call}
          </a>
        )}
      </div>

      <p className="mt-lg text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-muted)]">
        {copy.pageNoAddress}
      </p>
    </article>
  );
}

