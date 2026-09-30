import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { SupplyPage } from "@/components/site/SupplyPage";
import { readListerFees } from "@/lib/site/lister-fees";
import { SUPPLY_DOORS } from "@/lib/site/supply-doors";

/** A9. The public front door for hosts. The facts live in `lib/site/supply-doors.ts`. */
const door = SUPPLY_DOORS.host;

export const metadata: Metadata = {
  title: door.chip,
  description: door.metaDescription,
  alternates: { canonical: door.path },
  openGraph: { url: door.path, title: door.title, description: door.metaDescription },
};

export default async function ForHostsPage() {
  const [t, fees] = await Promise.all([getLocale().then(getDictionary), readListerFees()]);
  return <SupplyPage door={door} fees={fees} t={t} />;
}
