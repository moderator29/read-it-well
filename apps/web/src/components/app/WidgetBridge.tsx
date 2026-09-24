"use client";

import { useEffect } from "react";
import { handWidgetToken } from "@/lib/native/widget";
import { mintWidgetToken, widgetTokenLive } from "@/lib/native/widget-actions";
import { createClient } from "@/lib/supabase/client";

/**
 * V-98: in the native app, hands the home-screen widget a token for the
 * person signed in, once per person. Does nothing on the web, and nothing
 * until the native widget exists.
 */
export function WidgetBridge() {
  useEffect(() => {
    void (async () => {
      const { data } = await createClient().auth.getSession().catch(() => ({ data: { session: null } }));
      const userId = data.session?.user.id;
      if (userId) await handWidgetToken(userId, () => mintWidgetToken("This phone"), widgetTokenLive);
    })();
  }, []);
  return null;
}
