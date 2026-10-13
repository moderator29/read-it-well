import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { workspaceDockShows } from "./workspace-dock";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("the main dock on a workspace page (13 October 2026)", () => {
  it("shows on an ordinary workspace screen", () => {
    expect(workspaceDockShows({})).toBe(true);
  });

  it("steps aside for an immersive screen and for a flow with its own footer", () => {
    expect(workspaceDockShows({ immersive: true })).toBe(false);
    expect(workspaceDockShows({ flow: true })).toBe(false);
    expect(workspaceDockShows({ immersive: true, flow: true })).toBe(false);
  });

  it("is drawn by both workspace shells, from the one component, once each", () => {
    for (const shell of ["../agent/AgentShell.tsx", "../host/HostShell.tsx"]) {
      const source = read(shell);
      expect(source, shell).toContain("<WorkspaceDock");
      expect(source.match(/<WorkspaceDock/g)?.length, shell).toBe(1);
      expect(source, shell).toContain("workspaceDockShows(");
      expect(source, shell).toContain("nf-main--docked");
    }
  });

  it("draws the dock on the side the workspace lives on", () => {
    expect(read("../agent/AgentShell.tsx")).toContain('<WorkspaceDock side="property"');
    expect(read("../host/HostShell.tsx")).toContain('<WorkspaceDock side="stays"');
  });

  it("is the same dock the consumer shell draws, not a second implementation", () => {
    expect(read("../app/AppShell.tsx")).toContain("<ShellDock");
    expect(read("./WorkspaceDock.tsx")).toContain("<ShellDock");
    expect(read("../app/ShellDock.tsx")).toContain("<MobileTabBar");
    /* One dock: the workspace drawers must not grow a bottom tab bar of their own. */
    for (const own of ["../agent/AgentMobileNav.tsx", "../host/HostDrawer.tsx", "./WorkspaceDrawer.tsx"]) {
      expect(read(own), own).not.toContain("MobileTabBar");
    }
  });

  it("leaves the listing wizard's own step footer alone", () => {
    expect(read("../../app/agent/list/page.tsx")).toMatch(/\n\s+flow\n/);
  });
});
