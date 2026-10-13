import { beforeEach, describe, expect, it } from "vitest";
import type { CallSnapshot } from "@/lib/calls/types";
import {
  callState,
  confirmResume,
  dismissCall,
  mergeSnapshot,
  registerContext,
  resetCallStore,
  setAnsweredWith,
  showCall,
  showGone,
} from "./call-store";

const snap = (over: Partial<CallSnapshot> = {}): CallSnapshot => ({
  id: "c1",
  kind: "VIDEO",
  purpose: "CONVERSATION",
  state: "RINGING",
  version: 2,
  conversationId: "conv-1",
  reviewId: null,
  role: "CALLEE",
  myState: "RINGING",
  isInitiator: false,
  otherName: "Ada",
  otherState: "JOINED",
  scheduledFor: null,
  createdAt: "2026-10-08T12:00:00.000Z",
  ringingAt: null,
  ringExpiresAt: null,
  acceptedAt: null,
  connectedAt: null,
  interruptedAt: null,
  endedAt: null,
  endReason: null,
  durationSeconds: null,
  serverNow: new Date().toISOString(),
  ...over,
});

describe("the one call on this device", () => {
  beforeEach(() => resetCallStore());

  it("opens a call and carries the thread's context line", () => {
    const undo = registerContext("conv-1", { line: "2 bedroom flat" });
    expect(showCall(snap())).toBe(true);
    expect(callState().active?.context.line).toBe("2 bedroom flat");
    undo();
    expect(callState().contexts["conv-1"]).toBeUndefined();
  });

  it("refuses a second live call while one is open", () => {
    showCall(snap());
    expect(showCall(snap({ id: "c2" }))).toBe(false);
    expect(callState().active?.snapshot.id).toBe("c1");
  });

  it("merges newer snapshots and never revives a finished call", () => {
    showCall(snap());
    mergeSnapshot(snap({ state: "ACCEPTED", version: 3 }));
    expect(callState().active?.snapshot.state).toBe("ACCEPTED");
    mergeSnapshot(snap({ state: "RINGING", version: 2 }));
    expect(callState().active?.snapshot.state).toBe("ACCEPTED");
    mergeSnapshot(snap({ state: "ENDED", version: 5 }));
    mergeSnapshot(snap({ state: "ACTIVE", version: 6 }));
    expect(callState().active?.snapshot.state).toBe("ENDED");
    mergeSnapshot(snap({ id: "other", state: "ACTIVE", version: 9 }));
    expect(callState().active?.snapshot.id).toBe("c1");
  });

  it("keeps the server clock offset from each snapshot", () => {
    const ahead = new Date(Date.now() + 120_000).toISOString();
    showCall(snap({ serverNow: ahead }));
    expect(Math.round((callState().active?.offsetMs ?? 0) / 1000)).toBe(120);
  });

  it("remembers how the callee answered, and asks for a tap before a resumed call's media", () => {
    showCall(snap({ state: "ACTIVE" }), { resume: true });
    expect(callState().active?.resume).toBe(true);
    confirmResume();
    expect(callState().active?.resume).toBe(false);
    setAnsweredWith("AUDIO");
    expect(callState().active?.answeredWith).toBe("AUDIO");
  });

  it("shows the calm gone screen, and a finished call can be replaced", () => {
    showCall(snap({ state: "MISSED" }), { recovery: "ended" });
    showGone();
    expect(callState().gone).toBe(true);
    expect(callState().active).toBeNull();
    dismissCall();
    expect(callState().gone).toBe(false);
    showCall(snap({ state: "ENDED" }));
    expect(showCall(snap({ id: "c2" }))).toBe(true);
  });
});
