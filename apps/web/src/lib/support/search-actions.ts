"use server";

import { buildSupportEntries } from "./search-entries";
import type { SearchEntry } from "./search";

/**
 * The search index, fetched once by the browser the first time somebody
 * focuses a search box. Public content only, the same for every visitor, so it
 * is built once per server instance and reused.
 */
let cached: SearchEntry[] | null = null;

export async function loadSupportIndex(): Promise<SearchEntry[]> {
  if (!cached) cached = buildSupportEntries();
  return cached;
}
