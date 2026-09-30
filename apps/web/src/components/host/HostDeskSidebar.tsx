"use client";

import { usePathname } from "next/navigation";
import { DeskSidebar } from "@/components/app/desk/DeskSidebar";
import { buildHostNav, hostNavActive, type HostNavLabels } from "./host-nav-model";

/**
 * The host workspace's sidebar from 1024px (plan item 20): the shared
 * `DeskSidebar` over the same `buildHostNav` model the phone drawer draws, so
 * the two cannot list different places. A client component only for the
 * path: `hostNavActive` lights Rooms on `/host/rooms/...` as the chip row did.
 */
export function HostDeskSidebar({
  labels,
  mainLabel,
  deskName,
  org,
}: {
  labels: HostNavLabels;
  mainLabel: string;
  deskName: string;
  /** The host's business when there is exactly one to name. */
  org?: string | null;
}) {
  const active = hostNavActive(usePathname()) ?? "";
  return (
    <DeskSidebar
      label={labels.workspace}
      switcher={{ name: deskName, org: org ?? null, icon: "building-hotel", href: "/host" }}
      sections={buildHostNav(labels)}
      active={active}
      mainLabel={mainLabel}
    />
  );
}
