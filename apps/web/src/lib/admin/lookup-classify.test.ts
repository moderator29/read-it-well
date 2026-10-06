import { describe, expect, it } from "vitest";
import { classifyLookup, isIdentifier } from "./lookup-classify";

describe("the console lookup box (C6)", () => {
  it("knows each identifier a phone call brings", () => {
    expect(classifyLookup(" val-sup-0042 ")).toEqual({ kind: "ticket", value: "VAL-SUP-0042" });
    expect(classifyLookup("3F9A1C2E-77b0-4d11-8a2b-0123456789ab").kind).toBe("uuid");
    expect(classifyLookup("Ada@Example.com")).toEqual({ kind: "email", value: "ada@example.com" });
    expect(classifyLookup("lst-3f9a1c").kind).toBe("listing");
    expect(classifyLookup(" vl-7k4mqp ")).toEqual({ kind: "listing", value: "VL-7K4MQP" });
    expect(classifyLookup("3f9a1c2e").kind).toBe("error");
    expect(classifyLookup("C-ABC234").kind).toBe("error");
    expect(classifyLookup("T123456789012345").kind).toBe("payment");
  });
  it("knows the VA- code an agent prints on adverts (A9), however it is read out", () => {
    expect(classifyLookup("VA-7KMNP")).toEqual({ kind: "agent", value: "VA-7KMNP" });
    expect(classifyLookup("  va-7kmnp  ")).toEqual({ kind: "agent", value: "VA-7KMNP" });
    expect(classifyLookup("va 7kmnp")).toEqual({ kind: "agent", value: "VA-7KMNP" });
    expect(classifyLookup("VA7KMNP")).toEqual({ kind: "agent", value: "VA-7KMNP" });
    expect(isIdentifier("Va-3479a")).toBe(true);
    /* Not the minted alphabet (no B, G, I, L, O, Q, S, Z, 0, 1, 2, 5, 6, 8), or not five: not a code. */
    expect(classifyLookup("VA-7KMNB").kind).not.toBe("agent");
    expect(classifyLookup("VA-7KMN").kind).not.toBe("agent");
    expect(classifyLookup("VA-7KMNPX").kind).not.toBe("agent");
    /* A listing code is still a listing code. */
    expect(classifyLookup("VL-7K4MQP").kind).toBe("listing");
  });
  it("leaves ordinary words to the desk's own search", () => {
    expect(classifyLookup("grand vista").kind).toBe("text");
    expect(isIdentifier("Lekki")).toBe(false);
    expect(isIdentifier("VAL-SUP-7")).toBe(true);
  });
});
