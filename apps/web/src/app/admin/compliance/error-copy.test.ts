import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { COMPLIANCE_ERROR } from "./error-copy";

describe("the compliance error screen's words", () => {
  it("are the dictionary's own, so the boundary can skip the dictionary without drifting", () => {
    const desk = getDictionary("en").compliance.desk;
    expect(COMPLIANCE_ERROR).toEqual({
      unavailableTitle: desk.unavailableTitle,
      unavailableBody: desk.unavailableBody,
      tryAgain: desk.tryAgain,
    });
  });
});
