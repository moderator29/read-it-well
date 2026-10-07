import { cookies } from "next/headers";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { presentEntitlement, type ProEntitlement, type ProScope } from "./pro-entitlement";
import { PRO_VIEW_COOKIE, isProViewOn } from "./pro-view";
import { ProToggle } from "./ProToggle";

/**
 * THE PRO SWITCH'S PRESENCE RULE (founder directive D12, north star 14.2).
 *
 *   No entitlement      NOTHING. Not a greyed switch, not a padlock, not a
 *                       crown: no element at all. A disabled Pro control is an
 *                       advertisement pretending to be an interface.
 *   Entitled, Pro off   the switch, off, in the workspace header.
 *   Entitled, Pro on    the switch, on.
 *
 * Asked on the server on every render, so a lapsed plan disappears on the next
 * page, and failing closed: an entitlement that is missing, for another scope,
 * expired, or whose read throws, renders nothing. Today that is everybody,
 * because Session 2's check does not exist yet (W7-R4).
 *
 * The decision itself is `presentEntitlement`, tested on its own; pages never
 * pass `resolve` or `now`.
 */
export async function ProSwitch({
  scope,
  resolve,
  now,
}: {
  scope: ProScope;
  resolve?: (scope: ProScope) => Promise<ProEntitlement | null>;
  now?: number;
}) {
  if (!(await presentEntitlement(scope, resolve, now))) return null;

  const [jar, t] = await Promise.all([cookies(), getLocale().then(getDictionary)]);
  const copy = t.experienceFeatures.pro;
  return (
    <ProToggle
      initialOn={isProViewOn(jar.get(PRO_VIEW_COOKIE)?.value)}
      label={copy.label}
      switchLabel={copy.switchLabel}
    />
  );
}
