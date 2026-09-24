import "server-only";

import { resolveSession } from "../actions/session";
import type { BriefView } from "./brief";

/**
 * V-95: THE READS. The renter's own briefs under RLS (owner only) and the
 * answers to each through `my_brief_answers` (published listings only, ranked
 * by publication, never by who answered first); the lister's briefs through
 * `briefs_for_me`, which never carries who posted them. Null is a failed read.
 */

type Rpc = (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;

type BriefRow = {
  id: string;
  state_code: string;
  areas: string[];
  intent: "rent" | "sale";
  property_type: BriefView["propertyType"];
  bedrooms_min: number | null;
  max_minor: number | string | null;
  move_from: string | null;
  created_at: string;
  expires_at: string;
  closed_at?: string | null;
  answered?: number;
};

function view(row: BriefRow): BriefView {
  return {
    id: row.id,
    stateCode: row.state_code,
    areas: row.areas ?? [],
    intent: row.intent,
    propertyType: row.property_type,
    bedroomsMin: row.bedrooms_min === null ? null : Number(row.bedrooms_min),
    maxMinor: row.max_minor === null ? null : Math.trunc(Number(row.max_minor)),
    moveFrom: row.move_from,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    closedAt: row.closed_at ?? null,
  };
}

export type MyBrief = BriefView & { answers: { listingId: string; conversationId: string | null }[] };

type Table = {
  from: (t: "briefs") => {
    select: (cols: string) => {
      order: (col: string, opts: { ascending: boolean }) => {
        limit: (n: number) => PromiseLike<{ data: unknown; error: unknown }>;
      };
    };
  };
};

export async function readMyBriefs(): Promise<MyBrief[] | null> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  try {
    const { data, error } = await (session.supabase as unknown as Table)
      .from("briefs")
      .select("id, state_code, areas, intent, property_type, bedrooms_min, max_minor, move_from, created_at, expires_at, closed_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error || !Array.isArray(data)) return null;
    const rpc = session.supabase.rpc.bind(session.supabase) as unknown as Rpc;
    return await Promise.all(
      (data as BriefRow[]).map(async (row) => {
        const { data: answers } = await rpc("my_brief_answers", { p_brief: row.id });
        return {
          ...view(row),
          answers: Array.isArray(answers)
            ? (answers as { listing_id: string; conversation_id: string | null }[]).map((a) => ({
                listingId: a.listing_id,
                conversationId: a.conversation_id,
              }))
            : [],
        };
      }),
    );
  } catch {
    return null;
  }
}

export type DeskBrief = BriefView & { answered: number };

export async function readBriefsForMe(): Promise<DeskBrief[] | null> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  try {
    const rpc = session.supabase.rpc.bind(session.supabase) as unknown as Rpc;
    const { data, error } = await rpc("briefs_for_me");
    if (error || !Array.isArray(data)) return null;
    return (data as BriefRow[]).map((row) => ({ ...view(row), answered: Number(row.answered ?? 0) }));
  } catch {
    return null;
  }
}
