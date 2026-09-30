"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deskKeyFor, stepRow } from "./desk-keys";

/**
 * The shared key layer (C6), mounted once per workspace. Rows opt in with
 * `data-desk-row` (and `tabIndex={-1}` or a focusable element), the approve
 * and decline controls with `data-desk-approve` / `data-desk-decline`. The
 * support desk keeps its own richer keys; this layer yields to them by not
 * mounting on the support desk.
 */
export function DeskKeys({ jumps, jumpWords }: { jumps: Readonly<Record<string, string>>; jumpWords: Readonly<Record<string, string>> }) {
  const router = useRouter();
  const [help, setHelp] = useState(false);
  const awaiting = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      /* The support desk keeps its own keys (SupportKeys). */
      if (document.querySelector("[data-testid=\"support-keys-button\"]")) return;
      const target = event.target as HTMLElement | null;
      const action = deskKeyFor(
        {
          key: event.key,
          metaKey: event.metaKey,
          ctrlKey: event.ctrlKey,
          altKey: event.altKey,
          targetTag: target?.tagName ?? null,
          targetEditable: target?.isContentEditable ?? false,
          awaitingJump: awaiting.current,
        },
        jumps,
      );
      awaiting.current = false;
      if (!action) return;
      const rows = [...document.querySelectorAll<HTMLElement>("[data-desk-row]")];
      const at = rows.findIndex((r) => r === document.activeElement || r.contains(document.activeElement));
      const focus = (el: HTMLElement | null | undefined) => {
        if (!el) return false;
        if (!el.hasAttribute("tabindex") && !/^(A|BUTTON|INPUT)$/.test(el.tagName)) el.tabIndex = -1;
        el.focus();
        el.scrollIntoView({ block: "nearest" });
        return true;
      };
      switch (action.kind) {
        case "next":
        case "prev":
          if (!focus(rows[stepRow(rows.length, at, action.kind === "next" ? 1 : -1)])) return;
          break;
        case "open":
          rows[at]?.querySelector<HTMLAnchorElement>("a[href]")?.click();
          break;
        case "approve":
        case "decline": {
          const attr = action.kind === "approve" ? "[data-desk-approve]" : "[data-desk-decline]";
          const scope = rows[at] ?? document;
          if (!focus(scope.querySelector<HTMLElement>(attr) ?? document.querySelector<HTMLElement>(attr))) return;
          break;
        }
        case "go-prefix":
          awaiting.current = true;
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => (awaiting.current = false), 1500);
          break;
        case "jump":
          router.push(action.href);
          break;
        case "help":
          setHelp((v) => !v);
          break;
        case "close":
          if (!help) return;
          setHelp(false);
          break;
      }
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [help, jumps, router]);

  useEffect(() => {
    if (help) dialog.current?.focus();
  }, [help]);

  if (!help) return null;
  return (
    <div
      ref={dialog}
      role="dialog"
      aria-modal="false"
      aria-label="Keyboard shortcuts"
      tabIndex={-1}
      className="nf-panel nf-panel--card fixed bottom-md right-md z-50 max-w-sm p-card"
      data-testid="desk-keys-help"
    >
      <p className="nf-h4">Keys</p>
      <dl className="nf-body-sm mt-xs grid grid-cols-[auto_1fr] gap-x-md gap-y-2xs">
        <dt><kbd>j</kbd> <kbd>k</kbd></dt>
        <dd>Next and previous row</dd>
        <dt><kbd>Enter</kbd></dt>
        <dd>Open the row</dd>
        <dt><kbd>a</kbd></dt>
        <dd>Go to Approve (press it to act)</dd>
        <dt><kbd>x</kbd></dt>
        <dd>Go to Decline (it asks to confirm)</dd>
        {Object.entries(jumpWords).map(([k, word]) => (
          <div key={k} className="contents">
            <dt><kbd>g</kbd> <kbd>{k}</kbd></dt>
            <dd>{word}</dd>
          </div>
        ))}
        <dt><kbd>?</kbd></dt>
        <dd>This list; Escape closes it</dd>
      </dl>
    </div>
  );
}
