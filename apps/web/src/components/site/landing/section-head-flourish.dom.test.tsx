/**
 * The warm spark's stroke on a section head (spec section 18): `flourish`
 * wraps the title's LAST word, and only that word, and a head without it
 * renders plain. The heading still reads as written.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SectionHead } from "./SectionHead";

describe("SectionHead flourish", () => {
  it("wraps the last word in the spark stroke", () => {
    const html = renderToStaticMarkup(<SectionHead id="h" title="Four steps, one record" flourish />);
    expect(html).toContain('Four steps, one <span class="nf-spark-flourish">record</span>');
    expect(html.match(/nf-spark-flourish/g)).toHaveLength(1);
  });

  it("wraps a one-word title whole", () => {
    const html = renderToStaticMarkup(<SectionHead id="h" title="Stays." flourish />);
    expect(html).toContain('<span class="nf-spark-flourish">Stays.</span>');
  });

  it("leaves a bracketed brand phrase alone and marks the plain tail", () => {
    const html = renderToStaticMarkup(<SectionHead id="h" title="Meet [[the agent]] today" flourish />);
    expect(html).toContain('<span class="nf-landing-hl">the agent</span>');
    expect(html).toContain('<span class="nf-spark-flourish">today</span>');
  });

  it("renders plain without the flag", () => {
    const html = renderToStaticMarkup(<SectionHead id="h" title="Four steps, one record" />);
    expect(html).not.toContain("nf-spark-flourish");
  });
});
