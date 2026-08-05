import "server-only";

import { requireAdmin } from "./guard";

/**
 * The two reference tables, read whole for the console.
 *
 * Whole, deliberately: 749 and 774 rows are small enough to filter in the
 * browser and an operator looking for one row should not have to guess its
 * spelling well enough for a server search to find it. Both reads go through
 * the admin's own client, so the same policy that governs the write governs
 * the read.
 */

export type AdminOccupation = {
  code: string;
  name: string;
  category: string;
  sortOrder: number;
};

export type AdminLocalGovernment = {
  code: string;
  stateCode: string;
  name: string;
};

export async function listOccupationsForAdmin(): Promise<AdminOccupation[]> {
  const access = await requireAdmin();
  if (access.state !== "admin") return [];

  const { data, error } = await access.supabase
    .from("occupations")
    .select("code, name, category, sort_order")
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .limit(2000);

  if (error || !data) return [];
  return data.map((row) => ({
    code: row.code,
    name: row.name,
    category: row.category,
    sortOrder: row.sort_order ?? 0,
  }));
}

export async function listLocalGovernmentsForAdmin(): Promise<AdminLocalGovernment[]> {
  const access = await requireAdmin();
  if (access.state !== "admin") return [];

  const { data, error } = await access.supabase
    .from("local_governments")
    .select("code, state_code, name")
    .order("state_code", { ascending: true })
    .order("name", { ascending: true })
    .limit(2000);

  if (error || !data) return [];
  return data.map((row) => ({
    code: row.code,
    stateCode: row.state_code,
    name: row.name,
  }));
}
