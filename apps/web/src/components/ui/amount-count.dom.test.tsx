import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { Amount, Figure } from "./Amount";

/* The founder's count-up ruling: a hero figure counts up in the browser, but
   the server (and a reader with scripts off) always gets the final figure. */
describe("Amount and Figure with count", () => {
  it("prints the final money figure on the server", () => {
    const html = renderToString(<Amount minorUnits={26_100_000_00} locale="en" count />);
    expect(html).toContain("26,100,000");
    expect(html).toContain("nf-m-count");
  });

  it("prints the final whole number on the server, and leaves text alone", () => {
    expect(renderToString(<Figure value={1204} locale="en" count />)).toContain("1,204");
    expect(renderToString(<Figure value="4.8" locale="en" count />)).toContain("4.8");
  });
});
