import { getLocale } from "@/lib/locale";
import { AssistantChat } from "@/components/app/assistant/AssistantChat";
import type { Thread } from "@/components/app/assistant/threads";
import type { AssistantListingItem } from "@/lib/assistant/types";
import { PERSON } from "../../_fixtures/people";

/**
 * Vallo AI mid-conversation, seeded from fixtures, for the side-by-side with
 * `BF49B814`.
 *
 * The two results are deliberately one of each SIDE: a hotel and a flat. The
 * hotel proves the side law on the card, because its destination must be the
 * Stays shell and not the property shell, and the only way to see that is to
 * photograph a card that has one. The seed is never written to the device.
 */
const NOW = Date.now();
const at = (minutesAgo: number) => NOW - minutesAgo * 60_000;

const RESULTS: AssistantListingItem[] = [
  {
    id: "00000000-0000-4000-8000-0000000000a1",
    title: "Grand Vista Hotel, Victoria Island",
    city: "Victoria Island, Lagos",
    kind: "hotel",
    price: "₦185,000 per night",
    rating: 4.7,
    verified: true,
    bedrooms: 1,
    bathrooms: 1,
    sizeSqm: 38,
    href: "/listing/00000000-0000-4000-8000-0000000000a1",
    photo: "/brand/photos/bedroom-01.jpg",
  },
  {
    id: "00000000-0000-4000-8000-0000000000a2",
    title: "2 Bedroom Apartment, Lekki Phase 1",
    city: "Lekki, Lagos",
    kind: "apartment",
    price: "₦1,650,000 per year",
    rating: 4.6,
    verified: true,
    bedrooms: 2,
    bathrooms: 2,
    sizeSqm: 116,
    href: "/listing/00000000-0000-4000-8000-0000000000a2",
    photo: "/brand/photos/living-room-day.jpg",
  },
];

const THREAD: Thread = {
  id: "preview-thread-f4",
  title: "Somewhere to stay in Victoria Island this weekend",
  createdAt: at(5),
  updatedAt: at(1),
  messages: [
    {
      id: "m1",
      role: "user",
      text: "Somewhere to stay in Victoria Island this weekend",
      at: at(5),
    },
    {
      id: "m2",
      role: "assistant",
      text: "Here is a room on the Stays side and a flat on the Property side, both listed on Vallo:",
      at: at(4),
      listings: RESULTS,
    },
    {
      id: "m3",
      role: "assistant",
      text: "Shall I check what the room costs for two nights, or work out what moving into the flat would come to?",
      at: at(2),
    },
    { id: "m4", role: "user", text: "The room, for two nights", at: at(1) },
  ],
};

export default async function AssistantPreview() {
  const locale = await getLocale();
  return (
    <main id="main" className="flex h-dvh min-w-0 flex-col overflow-hidden">
      <AssistantChat
        locale={locale}
        viewer={{ initials: PERSON.name.slice(0, 1), avatarUrl: PERSON.avatarUrl }}
        seed={{ threads: [THREAD], thinking: true }}
      />
    </main>
  );
}
