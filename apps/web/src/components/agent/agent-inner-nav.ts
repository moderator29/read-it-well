import type { Dictionary } from "@vallo/i18n/core";
import type { UiIconName } from "@/design-system/icons/UiIcon";
import { buildAgentNav } from "./agent-nav-model";

/**
 * The agent desk's inner pages and their words, read on the server so the
 * client wrapper is handed plain strings. Every label is the rail's own label
 * for the same href (`buildAgentNav`), so the inner nav and the rail can never
 * call one page two things; the icons are the rail's too.
 *
 * The set is the desk: the overview and the queues and money pages under it
 * (north star 16.6, "Host and agent: today and what needs me; each queue,
 * calendar, decide, reviews, earnings, statements"). The account rows
 * (verification, the assistant, settings, help) stay in the rail only.
 */
export type AgentInnerPage =
  | "dashboard"
  | "listings"
  | "inspections"
  | "bookings"
  | "messages"
  | "reviews"
  | "earnings"
  | "analytics";

export const AGENT_INNER_PAGES: readonly { id: AgentInnerPage; href: string }[] = [
  { id: "dashboard", href: "/agent/dashboard" },
  { id: "listings", href: "/agent/listings" },
  { id: "inspections", href: "/agent/inspections" },
  { id: "bookings", href: "/agent/bookings" },
  { id: "messages", href: "/agent/messages" },
  { id: "reviews", href: "/agent/reviews" },
  { id: "earnings", href: "/agent/earnings" },
  { id: "analytics", href: "/agent/analytics" },
];

/** The inner page an agent route belongs to, or null for a page outside the desk's set. */
export function agentInnerPageFor(active: string): AgentInnerPage | null {
  return AGENT_INNER_PAGES.find((page) => active === page.href || active.startsWith(`${page.href}/`))?.id ?? null;
}

export function agentInnerNavCopy(t: Dictionary): {
  pages: { id: AgentInnerPage; label: string; href: string; icon: UiIconName | undefined }[];
  label: string;
  toggleLabel: string;
} {
  const rail = buildAgentNav(t).flatMap((section) => section.items);
  const w = t.experienceFeatures.workspace;
  return {
    pages: AGENT_INNER_PAGES.map((page) => {
      const row = rail.find((item) => item.href === page.href);
      return { id: page.id, href: page.href, label: row?.label ?? page.id, icon: row?.icon as UiIconName | undefined };
    }),
    label: w.innerNav,
    toggleLabel: w.innerNavToggle,
  };
}
