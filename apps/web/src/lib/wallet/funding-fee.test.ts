import { describe, expect, it } from "vitest";
import { processorFeeMetadata } from "./funding-fee";

describe("processorFeeMetadata (MON-14)", () => {
  it("carries the integer kobo the processor reported", () => {
    expect(processorFeeMetadata(25_100)).toEqual({ processor_fee_minor: 25_100 });
    expect(processorFeeMetadata(0)).toEqual({ processor_fee_minor: 0 });
  });

  it("records nothing it cannot trust as a fee", () => {
    for (const fees of [null, undefined, -1, 1.5, "100", Number.NaN]) {
      expect(processorFeeMetadata(fees)).toEqual({ processor_fee_minor: null });
    }
  });
});
