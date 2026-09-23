import SearchLoading from "@/app/(app)/search/loading";
import ListingLoading from "@/app/(app)/listing/[id]/loading";
import { SweepFrame } from "../Frame";

/** The two loading skeletons of the group, `?of=search` or `?of=listing`. */
export const dynamic = "force-dynamic";

export default async function SweepLoading({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { of } = await searchParams;
  return (
    <SweepFrame route={of === "listing" ? "/listing/loading" : "/search"}>
      {of === "listing" ? <ListingLoading /> : <SearchLoading />}
    </SweepFrame>
  );
}
