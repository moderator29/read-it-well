"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";
import { isInspectionHref } from "./live";

/**
 * THE OTHER SIDE MOVED: re-read without anybody pressing refresh.
 *
 * `public.inspection_requests` is NOT in the `supabase_realtime` publication
 * (checked by read-only SQL, 22 September), so this page cannot listen to the
 * row itself; adding it is Session B scope request I2. What IS published is
 * `public.notifications`, and every change of state on an inspection already
 * writes one to the party who did not make it (`private.notify_inspection_change`,
 * href `/inspections` or `/agent/inspections`). So this listens for this
 * reader's own notification rows, which RLS (`notifications_select_own`)
 * already limits to them, and when one is about an inspection it asks the
 * router to re-read the server components. The server reads are the truth;
 * the event is only the doorbell.
 *
 * Also re-reads when the tab comes back into view, which covers the reader
 * who switched notifications off for this kind.
 */
export function InspectionsLive({ userId }: { userId: string | null }) {
  const router = useRouter();

  useEffect(() => {
    if (!userId || !isSupabaseConfigured()) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`inspections-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const href = (payload.new as { href?: string | null }).href ?? null;
          if (isInspectionHref(href)) router.refresh();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, router]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") router.refresh();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);

  return null;
}
