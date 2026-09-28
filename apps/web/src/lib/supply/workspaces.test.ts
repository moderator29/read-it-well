import { describe, expect, it } from "vitest";
import {
  kindFromAgentType,
  makeWorkspace,
  needsFlip,
  orderWorkspaces,
  resolveCurrent,
  standingFromStatus,
  standingLabel,
  triggerBehaviour,
  type Workspace,
} from "./workspaces";
import { WORKSPACE_STANDINGS } from "./roles";

const ws = (over: Partial<Workspace> & Pick<Workspace, "key">): Workspace => ({
  kind: "owner",
  name: "A workspace",
  standing: "active",
  side: "property",
  href: "/agent/dashboard",
  ...over,
});

describe("what the database can say today", () => {
  /*
   * `agents.role` does not exist yet, so the person axis is still
   * `agents.type`, which has never meant owner or agent. The mapping lives in
   * one function so the day the column lands there is one line to change.
   */
  it("reads an individual as an owner and a business as an agent, for now", () => {
    expect(kindFromAgentType("individual")).toBe("owner");
    expect(kindFromAgentType("business")).toBe("agent");
  });

  it("maps every application status onto a standing the sheet can draw", () => {
    expect(standingFromStatus("APPROVED")).toBe("active");
    expect(standingFromStatus("DRAFT")).toBe("draft");
    expect(standingFromStatus("SUBMITTED")).toBe("pending");
    expect(standingFromStatus("UNDER_REVIEW")).toBe("pending");
    expect(standingFromStatus("REJECTED")).toBe("refused");
    expect(standingFromStatus("SUSPENDED")).toBe("suspended");
  });

  /* From the person's side "we need more from you" and "no" are the same act:
     open it and read what is missing. A sixth label would be a distinction
     only a reviewer cares about. */
  it("reads MORE_INFO_REQUIRED as refused rather than inventing a sixth state", () => {
    expect(standingFromStatus("MORE_INFO_REQUIRED")).toBe("refused");
  });

  it("never silently calls an unknown status normal", () => {
    expect(standingFromStatus("SOMETHING_NEW")).not.toBe("active");
  });

  it("produces a standing this product has copy for, whatever it is handed", () => {
    for (const s of ["APPROVED", "DRAFT", "SUBMITTED", "REJECTED", "SUSPENDED", "?"]) {
      expect(WORKSPACE_STANDINGS).toContain(standingFromStatus(s));
    }
  });
});

describe("where a workspace opens", () => {
  /*
   * A person who has been stopped and cannot find out why is the exact
   * failure the suspension design exists to prevent, so the destination is a
   * function of the STANDING and not only of the kind.
   */
  it("sends a refused or suspended workspace to the screen that carries the reason", () => {
    expect(makeWorkspace({ kind: "agent", id: "a", name: "n", standing: "refused" }).href).toBe(
      "/agent/verification",
    );
    expect(makeWorkspace({ kind: "owner", id: "a", name: "n", standing: "suspended" }).href).toBe(
      "/agent/verification",
    );
  });

  it("sends a refused or suspended host to its own business standing, never the agent pitch", () => {
    for (const standing of ["refused", "suspended"] as const) {
      expect(makeWorkspace({ kind: "host", id: "b", name: "n", standing }).href).toBe("/host");
    }
  });

  it("sends a pending workspace to its own desk, which carries the standing banner", () => {
    expect(makeWorkspace({ kind: "owner", id: "a", name: "n", standing: "pending" }).href).toBe(
      "/agent/dashboard",
    );
  });

  it("sends a stays workspace to the stays side", () => {
    const w = makeWorkspace({ kind: "host", id: "b", name: "n", standing: "active" });
    expect(w.href).toBe("/host");
    expect(w.side).toBe("stays");
    expect(w.key).toBe("stays:b");
  });

  it("spells the key by kind, so the cookie cannot be written two ways", () => {
    expect(makeWorkspace({ kind: "owner", id: "1", name: "n", standing: "active" }).key).toBe("supply:1");
    expect(makeWorkspace({ kind: "agent", id: "1", name: "n", standing: "active" }).key).toBe("supply:1");
    expect(makeWorkspace({ kind: "firm", id: "1", name: "n", standing: "active" }).key).toBe("firm:1");
    expect(makeWorkspace({ kind: "console", id: "x", name: "n", standing: "active" }).key).toBe("admin");
  });

  it("opens a firm on its own desk, and a stopped one on its reason", () => {
    expect(makeWorkspace({ kind: "firm", id: "1", name: "n", standing: "active" }).href).toBe("/agent/firm");
    expect(makeWorkspace({ kind: "firm", id: "1", name: "n", standing: "suspended" }).href).toBe("/agent/verification");
    expect(makeWorkspace({ kind: "agent", id: "1", name: "n", standing: "active" }).href).toBe("/agent/dashboard");
  });
});

describe("the cookie is a hint and the list is the truth", () => {
  const mine = ws({ key: "supply:1" });
  const firm = ws({ key: "firm:2", kind: "firm" });

  it("is personal whenever the mode is personal, whatever the workspace key says", () => {
    expect(resolveCurrent([mine], "personal", "supply:1")).toEqual({ kind: "personal" });
  });

  it("ticks the workspace the key names, when the account actually holds it", () => {
    expect(resolveCurrent([mine, firm], "working", "firm:2")).toEqual({
      kind: "workspace",
      workspace: firm,
    });
  });

  /*
   * THE CASE THIS WHOLE DISCIPLINE EXISTS FOR. A hand edited cookie, or a
   * membership revoked at ten o'clock, names something the account does not
   * hold. It must change what a control displays and nothing else.
   */
  it("falls back rather than honouring a key the account does not hold", () => {
    expect(resolveCurrent([mine, firm], "working", "firm:999")).toEqual({ kind: "personal" });
    expect(resolveCurrent([], "working", "supply:1")).toEqual({ kind: "personal" });
  });

  it("falls back to the only workspace when there is exactly one", () => {
    expect(resolveCurrent([mine], "working", null)).toEqual({ kind: "workspace", workspace: mine });
  });

  it("refuses to guess between several", () => {
    expect(resolveCurrent([mine, firm], "working", null)).toEqual({ kind: "personal" });
  });
});

describe("the sheet's shape", () => {
  it("groups property before stays and puts the console last", () => {
    const rows = orderWorkspaces([
      ws({ key: "admin", kind: "console" }),
      ws({ key: "stays:1", kind: "host", side: "stays" }),
      ws({ key: "supply:1" }),
    ]);
    expect(rows.map((r) => r.key)).toEqual(["supply:1", "stays:1", "admin"]);
  });

  it("makes the trigger the way in on zero, a toggle on one and the sheet on several", () => {
    expect(triggerBehaviour([])).toBe("add");
    expect(triggerBehaviour([ws({ key: "a" })])).toBe("toggle");
    expect(triggerBehaviour([ws({ key: "a" }), ws({ key: "b" })])).toBe("sheet");
  });

  it("says nothing about a workspace in good standing and says something about every other", () => {
    expect(standingLabel("active")).toBeNull();
    expect(standingLabel("pending")).toBeTruthy();
    expect(standingLabel("refused")).toBeTruthy();
    expect(standingLabel("suspended")).toBeTruthy();
    expect(standingLabel("draft")).toBeTruthy();
  });

  it("turns the coin over for a workspace on the other side, and only then", () => {
    expect(needsFlip(ws({ key: "a", side: "stays" }), "property")).toBe(true);
    expect(needsFlip(ws({ key: "a", side: "property" }), "property")).toBe(false);
  });
});
