"use client";

import { CallHistoryRow } from "@/components/calls/CallHistoryRow";
import type { CallPillWords } from "@/components/calls/call-pill-words";
import { callMarkerView } from "@/lib/calls/screen";

/** Every pill wording, with the call-back button drawn. A client file because a button takes a function. */
const ROWS: { body: string; mine: boolean; time: string; back: boolean }[] = [
  { body: "Video call, missed", mine: false, time: "20:19", back: true },
  { body: "Video call, cancelled", mine: true, time: "20:21", back: true },
  { body: "Video call, 12 min 4 s", mine: false, time: "20:40", back: true },
  { body: "Voice call, 45 s", mine: true, time: "20:50", back: true },
  { body: "Voice call, missed", mine: true, time: "21:02", back: true },
  { body: "Voice call, declined", mine: false, time: "21:10", back: false },
];

export function PillsDemo({ words }: { words: CallPillWords }) {
  return (
    <main className="mx-auto grid max-w-xl gap-xs px-gutter py-lg">
      <h1 className="nf-h2">Nora Ginna</h1>
      {ROWS.map((r) => {
        const view = callMarkerView({ body: r.body, mine: r.mine });
        return view ? (
          <CallHistoryRow key={r.body + r.time} view={view} name="Nora" timeLabel={r.time} words={words} onCallBack={r.back ? () => undefined : undefined} />
        ) : null;
      })}
    </main>
  );
}
