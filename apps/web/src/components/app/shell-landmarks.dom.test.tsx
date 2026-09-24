/**
 * DOC-21: on /wallet (and every app screen) the desktop rail's menu and the
 * mobile dock were two navigation landmarks both named "Primary" (axe
 * `landmark-unique`). The two are rendered together, as the shell renders
 * them, and every landmark must be unique.
 */
import { getDictionary } from "@vallo/i18n";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it, vi } from "vitest";
import { axe, closeAxe, hasBrowser } from "@/lib/a11y/axe";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => undefined, back: () => undefined, replace: () => undefined, prefetch: () => undefined }),
  usePathname: () => "/wallet",
  useSearchParams: () => new URLSearchParams(),
}));

const { AppRail } = await import("./AppRail");
const { MobileTabBar } = await import("./MobileTabBar");
const { SideFlip } = await import("./flip/SideFlip");

afterAll(closeAxe);

describe.skipIf(!hasBrowser && !process.env.CI)("app shell landmarks (axe)", () => {
  it("the rail's menu and the dock are distinct navigation landmarks", async () => {
    const t = getDictionary("en");
    const html = renderToStaticMarkup(
      <SideFlip side="property" t={t}>
        <AppRail t={t} userName="Ada" signedIn active="/wallet" />
        <MobileTabBar t={t} signedIn active="/wallet" />
      </SideFlip>,
    );
    const navNames = [...html.matchAll(/<nav[^>]*aria-label="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(navNames).size).toBe(navNames.length);
    expect(await axe(html, { rules: ["landmark-unique"] })).toEqual([]);
  });
});
