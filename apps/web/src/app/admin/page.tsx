import Link from "next/link";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { getQueueCounts } from "@/lib/admin/queries";
import type { UiIconName } from "@/design-system/icons/UiIcon";
import { adminUi } from "./_components/ui";

export const dynamic = "force-dynamic";

/**
 * The overview: where the work is, right now.
 *
 * Six numbers, each one a live count from the table behind it and each one a
 * link into the queue that clears it. Nothing here is decorative; if a tile
 * reads zero, that queue really is empty.
 */
type Tile = {
  key:
    | "flags"
    | "moderation"
    | "alerts"
    | "applications"
    | "listings"
    | "reports"
    | "tickets";
  href: string;
  icon: UiIconName;
};

const TILES: Tile[] = [
  { key: "flags", href: "/admin/flags", icon: "chat-bubble" },
  { key: "moderation", href: "/admin/moderation", icon: "sliders" },
  { key: "alerts", href: "/admin/alerts", icon: "bell" },
  { key: "applications", href: "/admin/agents", icon: "user" },
  { key: "listings", href: "/admin/listings", icon: "building-apartment" },
  { key: "reports", href: "/admin/reports", icon: "search" },
  { key: "tickets", href: "/admin/support", icon: "ticket" },
];

export default async function AdminOverviewPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const o = t.admin.overview;
  const ui = adminUi(t, locale);
  const counts = await getQueueCounts();

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="nf-h1 text-[1.5rem] sm:text-[1.75rem]">{o.title}</h1>
          <p className="mt-1.5 max-w-[62ch] text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
            {o.lede}
          </p>
        </div>
        {counts.state === "ok" && (
          <span
            className="nf-count-badge shrink-0"
            title="Total open across every queue"
          >
            {TILES.reduce((sum, tile) => sum + (counts.data[tile.key] ?? 0), 0)}
          </span>
        )}
      </header>

      {counts.state !== "ok" ? (
        <ui.QueueUnavailable />
      ) : (
        <>
          <ul className="nf-panel-sunken grid grid-cols-2 gap-4 lg:grid-cols-3">
            {TILES.map((tile) => {
              const value = counts.data[tile.key] ?? 0;
              const copy = o.tiles[tile.key];
              return (
                <li key={tile.key}>
                  <Link
                    href={tile.href}
                    className="nf-card nf-card--interactive flex h-full flex-col gap-2 p-4 sm:p-5"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-[var(--nf-content-secondary)]">
                        <UiIcon name={tile.icon} size={18} className="shrink-0" />
                        <span className="text-[0.75rem] font-semibold uppercase tracking-wide">
                          {copy.label}
                        </span>
                      </span>
                      <span className={`nf-tag-pill ${value > 0 ? "" : "nf-tag-pill--success"}`}>
                        {value > 0 ? "Open" : "Clear"}
                      </span>
                    </span>
                    <span
                      className="nf-numeric text-[2rem] font-bold leading-none sm:text-[2.25rem]"
                      style={{
                        color: value > 0 ? "var(--nf-content-primary)" : "var(--nf-content-muted)",
                      }}
                    >
                      {value}
                    </span>
                    <span className="text-[0.75rem] leading-relaxed text-[var(--nf-content-muted)]">
                      {value > 0 ? copy.lede : o.queueClear}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <section className="nf-card mt-4 p-4 sm:p-5">
            <h2 className="nf-h3">{o.how.title}</h2>
            <ul className="mt-2 space-y-2 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
              {[o.how.audit, o.how.notify, o.how.invisible].map((line) => (
                <li key={line} className="flex gap-3">
                  <UiIcon
                    name="verified"
                    size={16}
                    className="mt-0.5 shrink-0 text-[var(--nf-state-success)]"
                  />
                  {line}
                </li>
              ))}
            </ul>
            <Link
              href="/admin/switches"
              className="mt-3 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-[var(--nf-electric-300)] underline-offset-4 hover:underline"
            >
              {o.how.openSwitches}
              <UiIcon name="arrow-right" size={14} />
            </Link>
          </section>
        </>
      )}
    </div>
  );
}
