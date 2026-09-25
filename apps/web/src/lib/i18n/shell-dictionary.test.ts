import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { SHELL_NAMESPACES, shellDictionary } from "./shell-dictionary";
import { reachableNamespaces } from "./reachable-namespaces";

describe("the shell's slice of the dictionary", () => {
  it("carries every namespace the shell's import graph can read", () => {
    const carried = new Set<string>(SHELL_NAMESPACES);
    const missing = [...reachableNamespaces("components/app/AppShell.tsx")].filter((ns) => !carried.has(ns)).sort();
    expect(missing).toEqual([]);
  });

  it("is a fraction of the whole", () => {
    const t = getDictionary("en");
    expect(JSON.stringify(shellDictionary(t)).length).toBeLessThan(JSON.stringify(t).length / 3);
  });
});
