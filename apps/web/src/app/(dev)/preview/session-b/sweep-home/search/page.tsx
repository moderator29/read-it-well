import SearchPreview from "../../../f3/search/page";
import { SweepFrame } from "../Frame";

/** `/search` from fixture rows; `?filters=open` opens the real filter sheet. */
export const dynamic = "force-dynamic";

export default async function SweepSearch({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <SweepFrame route="/search">
      <SearchPreview searchParams={searchParams} />
    </SweepFrame>
  );
}
