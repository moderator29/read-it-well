import { beforeEach, describe, expect, it, vi } from "vitest";

/* F-14 and F-15: the launch read and the silent re-register, with the shell
   and the plugin stood in. */
const state = vi.hoisted(() => ({
  receive: "granted" as string,
  registered: 0,
  posted: [] as unknown[],
  local: null as null | { deviceRef: string },
}));

vi.mock("@/lib/native/platform", () => ({ looksNative: () => true }));
vi.mock("./device-state", () => ({
  readLocalDevice: () => state.local,
  writeLocalDevice: () => undefined,
  clearLocalDevice: () => undefined,
  isIosHomeScreenApp: () => false,
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => true,
    getPlatform: () => "android",
    registerPlugin: () => ({
      checkPermissions: async () => ({ receive: state.receive }),
      requestPermissions: async () => {
        throw new Error("must never prompt");
      },
      register: async () => {
        state.registered += 1;
      },
      addListener: async (event: string, handler: (p: { value?: string }) => void) => {
        if (event === "registration") setTimeout(() => handler({ value: "fcm-token" }), 0);
        return { remove: async () => undefined };
      },
    }),
  },
}));

const { currentPermission, readNativePermission, refreshNativeRegistration } = await import("./enrol");

beforeEach(() => {
  state.receive = "granted";
  state.registered = 0;
  state.posted = [];
  state.local = { deviceRef: "abc123" };
  vi.stubGlobal("window", {});
  vi.stubGlobal("fetch", async (_url: string, init: { body: string }) => {
    state.posted.push(JSON.parse(init.body));
    return { ok: true, status: 200, json: async () => ({ ok: true, deviceRef: "abc123" }) };
  });
});

describe("the shell's launch push read (F-14, F-15)", () => {
  it("reads the real permission without asking, and remembers it", async () => {
    state.receive = "denied";
    expect(await readNativePermission()).toBe("denied");
    expect(currentPermission()).toBe("denied");
  });

  it("re-registers a device enrolled before, silently", async () => {
    expect(await refreshNativeRegistration()).toBe("refreshed");
    expect(state.registered).toBe(1);
    expect(state.posted[0]).toMatchObject({ platform: "android", token: "fcm-token" });
  });

  it("does nothing for a device never enrolled on this install", async () => {
    state.local = null;
    expect(await refreshNativeRegistration()).toBe("skipped");
    expect(state.registered).toBe(0);
  });

  it("does nothing when the permission is not granted", async () => {
    state.receive = "prompt";
    expect(await refreshNativeRegistration()).toBe("skipped");
    expect(state.registered).toBe(0);
  });
});
