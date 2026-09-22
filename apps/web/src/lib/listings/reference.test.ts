import { describe, expect, it } from "vitest";
import {
  LISTING_REFERENCE_ALPHABET,
  asListingReference,
  isListingReference,
  readListingReference,
} from "./reference";

describe("the listing code alphabet", () => {
  it("holds thirty characters and none of the six that are misread", () => {
    expect(LISTING_REFERENCE_ALPHABET).toHaveLength(30);
    for (const banned of ["0", "1", "I", "L", "O", "U"]) {
      expect(LISTING_REFERENCE_ALPHABET).not.toContain(banned);
    }
  });
});

describe("reading a code somebody typed", () => {
  it("takes the code exactly as it is printed", () => {
    expect(asListingReference("VL-7K4MQP")).toBe("VL-7K4MQP");
  });

  it("takes it in lower case, spaced, or with the prefix dropped", () => {
    expect(asListingReference("vl 7k4mqp")).toBe("VL-7K4MQP");
    expect(asListingReference("7K4MQP")).toBe("VL-7K4MQP");
    expect(asListingReference("  vl-7k4mqp  ")).toBe("VL-7K4MQP");
  });

  /* The whole point of the short alphabet: a code carrying a character we
     never mint is somebody reading a real code badly, and saying so is more
     use than searching for the string. */
  it("refuses a character we never mint, and says that is what happened", () => {
    for (const bad of ["VL-1K4MQP", "VL-7K4MQ0", "VL-IK4MQP", "VL-LK4MQP", "VL-OK4MQP", "VL-UK4MQP"]) {
      expect(readListingReference(bad)).toEqual({ state: "impossible" });
      expect(asListingReference(bad)).toBeNull();
    }
  });

  it("leaves ordinary search text alone", () => {
    for (const text of ["Lekki", "3 bedroom flat", "", "VL-7K4MQ", "VL-7K4MQPX", "Ikoyi duplex"]) {
      expect(readListingReference(text)).toEqual({ state: "none" });
      expect(asListingReference(text)).toBeNull();
    }
  });

  /* A six letter place name would otherwise be read as a code. It IS read as
     a code, and that is correct: the lookup misses and the page falls through
     to ordinary results, which is the same answer either way. */
  it("reads a six character word as a code when every character is in the alphabet", () => {
    expect(asListingReference("BADGE2")).toBe("VL-BADGE2");
    // And not when one of them is not. "Lagos" carries an L and an O.
    expect(readListingReference("LAGOSX")).toEqual({ state: "impossible" });
  });
});

describe("recognising a stored code", () => {
  it("accepts only the full canonical form", () => {
    expect(isListingReference("VL-7K4MQP")).toBe(true);
    expect(isListingReference("7K4MQP")).toBe(false);
    expect(isListingReference("VL-7K4MQ")).toBe(false);
    expect(isListingReference("VL-7K4MQ0")).toBe(false);
    expect(isListingReference(null)).toBe(false);
    expect(isListingReference(undefined)).toBe(false);
  });
});
