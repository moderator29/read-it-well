import type { Metadata } from "next";
import { LeaderboardScreen } from "@/components/app/leaderboard/LeaderboardScreen";
import { LEADERBOARD_TITLE } from "@/lib/leaderboard/copy";
import { boardFromParams, periodFromParams } from "@/lib/leaderboard/model";
import { readBoard, readVisibility } from "@/lib/leaderboard/read";
import { setLeaderboardHidden } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: LEADERBOARD_TITLE, robots: { index: false, follow: false } };

/**
 * /leaderboard (D76): Referrals, and Top on Vallo (agents and landlords,
 * hotels and stays, restaurants), this month or all time, City or Global.
 * Counts of real activity only, read through public.leaderboard (pending
 * migration d76). Until it is applied the page draws the honest "opens soon"
 * state. The design is seen with sample data at /preview/leaderboard.
 */
export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const board = boardFromParams(params);
  const period = periodFromParams(params.period);
  const [read, visibility] = await Promise.all([readBoard(board, period), readVisibility()]);
  return (
    <LeaderboardScreen
      board={board}
      period={period}
      read={read}
      visibility={visibility}
      setHidden={setLeaderboardHidden}
      nowIso={new Date().toISOString()}
    />
  );
}
