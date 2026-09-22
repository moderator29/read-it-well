"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Keeps a money page true while it is open.
 *
 * WHY IT LISTENS TO NOTIFICATIONS AND NOT TO THE LEDGER. Checked against the
 * production database on 22 September 2026: `public.wallet_entries` is NOT
 * in the `supabase_realtime` publication, and `public.notifications` is. The
 * trigger `wallet_entries_notify_after_change` calls
 * `private.notify_wallet_entry()`, which inserts one `kind = 'wallet'`
 * notification for the owner of every entry that becomes COMPLETED (both legs
 * of a transfer, a funding credit, a withdrawal) and for a failed withdrawal
 * or a reversal. So a wallet notification arriving for this person is exactly
 * the signal that their ledger moved, and it reaches the browser today.
 *
 * On that signal the page re-reads itself on the server (`router.refresh`),
 * so the figure and the rows come from the same RLS read as the first paint.
 * Nothing on the client does money arithmetic. A burst of rows (two legs,
 * or a funding and its fee) is collapsed into one refresh.
 *
 * RLS scopes the stream as well as the filter: `notifications_select_own`
 * only lets a person receive their own rows. The filter keeps the socket
 * quiet; the policy is the guard.
 *
 * When the ledger table joins the publication (scope request 2 in
 * docs/SESSION_B_SCOPE.md), a PENDING row, which notifies nobody, will also
 * be seen live; until then a pending withdrawal shows on the next read.
 */
export function LiveWallet({ userId }: { userId: string | null }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured()) return;
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return;
    }
    const channel = supabase
      .channel(`wallet-live-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as { kind?: string } | null;
          if (row?.kind !== "wallet") return;
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => router.refresh(), 400);
        },
      )
      .subscribe();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      void supabase.removeChannel(channel);
    };
  }, [userId, router]);

  return null;
}
