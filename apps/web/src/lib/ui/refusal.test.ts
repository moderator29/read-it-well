import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { REFUSED_ATTRIBUTE, watchRefusals } from "./refusal";

const src = (path: string) => readFileSync(join(process.cwd(), "src", path), "utf8");
const strip = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "");

describe("the field's refusal is a transition, not a state (A8 SHOULD 3)", () => {
  it("the shake is keyed on data-refused, never on aria-invalid alone", () => {
    const css = strip(src("app/css/controls.css"));
    expect(css).toContain(".nf-field[data-refused]:not(.nf-auth .nf-field) {");
    expect(css).not.toMatch(/nf-field\[aria-invalid="true"\][^{]*\{\s*animation/);
  });

  it("the watcher marks only an attribute change to invalid, clears on end and on valid, and is mounted once with the details", () => {
    const code = strip(src("lib/ui/refusal.ts"));
    expect(code).toContain('attributeFilter: ["aria-invalid"]');
    expect(code).toContain("attributeOldValue: true");
    expect(code).toContain('record.oldValue === "true"');
    expect(code).toContain('event.animationName === "nf-field-refuse"');
    expect(strip(src("components/ui/DetailsHost.tsx"))).toContain("<RefusalHost />");
  });
});

/*
 * THE BATCH (A8 NIT): a submit that refuses many fields at once must cost ONE
 * style flush, not two per field. The DOM is a hand-made stand-in, since the
 * point is the ORDER and COUNT of the operations the watcher performs: every
 * marker off, one layout read, every marker on, then each field's animations.
 */
describe("a batch of refused fields is flushed once", () => {
  type Mutation = { target: FakeField; oldValue: string | null };
  const log: string[] = [];
  let callback: (records: Mutation[]) => void = () => {};

  class FakeField {
    attrs = new Map<string, string>();
    classList = { contains: (c: string) => c === "nf-field" };
    constructor(readonly name: string, invalid: boolean, readonly shakes = true) {
      if (invalid) this.attrs.set("aria-invalid", "true");
    }
    getAttribute(k: string) {
      return this.attrs.get(k) ?? null;
    }
    setAttribute(k: string, v: string) {
      this.attrs.set(k, v);
      if (k === REFUSED_ATTRIBUTE) log.push(`on:${this.name}`);
    }
    removeAttribute(k: string) {
      if (k === REFUSED_ATTRIBUTE && this.attrs.has(k)) log.push(`off:${this.name}`);
      this.attrs.delete(k);
    }
    get offsetWidth() {
      log.push(`flush:${this.name}`);
      return 0;
    }
    getAnimations() {
      log.push(`anims:${this.name}`);
      return this.shakes ? [{ animationName: "nf-field-refuse" }] : [];
    }
  }

  beforeEach(() => {
    log.length = 0;
    vi.stubGlobal("HTMLElement", FakeField);
    vi.stubGlobal(
      "MutationObserver",
      class {
        constructor(cb: (records: Mutation[]) => void) {
          callback = cb;
        }
        observe() {}
        disconnect() {}
      },
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  const start = () => watchRefusals({ body: {}, addEventListener() {}, removeEventListener() {} } as unknown as Document);
  const refused = (f: FakeField) => ({ target: f, oldValue: null });

  it("takes every marker off, flushes once, puts every marker on, then reads the animations", () => {
    start();
    const fields = ["a", "b", "c", "d"].map((n) => new FakeField(n, true));
    /* Two of them already carry a marker from an earlier refusal that is still shaking. */
    fields[0]!.attrs.set(REFUSED_ATTRIBUTE, "");
    fields[1]!.attrs.set(REFUSED_ATTRIBUTE, "");
    callback(fields.map(refused));
    expect(log.filter((l) => l.startsWith("flush"))).toHaveLength(1);
    const flushAt = log.findIndex((l) => l.startsWith("flush"));
    /* Everything before the flush is marker removal, everything after is setting then reading. */
    expect(log.slice(0, flushAt).every((l) => l.startsWith("off:"))).toBe(true);
    const after = log.slice(flushAt + 1);
    expect(after.slice(0, 4)).toEqual(["on:a", "on:b", "on:c", "on:d"]);
    expect(after.slice(4)).toEqual(["anims:a", "anims:b", "anims:c", "anims:d"]);
    /* Every field that shakes keeps its marker. */
    for (const f of fields) expect(f.attrs.has(REFUSED_ATTRIBUTE)).toBe(true);
  });

  it("behaves as it did per field: a field that does not shake (motion off) has the marker taken back, the others keep it", () => {
    start();
    const quiet = new FakeField("quiet", true, false);
    const loud = new FakeField("loud", true);
    callback([refused(quiet), refused(loud)]);
    expect(quiet.attrs.has(REFUSED_ATTRIBUTE)).toBe(false);
    expect(loud.attrs.has(REFUSED_ATTRIBUTE)).toBe(true);
  });

  it("ignores a field that was already invalid, clears one that became valid, and does no flush when nothing is new", () => {
    start();
    const was = new FakeField("was", true);
    const valid = new FakeField("valid", false);
    valid.attrs.set(REFUSED_ATTRIBUTE, "");
    callback([{ target: was, oldValue: "true" }, { target: valid, oldValue: "true" }]);
    expect(valid.attrs.has(REFUSED_ATTRIBUTE)).toBe(false);
    expect(was.attrs.has(REFUSED_ATTRIBUTE)).toBe(false);
    expect(log.some((l) => l.startsWith("flush") || l.startsWith("anims"))).toBe(false);
  });

  it("a field that appears in two records of one batch is flushed and marked once", () => {
    start();
    const f = new FakeField("f", true);
    callback([refused(f), refused(f)]);
    expect(log.filter((l) => l === "on:f")).toHaveLength(1);
    expect(log.filter((l) => l.startsWith("flush"))).toHaveLength(1);
  });
});
