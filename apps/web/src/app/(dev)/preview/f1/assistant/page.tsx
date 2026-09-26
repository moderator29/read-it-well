import { getDictionary } from "@vallo/i18n";
import { assistantCopyOf } from "@/components/app/assistant/assistant-copy";
import { getLocale } from "@/lib/locale";
import { AssistantChat } from "@/components/app/assistant/AssistantChat";
import type { Thread } from "@/components/app/assistant/threads";
import { ASSISTANT_ITEMS } from "../listings";
import { PERSON } from "../../_fixtures/people";

/**
 * The assistant mid-conversation, seeded with a fixture thread so the
 * bubbles, the inline result cards and the thinking state can all be
 * screenshotted here. The seed is never written to the device. The route
 * itself streams from /api/assistant and this page proves only the look.
 */
const NOW = Date.now();
const at = (minutesAgo: number) => NOW - minutesAgo * 60_000;

const THREAD: Thread = {
  id: "preview-thread",
  title: "Show me 2-bed in Lekki under 2m",
  createdAt: at(4),
  updatedAt: at(1),
  messages: [
    { id: "m1", role: "user", text: "Show me 2-bed in Lekki under 2m", at: at(4) },
    {
      id: "m2",
      role: "assistant",
      text: "I found two 2-bedroom flats in Lekki under 2,000,000 a year on Vallo:",
      at: at(3),
      listings: ASSISTANT_ITEMS,
    },
    {
      id: "m3",
      role: "assistant",
      text: "Both are within your budget. Would you like more options, or shall I work out what moving in would cost?",
      at: at(2),
    },
    { id: "m4", role: "user", text: "The first one, please", at: at(1) },
  ],
};

export default async function PreviewAssistant() {
  const locale = await getLocale();
  return (
    <main id="main" className="flex h-dvh min-w-0 flex-col overflow-hidden">
      <AssistantChat
        locale={locale}
        viewer={{ initials: PERSON.name.slice(0, 1), avatarUrl: PERSON.avatarUrl }}
        seed={{ threads: [THREAD], thinking: true }}
        t={assistantCopyOf(getDictionary(locale))}
      />
    </main>
  );
}
