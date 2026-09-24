import { describe, expect, it } from "vitest";
import { actionsAsData, actionsFor } from "./actions";

describe("actionsFor (V-53)", () => {
  it("gives a message a Reply that opens the thread", () => {
    expect(actionsFor("message", "/messages/abc")).toEqual([{ id: "reply", title: "Reply", href: "/messages/abc" }]);
  });
  it("gives an inspection request a button to the lister's inspections", () => {
    expect(actionsFor("listing", "/agent/inspections")[0]?.id).toBe("answer");
    expect(actionsFor("agent", "/agent/inspections")[0]?.title).toBe("Open inspections");
  });
  it("gives a booking a button to the booking", () => {
    expect(actionsFor("booking", "/bookings/77")[0]?.id).toBe("open-booking");
    expect(actionsFor("booking", "/trips")[0]?.id).toBe("open-booking");
    expect(actionsFor("booking", "/rent/pay/abc")).toEqual([]);
  });
  it("gives everything else nothing, and never an off-origin href", () => {
    expect(actionsFor("wallet", "/wallet")).toEqual([]);
    expect(actionsFor("message", "https://evil.example/messages/1")).toEqual([]);
    expect(actionsFor("message", "//evil.example/messages/1")).toEqual([]);
    expect(actionsFor("message", null)).toEqual([]);
  });
  it("serialises for FCM as a string", () => {
    expect(actionsAsData(undefined)).toBe("[]");
    expect(JSON.parse(actionsAsData(actionsFor("message", "/messages/a")))).toHaveLength(1);
  });
});
