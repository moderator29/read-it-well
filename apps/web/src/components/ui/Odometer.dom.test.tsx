import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { Odometer } from "./Odometer";
import { CountUp } from "@/components/motion/CountUp";

/*
 * The odometer never moves on mount: the server prints the figure, and a
 * first render rolls nothing. A caller that mounts it with a different
 * `from` (a confirmed change shown for a moment) gets one roll.
 */
describe("Odometer", () => {
  it("prints the figure, tabular, with no wheel on mount", () => {
    const html = renderToString(<Odometer value="₦1,250,000" />);
    expect(html).toContain("nf-odo");
    expect(html).toContain("nf-numeric");
    expect(html).not.toContain("nf-odo__wheel");
    expect(html).toContain('<span class="sr-only">₦1,250,000</span>');
  });

  it("rolls only the changed digits when mounted from another figure", () => {
    const html = renderToString(<Odometer from="₦1,250,000" value="₦1,260,000" />);
    expect(html.match(/nf-odo__wheel/g)?.length).toBe(1);
    expect(html).toContain('data-direction="up"');
  });

  it("is what a counted figure rests on, and the server gets the final number", () => {
    const html = renderToString(<CountUp value={1204} tag="en-NG" eager />);
    expect(html).toContain("1,204");
    expect(html).toContain("nf-odo");
  });
});
