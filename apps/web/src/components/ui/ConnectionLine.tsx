"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useClientCopy } from "@/lib/i18n/client-copy";
import { onFreshCopy, servedFromKeptCopy } from "@/lib/offline/page-cache";

/**
 * THE CONNECTION LINE (details pass; offline pass, 8 October 2026). A small
 * dark pill at the top of the screen, never a wall: the page under it stays
 * the page, and everything on it that works without the network still works.
 *
 *   offline   the phone says it has no signal. The page on screen is the one
 *             this phone kept (`public/sw.js`), so the line says so: "You are
 *             offline. Showing what you saw last."
 *   kept      the phone has signal, but the network was too slow to wait for,
 *             so the worker answered with the kept copy and carried on
 *             fetching. The line says that, and the moment the fresh copy
 *             lands the page refreshes itself in place and the line goes.
 *   back      the connection returned: green for two seconds, and the page
 *             it was showing from the phone is refreshed in place.
 *
 * `navigator.onLine` is optimistic (true behind a captive portal), so this
 * only speaks of being offline when the browser is sure, and never promises a
 * send will work: a send says so on its own button (`lib/offline/send-or-keep`).
 * The server render reads as online, so nothing flashes on first paint. The
 * words are a polite status, never an alert: being offline is a fact about the
 * place, not a failure of the person.
 */
const BACK_MS = 2200;
const EXIT_MS = 220;

type Phase = "online" | "offline" | "kept" | "back" | "leaving";

export function ConnectionLine() {
  const copy = useClientCopy().details.connection;
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("online");
  const timers = useRef<number[]>([]);
  /* Whether the page on screen is a kept copy that still wants refreshing. */
  const stale = useRef(false);

  useEffect(() => {
    const clear = () => {
      for (const t of timers.current) window.clearTimeout(t);
      timers.current = [];
    };
    const refreshIfStale = () => {
      if (!stale.current) return;
      stale.current = false;
      router.refresh();
    };
    const offline = () => {
      clear();
      setPhase("offline");
    };
    const online = () => {
      clear();
      refreshIfStale();
      setPhase((was) => (was === "offline" || was === "kept" ? "back" : was));
      timers.current.push(
        window.setTimeout(() => setPhase((p) => (p === "back" ? "leaving" : p)), BACK_MS),
        window.setTimeout(() => setPhase((p) => (p === "leaving" ? "online" : p)), BACK_MS + EXIT_MS),
      );
    };
    /* The page on screen is the phone's copy: say which kind of wait it is. */
    const kept = () => {
      stale.current = true;
      setPhase(navigator.onLine ? "kept" : "offline");
    };
    if (servedFromKeptCopy()) kept();
    else if (!navigator.onLine) offline();
    /* The worker kept a fresh copy of this page after showing the old one:
       refresh in place, and the slow-connection line goes. */
    const stopFresh = onFreshCopy(() => {
      refreshIfStale();
      setPhase((p) => (p === "kept" ? "online" : p));
    });
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    return () => {
      clear();
      stopFresh();
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
    };
  }, [router]);

  if (phase === "online") return null;
  const back = phase === "back" || phase === "leaving";
  return (
    <div
      className="nf-connection"
      data-state={back ? "back" : phase === "kept" ? "kept" : "offline"}
      data-leaving={phase === "leaving" || undefined}
      data-testid="connection-line"
      role="status"
    >
      <span className="nf-connection__pill">
        <span className="nf-connection__dot" aria-hidden="true" />
        {back ? copy.back : phase === "kept" ? copy.kept : copy.offline}
      </span>
    </div>
  );
}
