import type { Metadata } from "next";
import { AssistantChat } from "@/components/app/assistant/AssistantChat";

export const metadata: Metadata = { title: "NaijaFinds AI" };

/**
 * AI Assistant destination.
 *
 * A thin server shell: the `(app)` layout supplies the navigation chrome and
 * `AssistantChat` carries the whole conversational surface as a client
 * component, so the thread, options panel and composer all hydrate together.
 */
export default function AssistantPage() {
  return <AssistantChat />;
}
