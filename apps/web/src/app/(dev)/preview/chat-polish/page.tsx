import { getDictionary } from "@vallo/i18n";
import { ThreadView, type ThreadBubble } from "@/app/(app)/messages/[id]/ThreadView";
import { PillsDemo } from "./PillsDemo";
import { callMarkerView } from "@/lib/calls/screen";
import { PERSON } from "../_fixtures/people";
import { CONVERSATION_ID } from "../f5/fixtures";

/**
 * THE PROOF HARNESS FOR THE CHAT POLISH: the real thread with call pills in it
 * and photos that open full screen. Every name is invented, and the pictures
 * are drawn on the spot, so nothing is fetched.
 *
 *   /preview/chat-polish              the thread: call pills, a photo group and
 *                                     a lone photo (tap one to open the viewer)
 *   ?mode=pills                       every pill wording, with the call-back
 *                                     button drawn (a thread only draws it for a
 *                                     signed-in reader with calls on)
 */
export const dynamic = "force-dynamic";

/** A colour from hue, saturation and lightness (percent), as a hex string. Picture fixtures only. */
function hex(h: number, s: number, l: number): string {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    const v = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(v * 255).toString(16).padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

/** A drawn scene, so a photo in the viewer is something you can tell apart and pinch. */
function scene(w: number, h: number, hue: number, label: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>
  <defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='${hex(hue, 70, 62)}'/><stop offset='1' stop-color='${hex((hue + 40) % 360, 60, 30)}'/></linearGradient></defs>
  <rect width='${w}' height='${h}' fill='url(#g)'/>
  <circle cx='${w * 0.78}' cy='${h * 0.22}' r='${Math.min(w, h) * 0.09}' fill='${hex(48, 95, 82)}'/>
  <rect x='${w * 0.12}' y='${h * 0.46}' width='${w * 0.46}' height='${h * 0.4}' fill='${hex(hue, 30, 94)}'/>
  <polygon points='${w * 0.08},${h * 0.46} ${w * 0.35},${h * 0.24} ${w * 0.62},${h * 0.46}' fill='${hex((hue + 200) % 360, 40, 28)}'/>
  <rect x='${w * 0.31}' y='${h * 0.62}' width='${w * 0.09}' height='${h * 0.24}' fill='${hex(hue, 40, 24)}'/>
  <text x='${w * 0.5}' y='${h * 0.95}' font-family='sans-serif' font-size='${Math.min(w, h) * 0.05}' fill='white' text-anchor='middle'>${label}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const missedVideo = callMarkerView({ body: "Video call, missed", mine: false })!;
const cancelledOut = callMarkerView({ body: "Video call, cancelled", mine: true })!;
const talkedVideo = callMarkerView({ body: "Video call, 12 min 4 s", mine: false })!;
const talkedVoice = callMarkerView({ body: "Voice call, 45 s", mine: true })!;

const NINE_OCT = "2026-10-09T19:16:00.000Z";

const THREAD: ThreadBubble[] = [
  { id: "m1", mine: true, body: "Hey", timeLabel: "20:16", imageUrl: null, createdAt: NINE_OCT, read: true },
  { id: "c1", mine: false, body: "Video call, missed", timeLabel: "20:19", imageUrl: null, createdAt: "2026-10-09T19:19:00.000Z", call: { callId: "c1", view: missedVideo } },
  { id: "m2", mine: false, body: "Hii", timeLabel: "20:19", imageUrl: null, createdAt: "2026-10-09T19:19:30.000Z" },
  { id: "c2", mine: true, body: "Video call, cancelled", timeLabel: "20:21", imageUrl: null, createdAt: "2026-10-09T19:21:00.000Z", call: { callId: "c2", view: cancelledOut } },
  { id: "c3", mine: false, body: "Video call, 12 min 4 s", timeLabel: "20:40", imageUrl: null, createdAt: "2026-10-09T19:40:00.000Z", call: { callId: "c3", view: talkedVideo } },
  ...[
    [1200, 800, 205, "Front of the house"],
    [800, 1200, 150, "Hallway"],
    [1200, 800, 25, "Kitchen"],
    [1200, 800, 280, "Garden"],
  ].map(
    ([w, h, hue, label], i): ThreadBubble => ({
      id: `p${i}`,
      mine: false,
      body: "\u{1F4F7} Photo",
      timeLabel: "20:44",
      imageUrl: scene(w as number, h as number, hue as number, label as string),
      imageSize: { width: w as number, height: h as number },
      createdAt: "2026-10-09T19:44:00.000Z",
    }),
  ),
  { id: "m3", mine: true, body: "These look great, thank you.", timeLabel: "20:46", imageUrl: null, createdAt: "2026-10-09T19:46:00.000Z", read: true },
  { id: "p9", mine: true, body: "\u{1F4F7} Photo", timeLabel: "20:47", imageUrl: scene(1000, 1000, 340, "Floor plan"), imageSize: { width: 1000, height: 1000 }, createdAt: "2026-10-09T19:47:00.000Z", read: true },
  { id: "c4", mine: true, body: "Voice call, 45 s", timeLabel: "20:50", imageUrl: null, createdAt: "2026-10-09T19:50:00.000Z", call: { callId: "c4", view: talkedVoice } },
];

type Params = { mode?: string | string[] };
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function PreviewChatPolish({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const t = getDictionary("en");
  if (first(params.mode) === "pills") return <PillsDemo words={t.chatPolish.calls} />;
  return (
    <div className="flex h-dvh flex-col">
      <ThreadView
        sheetCopy={{ unsafe: t.trustVisible.unsafe }}
        live={false}
        conversationId={CONVERSATION_ID}
        meId={PERSON.id}
        meName="Seyi Omojuni"
        counterpartName="Nora Ginna"
        counterpartTier="none"
        listing={null}
        inspected={false}
        messages={THREAD}
        context={{ kind: "direct" }}
        threadCopy={t.threads}
        locale="en"
        sinceLine="On Vallo since October 2026"
        calls={{ copy: t.calls, enabled: false, words: t.chatPolish.calls }}
        viewerCopy={t.chatPolish.viewer}
      />
    </div>
  );
}
