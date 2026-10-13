import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LEAD_STEP_MS } from "./lead";

const css = readFileSync(join(process.cwd(), "src/app/css/feed-m.css"), "utf8");

/** The feed's motion sheet keeps the rules the motion system sets (MOTION_SYSTEM section 1 and 2). */
describe("feed-m.css", () => {
  it("loops nothing: only the aurora and the assistant's thinking may", () => {
    expect(css).not.toMatch(/animation[^;]*\binfinite\b/);
  });

  it("staggers by the same step the TypeScript says", () => {
    expect(css).toContain(`calc(var(--nf-i, 0) * ${LEAD_STEP_MS}ms)`);
  });

  it("pops the heart and the repost only on the tap that turns them on", () => {
    /* The like pops its whole capsule (D72, reference 2); the repost turns
       its glyph. Both keyed on `data-pop`, which only the tap sets. */
    expect(css).toContain(".nf-act-pill--like[data-pop] {");
    expect(css).toContain(".nf-act-pill--repost[data-pop] svg");
    /* An already-liked post must not throw its heart as the feed loads. */
    expect(css).not.toMatch(/\[aria-pressed="true"\]\s*svg\s*\{\s*animation/);
  });

  it("moves only transform and opacity (translate, scale, rotate count as transform)", () => {
    /* Each @keyframes block, found by brace depth so a nested frame is not cut short. */
    const bodies: string[] = [];
    for (const start of css.matchAll(/@keyframes\s+[\w-]+\s*\{/g)) {
      let depth = 1;
      let i = (start.index ?? 0) + start[0].length;
      const from = i;
      while (depth > 0 && i < css.length) {
        if (css[i] === "{") depth += 1;
        else if (css[i] === "}") depth -= 1;
        i += 1;
      }
      bodies.push(css.slice(from, i - 1));
    }
    expect(bodies.length).toBeGreaterThan(5);
    for (const body of bodies) {
      for (const decl of body.matchAll(/([a-z-]+)\s*:\s*[^;{}]+;/g)) {
        expect(["opacity", "translate", "scale", "rotate", "transform"]).toContain(decl[1]);
      }
    }
  });
});
