import type { Metadata } from "next";
import { localizedAlternates } from "@/lib/i18n/public-metadata";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { SupplyPage } from "@/components/site/SupplyPage";
import { readListerFees } from "@/lib/site/lister-fees";
import { SUPPLY_DOORS } from "@/lib/site/supply-doors";

/** A9. The public front door for hosts. The facts live in `lib/site/supply-doors.ts`. */
const door = SUPPLY_DOORS.host;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: door.chip,
    description: door.metaDescription,
    /* A10: canonical in the page's language, and the hreflang set. */
    alternates: (await localizedAlternates(door.path)) ?? { canonical: door.path },
    openGraph: { url: door.path, title: door.title, description: door.metaDescription },
  };
}

export default async function ForHostsPage() {
  const [t, fees] = await Promise.all([getLocale().then(getDictionary), readListerFees()]);
  return <SupplyPage door={door} fees={fees} t={t} />;
}
