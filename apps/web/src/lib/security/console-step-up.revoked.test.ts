import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * C14: a staff member whose keys were all revoked for the console (a lost
 * phone, cleared by a second super admin) is treated as holding no console
 * key, so the console offers to enrol a new one; a key still usable is asked
 * for as before. The revocation read itself is `listConsoleCredentialIds`.
 */

const state = vi.hoisted(() => ({ usable: [] as string[] | null }));

vi.mock("../actions/session", () => ({
  resolveSession: async () => ({
    state: "signed-in",
    user: { id: "u1", email: "ada@example.com", app_metadata: { provider: "email" } },
    supabase: {
      auth: {
        getSession: async () => ({
          data: {
            session: {
              access_token: `x.${Buffer.from(JSON.stringify({ session_id: "11111111-1111-4111-8111-111111111111" })).toString("base64url")}.y`,
            },
          },
        }),
      },
    },
  }),
}));
vi.mock("./rate-limit", () => ({ consume: async () => ({ allowed: true }), subjectForUser: (id: string) => id }));
vi.mock("../account-deletion/reauthenticate", () => ({ reauthMethodFor: () => "password" }));
vi.mock("./money-step-up", () => ({
  admin: () => ({}),
  ceremonyOrigin: async () => ({ origin: "https://www.vallospaces.com", rpId: "www.vallospaces.com" }),
  listConsoleCredentialIds: async () => state.usable,
  mintChallenge: async () => "challenge-xxxxxxxxxxxxxxxxxxxxxxxx",
  takeChallenge: async () => null,
}));

beforeEach(() => {
  state.usable = [];
});

describe("the console's key check (C14)", () => {
  it("offers enrolment when every key was revoked for the console", async () => {
    state.usable = [];
    const { beginConsoleStepUp } = await import("./console-step-up");
    expect(await beginConsoleStepUp()).toEqual({ state: "enrol", method: "password" });
  });

  it("asks for a key still usable for the console", async () => {
    state.usable = ["laptop"];
    const { beginConsoleStepUp } = await import("./console-step-up");
    const begun = await beginConsoleStepUp();
    expect(begun).toMatchObject({ state: "ready", credentialIds: ["laptop"] });
  });

  it("fails soft when the keys cannot be read", async () => {
    state.usable = null;
    const { beginConsoleStepUp } = await import("./console-step-up");
    expect(await beginConsoleStepUp()).toEqual({ state: "failed" });
  });
});
