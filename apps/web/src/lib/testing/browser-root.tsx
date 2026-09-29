import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { getDictionary } from "@vallo/i18n";
import { ClientCopyProvider } from "@/lib/i18n/client-copy";
import { clientCopyOf } from "@/lib/i18n/client-copy-of";

/**
 * The root a browser-mounted test renders into (`mount-in-browser.ts`),
 * inside the same copy provider the root layout draws, in English.
 */
export function mount(node: ReactNode): void {
  const root = createRoot(document.getElementById("root")!);
  root.render(<ClientCopyProvider copy={clientCopyOf(getDictionary("en"))}>{node}</ClientCopyProvider>);
  requestAnimationFrame(() => {
    (window as unknown as { __mounted: boolean }).__mounted = true;
  });
}
