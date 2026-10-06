/**
 * EVERY BUTTON VARIANT AND CHIP BEHAVIOUR, MEASURED ON WHAT IS PAINTED
 * (Chromium, the product's tokens, the button system and the chip sheet).
 *
 * The method is `Button.danger.dom.test.tsx`'s. A computed `color` and a
 * computed `background-color` are not what a person sees: fills are gradients,
 * washes over the page, lit rims. So for each control, in each state, the test
 * hides the label (every child goes `visibility: hidden`), takes a screenshot
 * of the control, samples the painted fill on a grid inside the border (the
 * ellipse inscribed in the box, so a round control's corners are not scored), and
 * holds the label colour to the WORST of those pixels:
 *
 *   label    4.5:1, or 3:1 where it is large (24px, or 18.66px and 700 weight)
 *   boundary 3:1 where the control would otherwise have none: if the painted
 *            fill is under 3:1 against the page, the edge must be 3:1 against
 *            it (WCAG 1.4.11). A quiet or static control is a word, not an
 *            object, and owes no boundary.
 *
 * Every Button variant and every Chip behaviour, chosen and unchosen, in night
 * and paper, at rest, pointed at and pressed. DISABLED is exempt from WCAG, so
 * it is measured and recorded and never failed. Every ratio is written to the
 * file named by `CONTROL_CONTRAST_REPORT` when set, so a run can be read, not
 * only passed.
 */
import { writeFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Page } from "playwright-core";
import {
  BROWSER_TEST_TIMEOUT,
  closeBrowser,
  hasBrowser,
  mountInBrowser,
  warmBrowser,
} from "@/lib/testing/mount-in-browser";
import { productCss } from "@/lib/testing/product-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT * 4 });
beforeAll(warmBrowser);
afterAll(closeBrowser);

/* Tailwind is not in this harness; the segmented track's own utilities (a positioned track the capsule is placed in,
   items that sit in a row) are given here as the plain CSS they are, so the capsule lands behind the chosen item.
   They sit in a layer BELOW the product's `components` layer: an unlayered shim would beat the product's selected
   colour and the label would be measured in the wrong ink. */
const CSS = `@layer base, components;
  ${productCss("app/css/chips.css")}
  @layer base {
    .nf-segmented { position: relative; display: inline-flex; padding: 4px; }
    .nf-segmented__item { position: relative; z-index: 1; display: inline-flex; align-items: center; justify-content: center; min-height: 36px; padding: 0 16px; border: 0; background: transparent; color: inherit; font: inherit; }
  }`;

/*
 * THE BOUNDARY FINDINGS, RECORDED, NOT HIDDEN. These are the controls whose
 * ONLY boundary is a hairline or a wash measured under 3:1 against the page:
 * the glass secondary and the quiet danger button at rest, every unchosen chip,
 * the icon button at rest, and the primary's pressed (darker) fill beside the
 * night page. Each carries its label as text, so none is unidentifiable, but
 * WCAG 1.4.11 asks for 3:1 where the edge is what marks the object. Raising
 * them means a stronger edge on every glass control and chip in the product,
 * which changes the look the founder approved (D28), so they are listed for a
 * decision rather than fixed here. The test holds the list exactly: a NEW
 * boundary failure fails, and one that gets fixed fails until it is removed.
 * The value is the measured ratios (the painted fill, then the strongest edge
 * pixel, each against the page), and the run is held to them BOTH WAYS, not by
 * key alone (auditor A8, NIT): a recorded boundary that gets worse than its
 * ratio (beyond the 0.05 of anti-aliasing noise) fails, so "known" never
 * quietly becomes "worse"; and one that moves up by more than the noise fails
 * until its new ratio is written here, so the list always says what the page
 * paints today. The run of 6 October measured every entry within 0.005 of it.
 */
const KNOWN_BOUNDARY: Record<string, { fill: number; edge: number }> = {
  "dark | button primary | press": { fill: 1.44, edge: 2.71 },
  "dark | button secondary | rest": { fill: 1.16, edge: 2.88 },
  "dark | button glass | rest": { fill: 1.16, edge: 2.88 },
  "dark | button dangerQuiet | rest": { fill: 1.09, edge: 1.71 },
  "dark | button dangerQuiet | hover": { fill: 1.11, edge: 1.74 },
  "dark | button dangerQuiet | press": { fill: 1.18, edge: 1.71 },
  "dark | button icon | rest": { fill: 1.16, edge: 1.43 },
  "dark | button icon | press": { fill: 1.44, edge: 1.96 },
  "dark | button primary lg glow | press": { fill: 1.43, edge: 2.71 },
  "dark | chip filter unchosen | rest": { fill: 1.11, edge: 1.33 },
  "dark | chip filter unchosen | hover": { fill: 1.11, edge: 1.31 },
  "dark | chip filter unchosen | press": { fill: 1.11, edge: 1.31 },
  "dark | chip choice unchosen | rest": { fill: 1.11, edge: 1.33 },
  "dark | chip choice unchosen | hover": { fill: 1.11, edge: 1.31 },
  "dark | chip choice unchosen | press": { fill: 1.11, edge: 1.31 },
  "dark | chip link other | rest": { fill: 1.11, edge: 1.33 },
  "dark | chip link other | hover": { fill: 1.11, edge: 1.31 },
  "dark | chip link other | press": { fill: 1.11, edge: 1.31 },
  "light | button secondary | press": { fill: 1.15, edge: 1.32 },
  "light | button glass | press": { fill: 1.15, edge: 1.32 },
  "light | button dangerQuiet | rest": { fill: 1.17, edge: 2.08 },
  "light | button dangerQuiet | hover": { fill: 1.32, edge: 2.26 },
  "light | button dangerQuiet | press": { fill: 1.46, edge: 2.22 },
  "light | button icon | rest": { fill: 1.10, edge: 1.10 },
  "light | chip filter unchosen | rest": { fill: 1.10, edge: 1.10 },
  "light | chip filter unchosen | hover": { fill: 1.10, edge: 1.10 },
  "light | chip filter unchosen | press": { fill: 1.10, edge: 1.10 },
  "light | chip choice unchosen | rest": { fill: 1.10, edge: 1.10 },
  "light | chip choice unchosen | hover": { fill: 1.10, edge: 1.10 },
  "light | chip choice unchosen | press": { fill: 1.10, edge: 1.10 },
  "light | chip link other | rest": { fill: 1.10, edge: 1.10 },
  "light | chip link other | hover": { fill: 1.10, edge: 1.10 },
  "light | chip link other | press": { fill: 1.10, edge: 1.10 },
};

/* Each case: an id, the JSX, whether it is interactive, and whether it owes a boundary. */
type Case = { id: string; jsx: string; interactive: boolean; boundary: boolean; kind: "button" | "chip" | "segment"; target?: string };

const BUTTON_VARIANTS = ["primary", "secondary", "glass", "quiet", "ghost", "danger", "dangerQuiet"] as const;

const CASES: Case[] = [
  ...BUTTON_VARIANTS.map<Case>((v) => ({
    id: `button ${v}`,
    jsx: `<Button variant="${v}">Label text</Button>`,
    interactive: true,
    boundary: !["quiet", "ghost"].includes(v),
    kind: "button",
  })),
  { id: "button icon", jsx: `<Button variant="icon" aria-label="Close" leadingIcon="close" />`, interactive: true, boundary: true, kind: "button" },
  { id: "button primary lg glow", jsx: `<Button variant="primary" size="lg" glow>Label text</Button>`, interactive: true, boundary: true, kind: "button" },
  ...(["filter", "choice"] as const).flatMap<Case>((b) =>
    [false, true].map<Case>((on) => ({
      id: `chip ${b} ${on ? "chosen" : "unchosen"}`,
      jsx: `<Chip behaviour="${b}" selected={${on}} icon="search">Label text</Chip>`,
      interactive: true,
      boundary: true,
      kind: "chip",
    })),
  ),
  ...[false, true].map<Case>((on) => ({
    id: `chip link ${on ? "current" : "other"}`,
    jsx: `<Chip behaviour="link" href="#" selected={${on}} chevron>Label text</Chip>`,
    interactive: true,
    boundary: true,
    kind: "chip",
  })),
  { id: "chip static", jsx: `<Chip behaviour="static" size="sm">Label text</Chip>`, interactive: false, boundary: false, kind: "chip" },
  /* THE SELECTED SEGMENT paints the same brand ramp as the primary (`--nf-act-fill`): the capsule behind the
     chosen item, with its label in white. Held to the same 4.5:1, so the primary and the segment cannot drift. */
  ...(["control", "pill"] as const).map<Case>((shape) => ({
    id: `segmented ${shape} selected`,
    jsx: `<Segmented label="View" value="a" onChange={() => {}} variant="solid" shape="${shape}" options={[{ value: "a", label: "Label text" }, { value: "b", label: "Other" }]} />`,
    interactive: true,
    boundary: false,
    kind: "segment",
    target: '[aria-selected="true"]',
  })),
];

/** The element a case is judged on: its first child, or the part of it named by `target`. */
const targetOf = (page: Page, id: string) => {
  const base = id.replace(/ disabled$/, "");
  const c = CASES.find((x) => x.id === base);
  return page.locator(`[data-case="${id}"] ${c?.target ?? "> *"}`).first();
};

const entry = `
  import { mount } from "@/lib/testing/browser-root";
  import { Button } from "@/components/ui/Button";
  import { Chip } from "@/components/ui/Chip";
  import { Segmented } from "@/components/ui/Segmented";
  const cases = [${CASES.map((c) => `{ id: ${JSON.stringify(c.id)}, node: ${c.jsx} }`).join(",\n")}];
  mount(
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, padding: 24, background: "var(--nf-surface-canvas)" }}>
      {cases.map((c) => (
        <div key={c.id} data-case={c.id} data-wrap="active">{c.node}</div>
      ))}
      {cases.map((c) => (
        <div key={"off " + c.id} data-case={c.id + " disabled"} data-wrap="disabled" style={{ opacity: 1 }}>
          {c.node}
        </div>
      ))}
    </div>,
  );
`;

type Measure = { label: number; fillVsGround: number; edgeVsGround: number; fontPx: number; weight: number };
type Row = { theme: string; id: string; state: string } & Measure & { failures: string[] };

/** Measures the control inside the wrapper whose data-case is `id`: the label against the painted fill, and the boundary. */
async function measure(page: Page, id: string): Promise<Measure> {
  const target = targetOf(page, id);
  const info = await target.evaluate((el) => {
    const style = getComputedStyle(el);
    return { label: style.color, fontPx: Number.parseFloat(style.fontSize), weight: Number.parseInt(style.fontWeight, 10) || 400 };
  });
  /* Hide every child (label, glyph, chevron) so only the fill and the edge are painted. */
  await target.evaluate((el) => {
    for (const child of Array.from(el.children)) (child as HTMLElement).style.visibility = "hidden";
    /* ... and any words that are a bare text node, which `visibility` on a child cannot reach. The text
       fill, not `color`: buttons transition `color`, so changing it would be photographed mid-fade. */
    (el as HTMLElement).style.setProperty("-webkit-text-fill-color", "transparent");
  });
  const png = (await target.screenshot()).toString("base64");
  await target.evaluate((el) => {
    for (const child of Array.from(el.children)) (child as HTMLElement).style.visibility = "";
    (el as HTMLElement).style.removeProperty("-webkit-text-fill-color");
  });
  return page.evaluate(
    async ({ png, info }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${png}`;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const c = canvas.getContext("2d", { willReadFrequently: true })!;
      c.drawImage(img, 0, 0);
      const parse = (value: string) => {
        const probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
        probe.fillStyle = "black";
        probe.fillStyle = value;
        probe.fillRect(0, 0, 1, 1);
        const d = probe.getImageData(0, 0, 1, 1).data;
        return [d[0]!, d[1]!, d[2]!, d[3]! / 255];
      };
      const lum = (r: number, g: number, b: number) => {
        const f = (v: number) => {
          const x = v / 255;
          return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      const ground = parse(getComputedStyle(document.body).backgroundColor);
      const groundL = lum(ground[0]!, ground[1]!, ground[2]!);
      const ink = parse(info.label);
      /* The label sits on the fill; a translucent label is composited over it per pixel. */
      let worstLabel = Infinity;
      let worstFill = Infinity;
      /* Only pixels the control paints: the ellipse inscribed in its box, a few
         pixels in from the border. The corners of a round or rounded control
         are the page showing through, and scoring them would measure the
         page against itself. A vertical gradient is fully covered, because
         its lightest and darkest rows cross the middle of the ellipse. */
      const inset = 3;
      const cx = img.width / 2;
      const cy = img.height / 2;
      const rx = img.width / 2 - inset;
      const ry = img.height / 2 - inset;
      for (let x = inset; x < img.width - inset; x += 2) {
        for (let y = inset; y < img.height - inset; y += 2) {
          if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 1) continue;
          const p = c.getImageData(x, y, 1, 1).data;
          const fl = lum(p[0]!, p[1]!, p[2]!);
          const a = ink[3]!;
          const over = [0, 1, 2].map((i) => ink[i]! * a + p[i]! * (1 - a));
          worstLabel = Math.min(worstLabel, ratio(lum(over[0]!, over[1]!, over[2]!), fl));
          worstFill = Math.min(worstFill, ratio(fl, groundL));
        }
      }
      /* The edge: the strongest pixel in the three outermost columns and rows
         through the middle, because a box at a fractional position anti-aliases
         a hairline across two pixels and any one of them can be the pale one. */
      let edgeBest = 0;
      for (let k = 0; k < 3; k += 1) {
        const probes = [
          c.getImageData(k, Math.floor(img.height / 2), 1, 1).data,
          c.getImageData(img.width - 1 - k, Math.floor(img.height / 2), 1, 1).data,
          c.getImageData(Math.floor(img.width / 2), k, 1, 1).data,
          c.getImageData(Math.floor(img.width / 2), img.height - 1 - k, 1, 1).data,
        ];
        for (const e of probes) edgeBest = Math.max(edgeBest, ratio(lum(e[0]!, e[1]!, e[2]!), groundL));
      }
      return {
        label: worstLabel,
        fillVsGround: worstFill,
        edgeVsGround: edgeBest,
        fontPx: info.fontPx,
        weight: info.weight,
      };
    },
    { png, info },
  );
}

const settle = (page: Page, id: string) =>
  targetOf(page, id).evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished.catch(() => undefined))).then(() => undefined));

function judge(m: Measure, boundary: boolean): string[] {
  const large = m.fontPx >= 24 || (m.fontPx >= 18.66 && m.weight >= 700);
  const need = large ? 3 : 4.5;
  const failures: string[] = [];
  if (m.label < need) failures.push(`label ${m.label.toFixed(2)}:1 < ${need}`);
  if (boundary && m.fillVsGround < 3 && m.edgeVsGround < 3) {
    failures.push(`boundary: fill ${m.fillVsGround.toFixed(2)}:1 and edge ${m.edgeVsGround.toFixed(2)}:1 against the page, both < 3`);
  }
  return failures;
}

describe.skipIf(!hasBrowser && !process.env.CI)("control contrast, measured on the paint", () => {
  it("every Button variant and Chip behaviour clears the label and boundary floors in both themes and states", async () => {
    const rows: Row[] = [];
    for (const theme of ["dark", "light"]) {
      const { page, close } = await mountInBrowser({ entry, css: CSS });
      try {
        await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
        for (const c of CASES) {
          const record = async (id: string, state: string, enforce: boolean, boundary: boolean) => {
            const m = await measure(page, id);
            const failures = enforce ? judge(m, boundary) : [];
            rows.push({ theme, id: c.id, state, ...m, failures });
          };
          /* Rest means nothing is pointing at it and nothing is still easing back. */
          await page.mouse.move(0, 0);
          await settle(page, c.id);
          await record(c.id, "rest", true, c.boundary);
          if (c.interactive) {
            const loc = targetOf(page, c.id);
            await loc.hover();
            await settle(page, c.id);
            await record(c.id, "hover", true, c.boundary);
            await page.mouse.down();
            await settle(page, c.id);
            await record(c.id, "press", true, c.boundary);
            await page.mouse.move(0, 0);
            await page.mouse.up();
            await settle(page, c.id);
          }
        }
        /* Disabled, recorded and never failed (WCAG exempts it). */
        await page.evaluate(() => {
          for (const wrap of Array.from(document.querySelectorAll('[data-wrap="disabled"]'))) {
            const el = wrap.firstElementChild as HTMLElement;
            if (el.tagName === "BUTTON") (el as HTMLButtonElement).disabled = true;
            else el.setAttribute("aria-disabled", "true");
          }
        });
        for (const c of CASES.filter((x) => x.interactive && !x.target)) {
          const m = await measure(page, `${c.id} disabled`);
          rows.push({ theme, id: c.id, state: "disabled", ...m, failures: [] });
        }
      } finally {
        await close();
      }
    }
    if (process.env.CONTROL_CONTRAST_REPORT) writeFileSync(process.env.CONTROL_CONTRAST_REPORT, JSON.stringify(rows, null, 1));
    const labelFailures = rows
      .filter((row) => row.failures.some((f) => f.startsWith("label")))
      .map((row) => `${row.theme} | ${row.id} | ${row.state} | ${row.failures.filter((f) => f.startsWith("label")).join("; ")}`);
    expect(labelFailures, `${labelFailures.length} label failures`).toEqual([]);

    const boundary = rows
      .filter((row) => row.failures.some((f) => f.startsWith("boundary")))
      .map((row) => `${row.theme} | ${row.id} | ${row.state}`)
      .sort();
    const known = Object.keys(KNOWN_BOUNDARY).sort();
    expect(
      boundary.filter((key) => !known.includes(key)),
      "a new boundary failure (record it in KNOWN_BOUNDARY with its ratios, or fix it)",
    ).toEqual([]);
    expect(
      known.filter((key) => !boundary.includes(key)),
      "a recorded boundary failure now passes (remove it from KNOWN_BOUNDARY)",
    ).toEqual([]);

    /* THE FLOORS. Still failing is allowed; getting worse is not. A tenth of a ratio point is far more than the
       anti-aliasing noise of one edge pixel (0.05), and far less than any change of token. */
    const NOISE = 0.05;
    const worse = rows
      .filter((row) => row.failures.some((f) => f.startsWith("boundary")))
      .flatMap((row) => {
        const key = `${row.theme} | ${row.id} | ${row.state}`;
        const floor = KNOWN_BOUNDARY[key];
        if (!floor) return [];
        const out: string[] = [];
        if (row.fillVsGround < floor.fill - NOISE) out.push(`fill ${row.fillVsGround.toFixed(2)}:1 < ${floor.fill}:1`);
        if (row.edgeVsGround < floor.edge - NOISE) out.push(`edge ${row.edgeVsGround.toFixed(2)}:1 < ${floor.edge}:1`);
        return out.length ? [`${key}: ${out.join("; ")}`] : [];
      });
    expect(worse, "a recorded boundary got worse than the ratio recorded for it").toEqual([]);

    /* ...AND THE RECORD IS A MEASUREMENT, NOT ONLY A FLOOR: a ratio that moved up by more than the noise is written
       down again, so an improvement is seen and KNOWN_BOUNDARY never drifts away from the paint. */
    const moved = rows
      .filter((row) => row.failures.some((f) => f.startsWith("boundary")))
      .flatMap((row) => {
        const key = `${row.theme} | ${row.id} | ${row.state}`;
        const floor = KNOWN_BOUNDARY[key];
        if (!floor) return [];
        const out: string[] = [];
        if (row.fillVsGround > floor.fill + NOISE) out.push(`fill ${row.fillVsGround.toFixed(2)}:1 > ${floor.fill}:1`);
        if (row.edgeVsGround > floor.edge + NOISE) out.push(`edge ${row.edgeVsGround.toFixed(2)}:1 > ${floor.edge}:1`);
        return out.length ? [`${key}: ${out.join("; ")}`] : [];
      });
    expect(moved, "a recorded boundary improved: write its measured ratio into KNOWN_BOUNDARY").toEqual([]);

    /* THE SELECTED SEGMENT AND THE PRIMARY BUTTON ARE ONE FILL (`--nf-act-fill`). Their painted label ratio and
       painted fill, at rest, must agree in both themes, so a segment-only gradient cannot creep back in. */
    for (const theme of ["dark", "light"]) {
      const primary = rows.find((r) => r.theme === theme && r.id === "button primary" && r.state === "rest")!;
      for (const shape of ["control", "pill"]) {
        const seg = rows.find((r) => r.theme === theme && r.id === `segmented ${shape} selected` && r.state === "rest")!;
        expect(Math.abs(seg.label - primary.label), `${theme} ${shape} segment label vs primary`).toBeLessThan(0.1);
        expect(Math.abs(seg.fillVsGround - primary.fillVsGround), `${theme} ${shape} segment fill vs primary`).toBeLessThan(0.15);
      }
    }
  });
});
