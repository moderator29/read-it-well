import { describe, expect, it, vi } from "vitest";
import type { ReactElement, ReactNode } from "react";

/**
 * /wallet/send?to=@handle must never put another member's email address into
 * the props of the client form. Every server-side source of an address is
 * wired to answer with one here, so a page that looked a handle up and passed
 * the result down would fail this test.
 */
const LEAKED = "victim.private@example.com";

const fakeAdmin = {
  from: () => ({
    select: () => ({
      eq: () => ({ maybeSingle: async () => ({ data: { user_id: "victim" }, error: null }) }),
    }),
  }),
  auth: {
    admin: {
      getUserById: async () => ({ data: { user: { id: "victim", email: LEAKED } }, error: null }),
    },
  },
};

/* The suite aliases `react` at its server entry (vitest.config.ts), which has
   no JSX runtime; the page's JSX is read here as plain { type, props }. */
vi.mock("react/jsx-dev-runtime", () => ({
  Fragment: "fragment",
  jsxDEV: (type: unknown, props: unknown) => ({ type, props }),
}));
vi.mock("react/jsx-runtime", () => ({
  Fragment: "fragment",
  jsx: (type: unknown, props: unknown) => ({ type, props }),
  jsxs: (type: unknown, props: unknown) => ({ type, props }),
}));

vi.mock("@/lib/wallet/ledger", () => ({
  getAdminClient: () => fakeAdmin,
  findUserByEmail: async () => ({ id: "victim", email: LEAKED }),
  displayNameFor: async () => null,
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => fakeAdmin }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => fakeAdmin }));
vi.mock("@/lib/locale", () => ({ getLocale: async () => "en" }));
vi.mock("@/lib/actions/session", () => ({
  resolveSession: async () => ({ state: "signed-in", user: { id: "payer", email: "payer@example.com" } }),
}));
vi.mock("@/lib/wallet/repository", () => ({
  getWalletForViewer: async () => ({ live: true, readFailed: false, balanceMinor: 500_000 }),
}));
vi.mock("@/components/app/wallet/SendFlow", () => ({ SendFlow: () => null }));
vi.mock("@/components/app/wallet/WalletBack", () => ({ WalletBack: () => null }));

import WalletSendPage from "./page";
import { SendFlow } from "@/components/app/wallet/SendFlow";

function findProps(node: ReactNode, type: unknown): Record<string, unknown> | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = findProps(child, type);
      if (hit) return hit;
    }
    return null;
  }
  const el = node as ReactElement<Record<string, unknown> & { children?: ReactNode }>;
  if (el.type === type) return el.props;
  return findProps(el.props?.children, type);
}

describe("/wallet/send?to=@handle", () => {
  it("prefills the handle and hands the client form no email address", async () => {
    const page = await WalletSendPage({
      searchParams: Promise.resolve({ to: "@victim", amount: "5000" }),
    });
    const props = findProps(page, SendFlow);
    expect(props).not.toBeNull();
    expect(props?.initialEmail).toBe("@victim");
    const serialised = JSON.stringify(props);
    expect(serialised).not.toContain(LEAKED);
    expect(serialised).not.toMatch(/[^\s@"]+@[^\s@"]+\.[a-z]{2,}/i);
  });
});
