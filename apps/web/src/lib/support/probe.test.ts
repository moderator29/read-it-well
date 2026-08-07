import { describe, expect, it } from "vitest";
import { runSupportTool } from "@/lib/support/tools";

describe("probe", () => {
  it("imports", async () => {
    const out = await runSupportTool("nope", {}, { state: "signed-out" });
    expect(out.result).toBeTruthy();
  });
});
