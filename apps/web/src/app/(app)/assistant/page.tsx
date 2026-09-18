import type { Metadata } from "next";
import { getLocale } from "@/lib/locale";
import { resolveSession } from "@/lib/actions/session";
import { AssistantChat } from "@/components/app/assistant/AssistantChat";

export const metadata: Metadata = { title: "Vallo AI" };

/**
 * AI Assistant destination.
 *
 * A thin server shell: the route is immersive, so `AssistantChat` carries the
 * whole surface, its own bar included, and the thread, the side navigation
 * and the composer all hydrate together.
 *
 * The one fact read here is who is asking, for the mark beside their own
 * bubbles: a signed-in person's avatar or initials, nothing for a guest.
 * The read never throws; a screen that talks is worth more than a mark.
 */
export const dynamic = "force-dynamic";

async function readViewer(): Promise<{ initials: string; avatarUrl: string } | undefined> {
  try {
    const session = await resolveSession();
    if (session.state !== "signed-in") return undefined;
    const { data } = await session.supabase
      .from("profiles")
      .select("first_name, display_name, avatar_url")
      .eq("id", session.user.id)
      .maybeSingle();
    const name = (data?.first_name || data?.display_name || "").trim();
    const initials = name ? name.slice(0, 1).toUpperCase() : "";
    return { initials, avatarUrl: data?.avatar_url ?? "" };
  } catch {
    return undefined;
  }
}

export default async function AssistantPage() {
  /* The locale is read here rather than inside the client component: a rating
     or a price in the assistant's result cards must group its digits the same
     way as the same figure on the search page. */
  const [locale, viewer] = await Promise.all([getLocale(), readViewer()]);
  return <AssistantChat locale={locale} viewer={viewer} />;
}
