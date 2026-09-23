import { describe, expect, it } from "vitest";

import {
  controlState,
  deviceIsLive,
  failureMessage,
  isIosHomeScreenApp,
  LOCAL_DEVICE_KEY,
  readLocalDevice,
  refsKeyOf,
  writeLocalDevice,
  type EnrolFailureReason,
} from "./device-state";

/**
 * The blind light of 23 September: the control read on over zero rows in
 * `push_tokens`. These pin the rule that replaced it: on only with the
 * server's word for THIS device.
 */

const ENDPOINT = "https://web.push.apple.com/QAbc123";
const REF = "a1b2c3d4e5f6";

describe("deviceIsLive: the server's word for this device, or nothing", () => {
  const live = {
    permission: "granted" as const,
    local: { deviceRef: REF, endpoint: ENDPOINT },
    currentEndpoint: ENDPOINT,
    liveRefs: [REF],
  };

  it("is on when all four hold", () => {
    expect(deviceIsLive(live)).toBe(true);
  });

  it("permission granted alone is not on (the founder's state)", () => {
    expect(deviceIsLive({ ...live, local: null, liveRefs: [] })).toBe(false);
  });

  it("a local subscription alone is not on: the server holds no row", () => {
    expect(deviceIsLive({ ...live, liveRefs: [] })).toBe(false);
  });

  it("another device on the same account does not light this one", () => {
    expect(deviceIsLive({ ...live, liveRefs: ["ffffffffffff"] })).toBe(false);
  });

  it("no word from the page is a no, not a yes", () => {
    expect(deviceIsLive({ ...live, liveRefs: undefined })).toBe(false);
  });

  it("a browser that dropped or rotated the subscription is not on", () => {
    expect(deviceIsLive({ ...live, currentEndpoint: null })).toBe(false);
    expect(deviceIsLive({ ...live, currentEndpoint: `${ENDPOINT}-rotated` })).toBe(false);
  });

  it("a revoked permission is not on, whatever the row says", () => {
    expect(deviceIsLive({ ...live, permission: "denied" })).toBe(false);
    expect(deviceIsLive({ ...live, permission: "default" })).toBe(false);
  });

  it("native has no endpoint to compare and leans on the ref", () => {
    expect(deviceIsLive({ ...live, local: { deviceRef: REF, endpoint: null }, currentEndpoint: undefined })).toBe(true);
  });
});

describe("controlState: what the settings control draws", () => {
  const refs = ["000000000000"];
  const key = refsKeyOf(refs);

  it("allowed with nothing checked yet reads checking, never on", () => {
    expect(controlState({ allowed: true, refsKey: key, registeredRefs: refs, confirmed: null, verified: null })).toBe(
      "checking",
    );
  });

  it("allowed, checked, and not live reads off", () => {
    expect(
      controlState({ allowed: true, refsKey: key, registeredRefs: refs, confirmed: null, verified: { key, live: false } }),
    ).toBe("off");
  });

  it("a check made against an older list does not count", () => {
    expect(
      controlState({
        allowed: true,
        refsKey: key,
        registeredRefs: refs,
        confirmed: null,
        verified: { key: "older", live: true },
      }),
    ).toBe("checking");
  });

  it("register ok on this visit reads on until the list is refreshed", () => {
    expect(
      controlState({
        allowed: true,
        refsKey: key,
        registeredRefs: refs,
        confirmed: { ref: REF, listRefreshed: false },
        verified: { key, live: false },
      }),
    ).toBe("on");
  });

  it("after the refresh, the list decides: present is on, absent is off", () => {
    const withIt = [REF, ...refs];
    expect(
      controlState({
        allowed: true,
        refsKey: refsKeyOf(withIt),
        registeredRefs: withIt,
        confirmed: { ref: REF, listRefreshed: true },
        verified: null,
      }),
    ).toBe("on");
    /* The same contents as before the tap (an empty list both times) is
       still a refreshed list, and it does not hold the ref: off. This is the
       case a content key alone got wrong. */
    expect(
      controlState({
        allowed: true,
        refsKey: refsKeyOf([]),
        registeredRefs: [],
        confirmed: { ref: REF, listRefreshed: true },
        verified: { key: refsKeyOf([]), live: false },
      }),
    ).toBe("off");
  });

  it("not allowed is off, even with a confirmation", () => {
    expect(
      controlState({ allowed: false, refsKey: key, registeredRefs: refs, confirmed: { ref: REF, listRefreshed: false }, verified: { key, live: true } }),
    ).toBe("off");
  });
});

describe("failureMessage: no failure is silent", () => {
  const reasons: EnrolFailureReason[] = [
    "permission_denied",
    "unsupported",
    "not_configured",
    "signed_out",
    "not_saved",
    "failed",
  ];

  for (const reason of reasons) {
    for (const where of ["settings", "prompt"] as const) {
      it(`${reason} in ${where} says a plain sentence`, () => {
        const text = failureMessage(reason, { iosHomeScreenApp: false, where });
        expect(text.length).toBeGreaterThan(20);
        expect(text).not.toMatch(new RegExp("[\\u2013\\u2014!]"));
      });
    }
  }

  it("signed_out and not_configured are different faults with different words", () => {
    const signedOut = failureMessage("signed_out", { iosHomeScreenApp: false, where: "settings" });
    const notConfigured = failureMessage("not_configured", { iosHomeScreenApp: false, where: "settings" });
    expect(signedOut).not.toBe(notConfigured);
    expect(signedOut).toMatch(/sign in/i);
    expect(notConfigured).not.toMatch(/sign in/i);
    expect(notConfigured).toMatch(/Nothing for you to do/);
  });

  it("signed_out in the iPhone home screen app names the app's own sign-in", () => {
    const text = failureMessage("signed_out", { iosHomeScreenApp: true, where: "settings" });
    expect(text).toMatch(/^You're not signed in inside this app\. Sign in here, then turn notifications on\./);
    expect(text).toMatch(/separately from Safari/);
  });
});

describe("isIosHomeScreenApp", () => {
  const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15";
  it("iPhone standalone is the home screen app", () => {
    expect(isIosHomeScreenApp({ userAgent: iphone, navigatorStandalone: true })).toBe(true);
  });
  it("iPhone Safari tab is not", () => {
    expect(isIosHomeScreenApp({ userAgent: iphone, navigatorStandalone: false })).toBe(false);
  });
  it("an installed desktop app is not", () => {
    expect(
      isIosHomeScreenApp({ userAgent: "Mozilla/5.0 (X11; Linux x86_64) Chrome/140", displayModeStandalone: true }),
    ).toBe(false);
  });
});

describe("the local record", () => {
  function memoryStore(): Pick<Storage, "getItem" | "setItem" | "removeItem"> & { data: Map<string, string> } {
    const data = new Map<string, string>();
    return {
      data,
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => void data.set(k, v),
      removeItem: (k) => void data.delete(k),
    };
  }

  it("round trips and ignores junk", () => {
    const store = memoryStore();
    writeLocalDevice({ deviceRef: REF, endpoint: ENDPOINT }, store);
    expect(readLocalDevice(store)).toEqual({ deviceRef: REF, endpoint: ENDPOINT });
    store.data.set(LOCAL_DEVICE_KEY, "{not json");
    expect(readLocalDevice(store)).toBeNull();
    store.data.set(LOCAL_DEVICE_KEY, JSON.stringify({ deviceRef: "" }));
    expect(readLocalDevice(store)).toBeNull();
  });
});
