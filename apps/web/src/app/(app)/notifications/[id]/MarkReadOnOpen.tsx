"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { markNotificationsRead } from "@/lib/messages/notifications-actions";

/**
 * Opening the full view is what reads the notification.
 *
 * Fire and forget and once only: the read is the person arriving here, so it
 * needs no control and draws nothing. A miss is silent on purpose, because the
 * notice is still on screen and the list will show it unread, which is true.
 * On success the route refreshes so the bell's server-side count agrees.
 */
export function MarkReadOnOpen({ id, unread }: { id: string; unread: boolean }) {
  const router = useRouter();
  const sent = useRef(false);
  useEffect(() => {
    if (!unread || sent.current) return;
    sent.current = true;
    void markNotificationsRead({ ids: [id] }).then((result) => {
      if (result.ok) router.refresh();
    });
  }, [id, unread, router]);
  return null;
}
