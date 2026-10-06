/**
 * Porting checklist point 8 and 9 (COMPONENT_LIBRARY.md section 2): every ported
 * component at 320, 390, 768 and 1440 wide, in both themes, with the longest
 * kind of string the four locales produce (Hausa runs well past English), and
 * nothing may overflow its own box or push the page sideways.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  BROWSER_TEST_TIMEOUT,
  closeBrowser,
  hasBrowser,
  mountInBrowser,
  warmBrowser,
} from "@/lib/testing/mount-in-browser";
import { PORTED_CSS } from "./ported-test-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const LONG = "Tabbatarwa da kammala aikin gaba daya yanzu";
const VERY_LONG = "Tabbatarwa-da-kammala-aikin-gaba-daya-yanzu-ba-tare-da-bata-lokaci-ba";

const entry = `
  import { DragToConfirm } from "@/components/ui/DragToConfirm";
  import { Unfold } from "@/components/ui/Unfold";
  import { SlidePagination } from "@/components/ui/SlidePagination";
  import { LiveIsland } from "@/components/ui/LiveIsland";
  import { InnerNav } from "@/components/ui/InnerNav";
  import { BatchTray } from "@/components/ui/BatchTray";
  import { AIResponse } from "@/components/ui/AIResponse";
  import { BookCallButton } from "@/components/ui/BookCallButton";
  import { mount } from "@/lib/testing/browser-root";
  const LONG = ${JSON.stringify(LONG)};
  const VERY_LONG = ${JSON.stringify(VERY_LONG)};
  mount(
    <div style={{ padding: 16 }}>
      <div data-fit="dtc"><DragToConfirm label={LONG} confirmingLabel={LONG} confirmedLabel={LONG} onConfirm={() => {}} /></div>
      <div data-fit="unfold" style={{ marginTop: 16 }}>
        <Unfold defaultValue={["a"]} items={[{ id: "a", title: LONG, hint: LONG, icon: "info", content: <p>{LONG} {VERY_LONG}</p> }]} />
      </div>
      <div data-fit="pag" style={{ marginTop: 16 }}>
        <SlidePagination page={1234} pageCount={5678} onChange={() => {}} label={LONG} previousLabel={LONG} nextLabel={LONG} pageLabel={(n) => LONG + n} />
      </div>
      <div data-fit="nav" style={{ marginTop: 16 }}>
        <InnerNav label={LONG} toggleLabel={LONG} currentLabel={LONG} activeId="a" items={[{ id: "a", label: LONG, icon: "home", href: "#a" }, { id: "b", label: VERY_LONG, onSelect: () => {} }]} />
      </div>
      <div data-fit="ai" style={{ marginTop: 16 }}>
        <AIResponse status="done" label={LONG} thinkingLabel={LONG} statusLabels={{ done: LONG, stopped: LONG, error: LONG }}
          actions={[{ id: "a", label: LONG, onSelect: () => {} }]}><p>{LONG} {VERY_LONG}</p></AIResponse>
      </div>
      <div data-fit="call" style={{ marginTop: 16 }}><BookCallButton onClick={() => {}}>{LONG}</BookCallButton></div>
      <LiveIsland label={LONG} title={LONG} detail={LONG} icon="clock" defaultExpanded
        steps={[{ id: "s", label: LONG, state: "current" }]} stepStateLabels={{ done: "d", current: "c", todo: "t" }}
        action={{ label: LONG, onClick: () => {} }} expandLabel={LONG} collapseLabel={LONG} data-testid="island" />
      <BatchTray count={12} countLabel={LONG} label={LONG} clearLabel={LONG} onClear={() => {}}
        actions={[{ id: "a", label: LONG, onSelect: () => {} }, { id: "b", label: LONG, onSelect: () => {} }]} data-testid="tray" />
    </div>
  );
`;

const WIDTHS = [320, 390, 768, 1440];
/* SlidePagination is not drawn below 768: that is the rule, not an escape. */

describe.skipIf(!hasBrowser && !process.env.CI)("the ported components with the longest strings", () => {
  for (const theme of ["dark", "light"]) {
    for (const width of WIDTHS) {
      it(`overflow nothing at ${width}px, ${theme}`, async () => {
        const { page, close } = await mountInBrowser({
          entry,
          css: PORTED_CSS,
          viewport: { width, height: 900 },
          init: `document.documentElement.setAttribute("data-theme", ${JSON.stringify(theme)});`,
        });
        try {
          /* Open the nav panel so its items are measured too. */
          await page.getByRole("button", { name: LONG }).first().waitFor({ state: "attached" });
          await page.locator(".nf-innernav__toggle").click();
          await page.waitForTimeout(1200);
          const problems = await page.evaluate(() => {
            const out: string[] = [];
            if (document.documentElement.scrollWidth > window.innerWidth + 1) out.push("page scrolls sideways");
            const roots = [
              ...document.querySelectorAll<HTMLElement>("[data-fit] > *, .nf-live, .nf-batch__surface, .nf-innernav__panel"),
            ];
            for (const root of roots) {
              const box = root.getBoundingClientRect();
              if (box.width === 0) continue;
              for (const el of root.querySelectorAll<HTMLElement>("*")) {
                if (el.closest(".sr-only") || el.classList.contains("sr-only")) continue;
                if (getComputedStyle(el).visibility === "hidden") continue;
                /* The fill is parked off to the side and clipped by the track. */
                if (el.classList.contains("nf-dtc__fill")) continue;
                /* The batch actions scroll sideways on purpose. */
                if (el.closest(".nf-batch__actions")) continue;
                const r = el.getBoundingClientRect();
                if (r.width === 0) continue;
                if (r.right > box.right + 1.5 || r.left < box.left - 1.5) {
                  out.push((root.className || root.tagName) + " > " + (el.className?.toString() || el.tagName) + " leaves its box [" + Math.round(r.left) + "," + Math.round(r.right) + " vs " + Math.round(box.left) + "," + Math.round(box.right) + "]");
                }
              }
            }
            return [...new Set(out)];
          });
          expect(problems).toEqual([]);
        } finally {
          await close();
        }
      });
    }
  }
});
