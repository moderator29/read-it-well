import type { Metadata } from "next";
import { getLocale } from "@/lib/locale";
import { AssistantChat } from "@/components/app/assistant/AssistantChat";

export const metadata: Metadata = { title: "RentMe AI" };

/**
 * AI Assistant destination.
 *
 * A thin server shell: the `(app)` layout supplies the navigation chrome and
 * `AssistantChat` carries the whole conversational surface as a client
 * component, so the thread, its side navigation and the composer all hydrate
 * together.
 */
export default async function AssistantPage() {
  /* The locale is read here rather than inside the client component: a rating
     or a price in the assistant's result cards must group its digits the same
     way as the same figure on the search page. */
  const locale = await getLocale();
  return <AssistantChat locale={locale} />;
}
