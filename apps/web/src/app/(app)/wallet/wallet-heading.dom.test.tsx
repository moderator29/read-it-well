/**
 * DOC-21: /wallet had no h1 (axe `page-has-heading-one`): the balance card is
 * the visual title and carries no heading. The page is a server component;
 * it is called with its data sources stubbed, and the element tree it returns
 * is searched for a level-one heading in all three of its states.
 */
import type { ReactElement, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ wallet: null as unknown }));

vi.mock("@/lib/locale", () => ({ getLocale: async () => "en" }));
vi.mock("@/lib/actions/session", () => ({ resolveSession: async () => ({ state: "signed-out" }) }));
vi.mock("@/lib/wallet/repository", () => ({ getWalletForViewer: async () => state.wallet }));
vi.mock("@/lib/wallet/pots", () => ({ readPots: async () => ({ state: "none" }) }));
vi.mock("@/lib/payments/methods-actions", () => ({ listPaymentMethods: async () => ({ ok: true, data: [] }) }));
vi.mock("@/lib/payments/yellowcard", () => ({ isYellowCardConfigured: () => false }));

const { default: WalletPage } = await import("./page");

function headings(node: ReactNode, out: string[] = []): string[] {
  if (Array.isArray(node)) {
    for (const child of node) headings(child, out);
    return out;
  }
  if (!node || typeof node !== "object" || !("props" in node)) return out;
  const el = node as ReactElement<{ children?: ReactNode }>;
  if (el.type === "h1") out.push(String((el.props as { children?: ReactNode }).children));
  headings(el.props.children, out);
  return out;
}

describe("/wallet has exactly one h1", () => {
  it.each([
    ["signed out", { live: false, readFailed: false, balanceMinor: 0, entries: [], breakdown: null }],
    ["unreadable", { live: true, readFailed: true, balanceMinor: 0, entries: [], breakdown: null }],
    ["live", { live: true, readFailed: false, balanceMinor: 5_000_000, entries: [], breakdown: null }],
  ])("%s", async (_label, wallet) => {
    state.wallet = wallet;
    const tree = await WalletPage({ searchParams: Promise.resolve({}) });
    expect(headings(tree)).toEqual(["Wallet"]);
  });
});
