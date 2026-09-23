import SearchPage from "@/app/(app)/search/page";
import { SweepFrame } from "../Frame";

/**
 * `/search` THROUGH THE ROUTE'S OWN PAGE, with no rows reachable from this
 * box: the empty shelf. Query parameters pass through, so `?view=map` draws
 * the empty map.
 */
export const dynamic = "force-dynamic";

export default async function SweepSearchEmpty({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <SweepFrame route="/search">
      <SearchPage searchParams={searchParams} />
    </SweepFrame>
  );
}
