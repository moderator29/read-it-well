import "server-only";

/**
 * What the console needs to work Around.
 *
 * Read through the admin's own RLS-bound client, so an operator who somehow
 * reached this module without the role gets nothing rather than everything.
 * The guard in the page is the front door; this is the lock behind it.
 */

import { requireAdmin } from "../admin/guard";
import type { AreaStatus } from "./areas-schema";

export type ProposedAreaView = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  city: string;
  stateCode: string;
  blurb: string | null;
  createdAt: string;
  proposedBy: string | null;
  proposerHandle: string | null;
};

export type ModeratorApplicationView = {
  id: string;
  areaId: string;
  areaName: string;
  areaSlug: string;
  userId: string;
  handle: string | null;
  displayLabel: string | null;
  reason: string;
  createdAt: string;
};

export type OpenAreaView = {
  id: string;
  slug: string;
  name: string;
  city: string;
  status: AreaStatus;
  memberCount: number;
  moderatorCount: number;
};

export type SocialQueue = {
  proposed: ProposedAreaView[];
  applications: ModeratorApplicationView[];
  open: OpenAreaView[];
};

const EMPTY: SocialQueue = { proposed: [], applications: [], open: [] };

export async function getSocialQueue(): Promise<SocialQueue> {
  const access = await requireAdmin();
  if (access.state !== "admin") return EMPTY;
  const db = access.supabase;

  const [proposedRes, applicationsRes, openRes] = await Promise.all([
    db
      .from("areas")
      .select("id, slug, name, kind, city, state_code, blurb, created_at, created_by")
      .eq("status", "PROPOSED")
      // Oldest first. A queue sorted newest first is a queue where the oldest
      // item rots quietly, which is exactly the failure R-93 names.
      .order("created_at", { ascending: true })
      .limit(100),
    db
      .from("area_moderator_applications")
      .select("id, area_id, user_id, reason, created_at, areas(name, slug)")
      .eq("status", "PENDING")
      .order("created_at", { ascending: true })
      .limit(100),
    db
      .from("areas")
      .select("id, slug, name, city, status, member_count")
      .in("status", ["ACTIVE", "PAUSED"])
      .order("member_count", { ascending: false })
      .limit(100),
  ]);

  // One lookup for every handle the two queues need, rather than a query per row.
  const userIds = [
    ...new Set(
      [
        ...(proposedRes.data ?? []).map((row) => row.created_by),
        ...(applicationsRes.data ?? []).map((row) => row.user_id),
      ].filter((id): id is string => Boolean(id)),
    ),
  ];

  const handles = new Map<string, { handle: string; label: string | null }>();
  if (userIds.length > 0) {
    const { data } = await db
      .from("social_profiles")
      .select("user_id, handle, display_label")
      .in("user_id", userIds);
    for (const row of data ?? []) {
      handles.set(row.user_id, { handle: row.handle, label: row.display_label });
    }
  }

  const openAreaIds = (openRes.data ?? []).map((row) => row.id);
  const moderatorCounts = new Map<string, number>();
  if (openAreaIds.length > 0) {
    const { data } = await db
      .from("area_members")
      .select("area_id")
      .eq("role", "MODERATOR")
      .in("area_id", openAreaIds);
    for (const row of data ?? []) {
      moderatorCounts.set(row.area_id, (moderatorCounts.get(row.area_id) ?? 0) + 1);
    }
  }

  return {
    proposed: (proposedRes.data ?? []).map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      kind: row.kind,
      city: row.city,
      stateCode: row.state_code,
      blurb: row.blurb,
      createdAt: row.created_at,
      proposedBy: row.created_by,
      proposerHandle: row.created_by ? (handles.get(row.created_by)?.handle ?? null) : null,
    })),
    applications: (applicationsRes.data ?? []).map((row) => {
      const area = row.areas as unknown as { name: string; slug: string } | null;
      return {
        id: row.id,
        areaId: row.area_id,
        areaName: area?.name ?? "a place",
        areaSlug: area?.slug ?? "",
        userId: row.user_id,
        handle: handles.get(row.user_id)?.handle ?? null,
        displayLabel: handles.get(row.user_id)?.label ?? null,
        reason: row.reason,
        createdAt: row.created_at,
      };
    }),
    open: (openRes.data ?? []).map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      city: row.city,
      status: row.status as AreaStatus,
      memberCount: row.member_count,
      moderatorCount: moderatorCounts.get(row.id) ?? 0,
    })),
  };
}
