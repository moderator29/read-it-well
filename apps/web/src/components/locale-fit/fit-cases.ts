/**
 * Shared by the three locale-fit files: one `it` per surface and locale, each
 * mounting the surface at 390px in that locale and holding it to the three
 * things north star checklist point 22 asks of a language that runs longer than
 * English: nothing scrolls or sticks out sideways, no label is cut where the
 * design wraps it, and every tap target is still at least 44px.
 *
 * A finding that is real is not hidden: it stays a failing test, marked
 * `it.fails` ONLY when it has been reported (the key in `KNOWN` is
 * "<surface> <locale>", the value the report line), so a regression elsewhere
 * is still a red test and a fixed finding turns its `it.fails` red until the
 * entry is removed.
 */
import { appendFileSync } from "node:fs";
import { it, expect } from "vitest";
import { FIT_LOCALES, auditFit, fitMount, type FitLocale } from "@/lib/testing/locale-fit";
import { BROWSER_TEST_TIMEOUT } from "@/lib/testing/mount-in-browser";

export type FitSurface = {
  name: string;
  imports: string;
  body: string;
  setup?: string;
  css: () => Promise<string>;
  /** Where to audit from (a portalled surface is audited from the body). */
  scope?: string;
  /** Something to do before the audit (open a tray, press a button). */
  before?: (page: import("playwright-core").Page) => Promise<void>;
  viewport?: { width: number; height: number };
  /** A page-level surface that draws its own gutters. */
  bleed?: boolean;
  /** Then each of these in turn, auditing again after every one (a pager's next panel). */
  steps?: ((page: import("playwright-core").Page) => Promise<void>)[];
};

export function fitCases(surface: FitSurface, known: Record<string, string> = {}) {
  for (const locale of FIT_LOCALES) {
    const key = `${surface.name} ${locale}`;
    const run = key in known ? it.fails : it;
    run(
      `${surface.name} fits at 390px in ${locale}: no sideways overflow, no cut label, every target 44px`,
      async () => {
        const { page, close } = await fitMount({
          locale: locale as FitLocale,
          imports: surface.imports,
          body: surface.body,
          setup: surface.setup,
          css: await surface.css(),
          viewport: surface.viewport,
          bleed: surface.bleed,
        });
        try {
          if (surface.before) await surface.before(page);
          const found = await auditFit(page, surface.scope);
          for (const step of surface.steps ?? []) {
            await step(page);
            const more = await auditFit(page, surface.scope);
            found.overflow.push(...more.overflow);
            found.clipped.push(...more.clipped);
            found.targets.push(...more.targets);
          }
          for (const k of ["overflow", "clipped", "targets"] as const) found[k] = [...new Set(found[k])];
          /* A debugging aid: FIT_DUMP=<file> appends every surface's findings, whole, as JSON lines. */
          if (process.env.FIT_DUMP) appendFileSync(process.env.FIT_DUMP, `${JSON.stringify({ key, ...found })}\n`);
          expect(found.overflow.join("\n"), "sideways overflow").toBe("");
          expect(found.clipped.join("\n"), "label cut off").toBe("");
          expect(found.targets.join("\n"), "tap target under 44px").toBe("");
        } finally {
          await close();
        }
      },
      BROWSER_TEST_TIMEOUT,
    );
  }
}
