import Link from "next/link";
import { LeaderboardScreen } from "@/components/app/leaderboard/LeaderboardScreen";
import { boardFromParams, periodFromParams } from "@/lib/leaderboard/model";
import { previewSetHidden } from "./actions";
import { fixtureBoard } from "./fixtures";

/**
 * The leaderboard on SAMPLE data (D76), for design review. `state` is
 * ready, empty or not-live; `me=top` puts "you" on the podium; `earned=1`
 * opens the earned moment; `scope=global` starts on Global. The product
 * route is /leaderboard and reads only real activity.
 */
export default async function PreviewLeaderboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const board = boardFromParams(params);
  const period = periodFromParams(params.period);
  const state = one(params.state) ?? "ready";
  const read = fixtureBoard(board, state, one(params.me));
  return (
    <main>
      <p role="note" className="nf-caption" style={{ padding: "var(--nf-space-xs) var(--nf-space-md)", textAlign: "center" }}>
        Sample data for design review. Every name and count is invented.{" "}
        <Link className="nf-link" href="/preview/leaderboard?state=empty">
          Empty
        </Link>{" "}
        <Link className="nf-link" href="/preview/leaderboard?state=not-live">
          Not live
        </Link>
      </p>
      <LeaderboardScreen
        board={board}
        period={period}
        read={read}
        visibility={{ hidden: false, businesses: [{ id: "sample-business", name: "Harbour Suites Sample", hidden: false }] }}
        setHidden={previewSetHidden}
        base="/preview/leaderboard"
        nowIso="2026-10-07T12:00:00.000Z"
        earnedOpen={one(params.earned) === "1"}
        initialScope={one(params.scope) === "global" ? "global" : "city"}
      />
    </main>
  );
}
