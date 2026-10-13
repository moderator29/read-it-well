import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { ThreadView, type ThreadBubble } from "@/app/(app)/messages/[id]/ThreadView";
import { listingGaps, type HintFacts } from "@/lib/messages/hints";
import { PERSON } from "../_fixtures/people";
import { CONVERSATION_ID, LISTING_ID, RENTAL_CONTEXT } from "../f5/fixtures";

/**
 * THE PROOF HARNESS FOR THE CHAT HINTS: the real thread, a renter's side of a
 * listing conversation, with the real rules (`listingGaps`) run over a fixture
 * listing that leaves some things out. Every name and figure is invented.
 *
 *   ?stated=none    the listing states nothing the rules read (default)
 *   ?stated=most    only the rules question and the visit are left
 *   ?stated=all     nothing is missing, so the card is the visit
 *   ?visit=open     a visit is already open, so no visit chip
 *   ?role=host      the lister's side: nothing is drawn
 */
export const dynamic = "force-dynamic";

const THREAD: ThreadBubble[] = [
  { id: "m1", mine: false, body: "Hello, Luxury 2 bedroom apartment in Lekki. Happy to answer any questions.", timeLabel: "10:23", imageUrl: null },
  { id: "m2", mine: true, body: "Is the apartment available from the first of next month?", timeLabel: "10:25", imageUrl: null },
  { id: "m3", mine: false, body: "Yes, it is available from the first. Would you like to see it? I can do this Saturday or Sunday.", timeLabel: "10:26", imageUrl: null },
];

const BASE: HintFacts = {
  kind: "rental",
  intent: "rent",
  pricePeriod: "year",
  priceMinor: 450_000_000,
  utilities: undefined,
  moveInCostStated: false,
  compound: undefined,
  amenities: [],
  description: "A bright two bedroom flat on a quiet street.",
};

const STATED: Record<string, HintFacts> = {
  none: BASE,
  most: {
    ...BASE,
    utilities: { powerGrid: "MOSTLY_ON", powerBackup: "GENERATOR", waterSupply: "BOREHOLE", hasEstateAccess: false },
    moveInCostStated: true,
    compound: { parkingType: "inside" },
  },
  all: {
    ...BASE,
    utilities: { powerGrid: "MOSTLY_ON", powerBackup: "GENERATOR", waterSupply: "BOREHOLE", hasEstateAccess: false },
    moveInCostStated: true,
    compound: { parkingType: "inside" },
    description: "No pets. A quiet street.",
  },
};

type Params = { stated?: string | string[]; visit?: string | string[]; role?: string | string[] };
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function PreviewChatHints({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const facts = STATED[first(params.stated) ?? "none"] ?? BASE;
  const role = first(params.role) === "host" ? "host" : "guest";
  const visitOpen = first(params.visit) === "open";
  return (
    <div className="flex h-dvh flex-col">
      <ThreadView
        sheetCopy={{ unsafe: t.trustVisible.unsafe }}
        live={false}
        conversationId={CONVERSATION_ID}
        meId={PERSON.id}
        counterpartName="Sarah (Agent)"
        counterpartTier="none"
        listing={{
          id: LISTING_ID,
          title: "Example 2 bedroom apartment",
          area: "Lekki Phase 1",
          city: "Lagos",
          verified: false,
          approved: true,
          hue: 1,
        }}
        inspected={false}
        messages={THREAD}
        context={RENTAL_CONTEXT}
        role={role}
        threadCopy={t.threads}
        locale={locale}
        scamCopy={t.memberKit.scam}
        chatHints={{
          data: { gaps: listingGaps(facts), visitOpen, visitHref: `/listing/${LISTING_ID}/visit` },
          copy: t.chatHints,
        }}
      />
    </div>
  );
}
