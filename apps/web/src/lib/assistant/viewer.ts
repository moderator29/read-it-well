import { resolveSession } from "@/lib/actions/session";

/**
 * Who is asking the assistant, for the mark beside their own bubbles: a
 * signed-in person's avatar or initial, nothing for a guest. Shared by
 * `/assistant` and the workspace assistants so the two cannot disagree.
 * The read never throws; a screen that talks is worth more than a mark.
 */
export async function readAssistantViewer(): Promise<{ initials: string; avatarUrl: string } | undefined> {
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
