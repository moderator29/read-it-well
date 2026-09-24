import "server-only";

import { publicAreaName, publicCityName } from "../share/public-text";
import { listStates } from "../social/areas-queries";

/**
 * Rule 10 for the after-the-gate surfaces a third party can read (the /r
 * receipt check, the complaint pack, the demand letter): a place is printed
 * only through the closed lists. The neighbourhood when the whole of it is on
 * the list for its state, otherwise the listed city, otherwise the state name
 * from the states table, which nobody typed. Never the lister's spelling.
 */
export async function publicPlace(
  area: string | null | undefined,
  city: string | null | undefined,
  stateCode: string | null | undefined,
): Promise<string> {
  let stateName: string | null = null;
  if (stateCode) {
    try {
      stateName = (await listStates()).find((state) => state.code === stateCode)?.name ?? null;
    } catch {
      stateName = null;
    }
  }
  const local = publicAreaName(area, stateCode) ?? publicCityName(city, stateCode);
  if (local === null) return stateName ?? "Nigeria";
  if (!stateName || local.toLowerCase() === stateName.toLowerCase()) return local;
  return `${local}, ${stateName}`;
}
