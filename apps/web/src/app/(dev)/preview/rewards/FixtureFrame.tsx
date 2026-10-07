import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/app/PageHeader";

const SCREENS = [
  ["", "Dashboard"],
  ["referrals", "Referrals"],
  ["history", "History"],
  ["withdraw", "Withdraw"],
  ["paused", "Paused (D64)"],
  ["today", "What /rewards draws today"],
] as const;

/**
 * The rewards deck's frame: a plain statement that every figure is fixture
 * data, the deck's screens, and the page under the same header the product
 * route uses. Development only.
 */
export function FixtureFrame({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="nf-shell py-section">
      <div className="mx-auto max-w-2xl">
        <p role="note" className="nf-caption mb-sm" data-testid="rewards-fixture-note">
          Fixture data for design review. Every name, figure and date on this page is invented; the product route at /rewards
          reads only the member&apos;s own record.
        </p>
        <nav aria-label="Rewards deck" className="mb-md flex flex-wrap gap-sm">
          {SCREENS.map(([slug, label]) => (
            <Link key={slug} className="nf-link" href={slug ? `/preview/rewards/${slug}` : "/preview/rewards"}>
              {label}
            </Link>
          ))}
        </nav>
        <PageHeader title={title} {...(subtitle ? { subtitle } : {})} fallback="/preview" />
        {children}
      </div>
    </main>
  );
}
