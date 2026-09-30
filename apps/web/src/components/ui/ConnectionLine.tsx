"use client";

import { useEffect, useRef, useState } from "react";
import { useClientCopy } from "@/lib/i18n/client-copy";

/**
 * THE CONNECTION LINE (details pass). A small dark pill at the top of the
 * screen while the phone is offline, saying what still works; when the
 * connection comes back it turns green, says so for two seconds, and leaves.
 *
 * `navigator.onLine` is optimistic (true behind a captive portal), so this
 * only speaks when the browser is sure it is offline and never promises a
 * send will work. The server render reads as online, so nothing flashes on
 * first paint. The words are a polite status, never an alert: being offline
 * is a fact about the place, not a failure of the person.
 */
const BACK_MS = 2200;
const EXIT_MS = 220;

type Phase = "online" | "offline" | "back" | "leaving";

export function ConnectionLine() {
  const copy = useClientCopy().details.connection;
  const [phase, setPhase] = useState<Phase>("online");
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const clear = () => {
      for (const t of timers.current) window.clearTimeout(t);
      timers.current = [];
    };
    const offline = () => {
      clear();
      setPhase("offline");
    };
    const online = () => {
      clear();
      setPhase((was) => (was === "offline" ? "back" : was));
      timers.current.push(
        window.setTimeout(() => setPhase((p) => (p === "back" ? "leaving" : p)), BACK_MS),
        window.setTimeout(() => setPhase((p) => (p === "leaving" ? "online" : p)), BACK_MS + EXIT_MS),
      );
    };
    if (!navigator.onLine) offline();
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    return () => {
      clear();
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
    };
  }, []);

  if (phase === "online") return null;
  const back = phase === "back" || phase === "leaving";
  return (
    <div
      className="nf-connection"
      data-state={back ? "back" : "offline"}
      data-leaving={phase === "leaving" || undefined}
      data-testid="connection-line"
      role="status"
    >
      <span className="nf-connection__pill">
        <span className="nf-connection__dot" aria-hidden="true" />
        {back ? copy.back : copy.offline}
      </span>
    </div>
  );
}
