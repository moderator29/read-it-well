"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BackControl } from "@/components/ui/BackControl";
import { decideBack, performBack } from "@/lib/nav/use-back";
import { settlePausedBack } from "@/lib/nav/paused-back";

/**
 * THE PAUSED SCREEN'S BACK: THE ORDINARY RULE, EXCEPT THAT IT NEVER LANDS ON
 * ANOTHER PAUSED SCREEN.
 *
 * Every paused social route declares `/around` as its parent
 * (`lib/nav/route-parents.ts`), and `/around` is itself paused, so the declared
 * back from a paused post showed "Around is paused" a second time. But a post
 * opened from a Messages thread should still go Back to that thread. So the
 * decision is `decideBack`'s, and only a destination that is itself social
 * (/around, /post, /stories, /u) is replaced by the home of the side the member
 * is on, decided on the server (`SocialPaused`) and passed in as `href`
 * (`lib/nav/paused-back.ts`).
 *
 * Android's hardware back follows the same rule: this marks <html> with
 * `data-social-paused` (the value is that home) while it is mounted, and
 * `NativeRuntime` reads it. `data-back-destination` is drawn like
 * `BackControl`'s: the declared home first (the server and the first client
 * render agree), then the live decision after mount.
 */
export function PausedBack({ href, label }: { href: string; label: string }) {
  const router = useRouter();
  const path = usePathname() ?? "/";
  const [live, setLive] = useState<{ path: string; href: string } | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.socialPaused = href;
    return () => {
      delete root.dataset.socialPaused;
    };
  }, [href]);

  useEffect(() => {
    /* After the router has written this screen's entry, as `BackControl` does. */
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const decision = settlePausedBack(decideBack(path, href, "web"), href);
      setLive({ path, href: "href" in decision ? decision.href : href });
    });
    return () => {
      cancelled = true;
    };
  }, [path, href]);

  const destination = live && live.path === path ? live.href : href;

  return (
    <BackControl
      surface="round"
      label={label}
      onBack={() => performBack(settlePausedBack(decideBack(path, href, "web"), href), router)}
      data-back-destination={destination}
    />
  );
}
