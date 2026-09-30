"use client";

import { useCallback, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";

/**
 * A workspace's drawer: the panel toggle in the bar and the full-page sheet
 * behind it, below `lg`. The agent console and the host console both open
 * theirs through this, so the toggle, the sheet's head and its close control
 * are one object and cannot drift.
 *
 * The sheet is the platform's `Sheet` in its page shape: drag and flick to
 * close, Back, Escape, the focus trap and return, the scroll lock and the safe
 * areas. It portals to <body>, which matters: the bar's backdrop blur makes it
 * the containing block for fixed descendants, and a drawer rendered inside it
 * was once 60px tall.
 *
 * `children` is a function of `close`, so every row can shut the sheet on the
 * way to its destination. Only client callers can pass one, which is fine:
 * both drawers are client components.
 */
export function WorkspaceDrawer({
  title,
  head,
  openLabel,
  closeLabel,
  children,
}: {
  /** The sheet's accessible name. */
  title: string;
  /** What sits at the top left of the drawer: the workspace's own marker. */
  head: ReactNode;
  openLabel: string;
  closeLabel: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      {/* The panel toggle, matching Personal Mode: a panel arrives beside the
          content. The system's round icon button, as the back arrow beside
          it is (`surface="round"`). */}
      <Button
        variant="icon"
        round
        leadingIcon="panel-left"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={openLabel}
        className="nf-ws-bar__btn lg:hidden"
      />

      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) close();
        }}
        title={title}
        hideTitle
        fullPage
      >
        <div className="nf-agent-drawer flex flex-col">
          <div className="mb-md flex items-center justify-between px-2xs">
            {head}
            <Button
              variant="icon"
              round
              leadingIcon="close"
              onClick={close}
              aria-label={closeLabel}
              className="nf-ws-bar__btn -mr-2xs"
            />
          </div>
          {children(close)}
        </div>
      </Sheet>
    </>
  );
}
