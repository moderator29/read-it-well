import { describe, expect, it } from "vitest";
import { parseStayDetails } from "./stay-details";

const LISTING = "0f8fad5b-d9cb-469f-a165-70867728950e";

describe("the trip page's place details (D75)", () => {
  it("reveals nothing before payment", () => {
    expect(parseStayDetails({ status: "unpaid" })).toEqual({ state: "unpaid" });
    expect(parseStayDetails({ status: "not_found" })).toEqual({ state: "not_found" });
    expect(parseStayDetails(null)).toEqual({ state: "unavailable" });
  });

  it("shapes a paid stay's address, way in and host", () => {
    const d = parseStayDetails({
      status: "ok",
      kind: "listing",
      place_name: "Lekki flat",
      address: "12 Admiralty Way",
      area: "Lekki",
      city: "Lagos",
      gate_directions: "Second gate",
      access_code: "4421",
      check_in_from: "14:00:00",
      host_name: "Ada",
      message_href: `/messages/new?listing=${LISTING}`,
    });
    expect(d).toMatchObject({
      state: "ready",
      address: "12 Admiralty Way",
      areaCity: "Lekki, Lagos",
      accessCode: "4421",
      checkInFrom: "14:00",
      hostName: "Ada",
    });
  });

  it("never follows a message link it did not expect", () => {
    expect(parseStayDetails({ status: "ok", message_href: "https://evil.example" })).toEqual({ state: "unavailable" });
  });
});
