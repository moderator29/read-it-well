import { describe, expect, it } from "vitest";
import { hintFor } from "./form-keys";

describe("the return key", () => {
  it("says next until the last field of a form, which says done", () => {
    expect(hintFor({ search: false, inForm: true, hasNext: true })).toBe("next");
    expect(hintFor({ search: false, inForm: true, hasNext: false })).toBe("done");
  });
  it("says search in a search field, wherever it is", () => {
    expect(hintFor({ search: true, inForm: false, hasNext: false })).toBe("search");
  });
  it("leaves a field outside a form alone", () => {
    expect(hintFor({ search: false, inForm: false, hasNext: false })).toBeNull();
  });
});
