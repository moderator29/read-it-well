import { DirectoryScreen } from "@/components/app/directory/DirectoryScreen";
import { fixtureDirectory } from "../leaderboard/fixtures";

/**
 * The directory on SAMPLE data (D76), both sides. `side` is property or
 * stays; `state` is ready, empty or not-live. The product route is /directory,
 * which flips with the side switch.
 */
export default async function PreviewDirectory({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const side = one(params.side) === "stays" ? "stays" : "property";
  const state = one(params.state) ?? "ready";
  return (
    <main>
      <p role="note" className="nf-caption" style={{ padding: "var(--nf-space-xs) var(--nf-space-md)", textAlign: "center" }}>
        Sample data for design review. Every name and count is invented.
      </p>
      <DirectoryScreen side={side} read={fixtureDirectory(side, state)} />
    </main>
  );
}
