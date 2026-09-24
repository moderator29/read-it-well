import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** UI-11: the Recent Transactions title keeps its air when there is no "See all". */
describe("the transactions head", () => {
  const css = readFileSync(join(process.cwd(), "src/app/css/wallet.css"), "utf8");
  it("tightens only when the 44px link is present", () => {
    expect(css).toMatch(/\.nf-tx-card__head \{\s*padding-top: 0\.875rem;/);
    expect(css).toMatch(/\.nf-tx-card__head:has\(\.nf-wallet-link\) \{\s*padding-top: 0\.125rem;/);
  });
});
