import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { getDictionary } from "@vallo/i18n";
import { MotionProvider } from "@/components/app/MotionProvider";
import { ClientCopyProvider } from "@/lib/i18n/client-copy";
import { clientCopyOf } from "@/lib/i18n/client-copy-of";

/**
 * The root a browser-mounted test renders into (`mount-in-browser.ts`),
 * inside the same providers the root layout draws, in English: the copy
 * provider, and the one `MotionProvider` (the root layout mounts it around
 * every page, so a test that left it out was mounting a component the way
 * production never does). Without it an `m` component renders its initial
 * frame and never animates, and a component's reduced-motion answer is never
 * the platform's own gate, so a test could pass on a tree no member sees.
 *
 * A test that still wraps its entry in its own `MotionProvider` (the ported
 * components did, before this) nests a second `LazyMotion`, which is
 * harmless: the inner one answers for its subtree with the same features
 * and the same gate.
 */
export function mount(node: ReactNode): void {
  const root = createRoot(document.getElementById("root")!);
  root.render(
    <ClientCopyProvider copy={clientCopyOf(getDictionary("en"))}>
      <MotionProvider>{node}</MotionProvider>
    </ClientCopyProvider>,
  );
  requestAnimationFrame(() => {
    (window as unknown as { __mounted: boolean }).__mounted = true;
  });
}
