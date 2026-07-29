import Link from "next/link";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { getQueueCounts } from "@/lib/admin/queries";
import { ADMIN_NAV } from "./_components/nav";
import { QueueUnavailable } from "./_components/ui";

export const dynamic = "force-dynamic";

/**
 * The overview: where the work is, right now.
 *
 * Six numbers, each one a live count from the table behind it and each one a
 * link into the queue that clears it. Nothing here is decorative; if a tile
 * reads zero, that queue really is empty.
 */
type Tile = {
  key: string;
  href: string;
  label: string;
  lede: string;
  icon: (typeof ADMIN_NAV)[number]["icon"];
};

const TILES: Tile[] = [
  {
    key: "flags",
    href: "/admin/flags",
    label: "Open message flags",
    lede: "Payment talk the safety scan caught in a conversation.",
    icon: "chat-bubble",
  },
  {
    key: "alerts",
    href: "/admin/alerts",
    label: "Open risk alerts",
    lede: "Cases raised for the operations team to work.",
    icon: "bell",
  },
  {
    key: "applications",
    href: "/admin/agents",
    label: "Agent applications",
    lede: "People waiting on a decision to start listing.",
    icon: "user",
  },
  {
    key: "listings",
    href: "/admin/listings",
    label: "Listings in review",
    lede: "Submissions waiting to be checked, approved and published.",
    icon: "building-apartment",
  },
  {
    key: "reports",
    href: "/admin/reports",
    label: "Open reports",
    lede: "Content and accounts members have reported to us.",
    icon: "search",
  },
  {
    key: "tickets",
    href: "/admin/support",
    label: "Support tickets",
    lede: "Questions the assistant could not answer on its own.",
    icon: "ticket",
  },
];

export default async function AdminOverviewPage() {
  const counts = await getQueueCounts();

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-5">
        <h1 className="nf-h1 text-[1.5rem] sm:text-[1.75rem]">Operations overview</h1>
        <p className="mt-1.5 max-w-[62ch] text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
          Every trust signal RentMe produces ends here: what the safety scan
          caught, what members reported, who is waiting to be approved, and what
          is waiting to go live. Each number is a queue you can clear.
        </p>
      </header>

      {counts.state !== "ok" ? (
        <QueueUnavailable />
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {TILES.map((tile) => {
              const value = counts.data[tile.key as keyof typeof counts.data] ?? 0;
              return (
                <li key={tile.key}>
                  <Link
                    href={tile.href}
                    className="nf-card nf-card--interactive flex h-full flex-col gap-2 p-4 sm:p-5"
                  >
                    <span className="flex items-center gap-2 text-[var(--nf-content-secondary)]">
                      <UiIcon name={tile.icon} size={18} className="shrink-0" />
                      <span className="text-[0.75rem] font-semibold uppercase tracking-wide">
                        {tile.label}
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
                      {value > 0 ? tile.lede : "This queue is clear."}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <section className="nf-card mt-4 p-4 sm:p-5">
            <h2 className="nf-h3">How the console works</h2>
            <ul className="mt-2 space-y-2 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
              <li className="flex gap-2.5">
                <UiIcon name="verified" size={16} className="mt-0.5 shrink-0 text-[var(--nf-state-success)]" />
                Every decision writes an audit row carrying your name, the record
                you touched and the status before and after. The log cannot be
                edited or deleted by anyone, including you.
              </li>
              <li className="flex gap-2.5">
                <UiIcon name="verified" size={16} className="mt-0.5 shrink-0 text-[var(--nf-state-success)]" />
                Approvals and rejections tell the person involved on the
                platform, so nobody is left guessing what happened to their
                application or their listing.
              </li>
              <li className="flex gap-2.5">
                <UiIcon name="verified" size={16} className="mt-0.5 shrink-0 text-[var(--nf-state-success)]" />
                The safety scan is invisible outside this console. Nothing in the
                app tells a member their message was flagged.
              </li>
            </ul>
            <Link
              href="/admin/switches"
              className="mt-3 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-[var(--nf-electric-300)] underline-offset-4 hover:underline"
            >
              Open the switches
              <UiIcon name="arrow-right" size={14} />
            </Link>
          </section>
        </>
      )}
    </div>
  );
}
