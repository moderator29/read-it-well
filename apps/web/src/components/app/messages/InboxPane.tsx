"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { readInboxPane, type PaneRow } from "@/lib/messages/pane-actions";
import { initial } from "@/lib/text/initial";

/**
 * B17: THE MESSAGES SPLIT, FROM 64REM. The inbox list on the left of an open
 * thread, so somebody answering many threads in a row taps the next one
 * instead of going back each time. The URL still changes per thread, so Back
 * and deep links hold. Below 64rem nothing changes and nothing is fetched.
 */
const WIDE = "(min-width: 64rem)";

export function InboxPane({ fixture }: { fixture?: PaneRow[] } = {}) {
  const pathname = usePathname();
  const [wide, setWide] = useState(false);
  const [fetched, setFetched] = useState<PaneRow[] | null>(null);
  /* The preview harness hands rows in; the app always reads them. */
  const rows = fixture ?? fetched;

  useEffect(() => {
    let media: MediaQueryList | null = null;
    try {
      media = window.matchMedia(WIDE);
    } catch {
      return;
    }
    const read = () => setWide(media!.matches);
    read();
    media.addEventListener("change", read);
    return () => media?.removeEventListener("change", read);
  }, []);

  /* Re-read on each thread change: the one just opened is no longer unread. */
  useEffect(() => {
    if (!wide || fixture) return;
    let cancelled = false;
    void readInboxPane()
      .then((next) => {
        if (!cancelled) setFetched(next);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [wide, pathname, fixture]);

  if (!wide || !rows || rows.length === 0) return null;
  return (
    <nav className="nf-msg-pane" aria-label="Conversations" data-testid="inbox-pane">
      <p className="nf-section-label nf-msg-pane__label">Conversations</p>
      <ul className="nf-msg-pane__list">
        {rows.map((row) => {
          const href = `/messages/${row.id}`;
          const current = pathname === href;
          return (
            <li key={row.id}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className="nf-msg-pane__row"
                data-testid="inbox-pane-row"
                data-kb-row=""
              >
                <span className="nf-msg-pane__avatar" aria-hidden="true">
                  {initial(row.name)}
                </span>
                <span className="nf-msg-pane__body">
                  <span className="nf-msg-pane__top">
                    <span className="nf-msg-pane__name">{row.name}</span>
                    <span className="nf-msg-pane__when nf-numeric">{row.when}</span>
                  </span>
                  {row.title ? <span className="nf-msg-pane__title">{row.title}</span> : null}
                  <span className="nf-msg-pane__last">{row.last}</span>
                </span>
                {row.unread > 0 ? (
                  <span className="nf-msg-pane__dot" aria-label={`${row.unread} unread`} />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
