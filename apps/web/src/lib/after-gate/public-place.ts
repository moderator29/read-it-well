import "server-only";

import { getDictionary } from "@vallo/i18n";
import { getLocale } from "../locale";
import { listStates } from "../social/areas-queries";
import { placeFrom } from "./public-place-model";

/** `placeFrom`, with the state name read from the states table. */
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
  const country = getDictionary(await getLocale()).afterTheGate.place.country;
  return placeFrom(area, city, stateCode, stateName, country);
}
