import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const session = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../locale", () => ({ getLocale: async () => "en" }));
vi.mock("../actions/session", () => ({
  resolveSession: () => session(),
  SIGNED_OUT_MESSAGE: "Sign in to continue.",
}));

import { revalidatePath } from "next/cache";
import { setEnquiryFollowup } from "./followup-actions";

const ID = "0b5d0c38-1d2e-4e6b-8f5e-5f1d1c2a9b10";
const signedIn = () => ({ state: "signed-in", supabase: { rpc }, user: { id: "u1" } });

function tomorrow(): string {
  return new Date(Date.now() + 86_400_000 + 3_600_000).toISOString().slice(0, 10);
}

beforeEach(() => {
  rpc.mockReset();
  session.mockReset();
  session.mockResolvedValue(signedIn());
  rpc.mockResolvedValue({ error: null });
  vi.mocked(revalidatePath).mockClear();
});

describe("setEnquiryFollowup", () => {
  it("sets a date and a trimmed note through the RPC, as the signed-in lister", async () => {
    const result = await setEnquiryFollowup({ conversationId: ID, dueOn: tomorrow(), note: "  ring about the lease " });
    expect(result).toEqual({ ok: true, data: { saved: true } });
    expect(rpc).toHaveBeenCalledWith("set_enquiry_followup", { p_conversation: ID, p_due: tomorrow(), p_note: "ring about the lease" });
    expect(revalidatePath).toHaveBeenCalledWith("/agent/messages");
    expect(revalidatePath).toHaveBeenCalledWith("/agent/dashboard");
  });

  it("clearing sends a null date and a null note, which the database stores without a DELETE", async () => {
    const result = await setEnquiryFollowup({ conversationId: ID, dueOn: null, note: "left over" });
    expect(result.ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith("set_enquiry_followup", { p_conversation: ID, p_due: null, p_note: null });
  });

  it("refuses a past date before it reaches the database", async () => {
    const result = await setEnquiryFollowup({ conversationId: ID, dueOn: "2020-01-01", note: null });
    expect(result).toMatchObject({ ok: false, error: "Pick today or a later day." });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("refuses a date more than a year ahead and a note over 200 characters", async () => {
    expect(await setEnquiryFollowup({ conversationId: ID, dueOn: "2099-01-01", note: null })).toMatchObject({
      ok: false,
      error: "A follow-up can be at most a year ahead.",
    });
    expect(await setEnquiryFollowup({ conversationId: ID, dueOn: tomorrow(), note: "a".repeat(201) })).toMatchObject({
      ok: false,
      error: "Keep the note to 200 characters.",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("refuses input that is not a follow-up at all", async () => {
    expect(await setEnquiryFollowup({ conversationId: "nope", dueOn: tomorrow() })).toMatchObject({ ok: false });
    expect(await setEnquiryFollowup(null)).toMatchObject({ ok: false });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("asks a signed-out visitor to sign in and calls nothing", async () => {
    session.mockResolvedValue({ state: "signed-out" });
    expect(await setEnquiryFollowup({ conversationId: ID, dueOn: tomorrow(), note: null })).toEqual({ ok: false, error: "Sign in to continue." });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("says in words when the database refuses: not your enquiry, out of range, or a failure", async () => {
    rpc.mockResolvedValueOnce({ error: { code: "42501", message: "not your enquiry" } });
    expect(await setEnquiryFollowup({ conversationId: ID, dueOn: tomorrow(), note: null })).toMatchObject({ error: "This enquiry is not yours." });
    rpc.mockResolvedValueOnce({ error: { code: "22023", message: "a follow-up date is from today to a year ahead" } });
    expect(await setEnquiryFollowup({ conversationId: ID, dueOn: tomorrow(), note: null })).toMatchObject({ error: "A follow-up can be at most a year ahead." });
    rpc.mockResolvedValueOnce({ error: { code: "08006" } });
    expect(await setEnquiryFollowup({ conversationId: ID, dueOn: tomorrow(), note: null })).toMatchObject({ error: "Nothing was saved. Try again." });
    rpc.mockRejectedValueOnce(new Error("network"));
    expect(await setEnquiryFollowup({ conversationId: ID, dueOn: tomorrow(), note: null })).toMatchObject({ error: "Nothing was saved. Try again." });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
