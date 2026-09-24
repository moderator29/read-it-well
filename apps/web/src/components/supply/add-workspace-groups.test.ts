import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { renderClient } from "@/lib/testing/render-client";
import { hrefFor } from "./AddWorkspaceChooser.href";

/**
 * UX-05: "Add a workspace" shows all six doors in two labelled groups,
 * whichever side the invisible cookie says; the current side's group first.
 */
const t = getDictionary("en");
const doors = t.supply.doors as Record<string, { title: string }>;
const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;");

async function chooser(side: "property" | "stays"): Promise<string> {
  return renderClient(`
    import { renderToStaticMarkup } from "react-dom/server";
    import { getDictionary } from "@vallo/i18n";
    import { AddWorkspaceChooser } from "@/components/supply/AddWorkspaceChooser";
    export const html = () =>
      renderToStaticMarkup(<AddWorkspaceChooser t={getDictionary("en")} side="${side}" />);
  `);
}

describe("the workspace chooser shows both sets of doors", () => {
  it.each(["property", "stays"] as const)("on the %s side", async (side) => {
    const html = await chooser(side);
    for (const id of ["owner", "agent", "firm", "hotel", "shortlet", "restaurant"]) {
      expect(html, id).toContain(escape(doors[id]!.title));
    }
    const property = html.indexOf(escape(t.supply.chooser.groupProperty));
    const stays = html.indexOf(escape(t.supply.chooser.groupStays));
    expect(property).toBeGreaterThan(-1);
    expect(stays).toBeGreaterThan(-1);
    expect(side === "property" ? property < stays : stays < property).toBe(true);
  }, 30_000);

  it("sends each door to its own form, whatever the side", () => {
    expect(hrefFor("owner")).toBe("/profile/setup/owner");
    expect(hrefFor("agent")).toBe("/profile/setup/agent");
    expect(hrefFor("firm")).toBe("/profile/setup/firm");
    expect(hrefFor("hotel")).toBe("/host/apply?door=hotel");
    expect(hrefFor("restaurant")).toBe("/host/apply?door=restaurant");
  });
});
