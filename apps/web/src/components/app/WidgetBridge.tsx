"use client";

import { useEffect } from "react";
import { looksNative } from "@/lib/native/platform";
import { mintWidgetToken, widgetTokenLive } from "@/lib/native/widget-actions";

/**
 * V-98: in the native app, hands the home-screen widget a token for the
 * person signed in, once per person. Does nothing on the web, and nothing
 * until the native widget exists.
 *
 * The native check comes first and the Supabase browser client and the widget
 * helper are imported only behind it. This component is mounted in the
 * `(app)` shell, so a static import put supabase-js in the shared chunk of
 * every in-app page, and creating the client on mount started its token
 * refresh timer in every browser tab, all for a step the web always skips.
 */
export function WidgetBridge() {
  useEffect(() => {
    if (!looksNative()) return;
    void (async () => {
      const [{ createClient }, { handWidgetToken }] = await Promise.all([
        import("@/lib/supabase/client"),
        import("@/lib/native/widget"),
      ]);
      const { data } = await createClient().auth.getSession().catch(() => ({ data: { session: null } }));
      const userId = data.session?.user.id;
      if (userId) await handWidgetToken(userId, () => mintWidgetToken("This phone"), widgetTokenLive);
    })().catch(() => undefined);
  }, []);
  return null;
}
