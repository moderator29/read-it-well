/**
 * NOTHING IS WIDER THAN THE PHONE (brief section 5: "the sideways scroll wants a
 * regression guard"). Horizontal overflow comes back every time a wide element
 * is added, so this mounts the screens where it was found and fixed in the
 * Round 3 sweep, and the chrome every member screen sits in, at 390 and 320
 * wide in Chromium on the product's real compiled cascade (`appCss`), and fails
 * on anything wider than the window, naming it.
 *
 * WITH THE SAFETY NETS OFF. `base.css` sets `overflow-x: hidden` on the root
 * and `clip` on the body, so a child 4px too wide does not move
 * `document.scrollingElement.scrollWidth`: it is cut off instead, or (on iOS,
 * where the root's value does not always reach the viewport) the page still
 * pans. Both hide the bug this test exists to find, so the mount turns them
 * off and then asks two things:
 *
 *   1. the page: `document.scrollingElement.scrollWidth` is not more than
 *      `innerWidth`;
 *   2. the culprit: every element whose visible box reaches past either edge of
 *      the window, outermost first, named by tag, class and words. A box inside
 *      a sideways scroller (a chip row, a rail) is the scroller's business, and
 *      the scroller itself is held like everything else.
 *
 * A case may also name scrollers that must have NOTHING to scroll at this
 * width (`fits`): the console's jobs table stacks into rows on a phone, so its
 * scroll wrapper scrolling again is the regression.
 *
 * The cases, and what each was (each fails with that value back; see the
 * report for the run):
 *   - /stories/[id]: `.nf-story` cancelled the gutter with -1.25rem (20px into
 *     a 16px gutter): -4 to 394 at 390.
 *   - /around: `.nf-district__chips` bled -1.25rem, padded 1.25rem.
 *   - /u/[handle]: the cover and the daylight island bled -1.25rem.
 *   - the console's jobs table: five columns squeezed into 358px, scrolling.
 *   - the agent's analytics: the charts' screen-reader table carried `sr-only`
 *     itself, and a table sizes to its content whatever width that gives it
 *     (76px past 390 in Hausa, so this case is in Hausa).
 *   - the shell and the dock, signed in and out, and listing cards one across
 *     and wide, in the shell.
 *
 * Fixtures: the preview harness's own (`preview/f3`, `f4`, `f5`, session-b
 * admin), as the real routes compose them.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Page } from "playwright-core";
import { BROWSER_TEST_TIMEOUT, closeBrowser, hasBrowser, mountInBrowser, warmBrowser } from "@/lib/testing/mount-in-browser";
import { layoutCss } from "@/lib/testing/locale-fit";
import { LOCALE_COOKIE } from "@/lib/locale.constants";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const PHONES = [
  { width: 390, height: 844 },
  { width: 320, height: 640 },
] as const;

/** The two nets off, so a wide child shows as width rather than as a clip. */
const NETS_OFF = "html, body { overflow-x: visible !important; }";

type OverflowCase = {
  name: string;
  /** The route, so `usePathname` (the shell's active tab) agrees with it. */
  path: string;
  imports: string;
  /** JSX; may use `t` (the dictionary) and `locale`. */
  body: string;
  css: () => Promise<string>;
  locale?: "en" | "ha";
  theme?: "light" | "dark";
  /** Scrollers that must have nothing to scroll at a phone's width. */
  fits?: string;
};

const SHELL_IMPORTS = `
  import { AppShell } from "@/components/app/AppShell";
  import { shellDictionary } from "@/lib/i18n/shell-dictionary";`;

/** Inside the member shell, signed in, exactly as `(app)/layout.tsx` draws a page. */
const inShell = (children: string, signedIn = true) => `
  <AppShell t={shellDictionary(t)} userName="Seyi" userHandle="seyifunmi" signedIn={${signedIn}}>
    ${children}
  </AppShell>`;

/* A signed-in screen gets the globals plus the member sheets its layout imports. */
const MEMBER_CSS = () => layoutCss("app/(app)/layout.tsx");

const CASES: OverflowCase[] = [
  {
    name: "/stories/[id], the story bleeding to both edges",
    path: "/stories/00000000-0000-4000-8000-00000000e001",
    imports: `${SHELL_IMPORTS}
      import { StoryViewer } from "@/components/social/story/StoryViewer";
      import { reportWordsOf } from "@/components/social/sheet-words";
      import { FEED_STORIES, STORY, STORY_COMMENTS, STORY_FACES } from "@/app/(dev)/preview/f4/fixtures";`,
    body: inShell(`
      <StoryViewer story={STORY} faces={STORY_FACES} overflow={12} comments={STORY_COMMENTS}
        more={FEED_STORIES.slice(1)} signedIn viewerFollows={false} reportWords={reportWordsOf(t)} />`),
    css: MEMBER_CSS,
  },
  {
    name: "/around, the district header and its chip row",
    path: "/around",
    imports: `${SHELL_IMPORTS}
      import { DistrictChips, DistrictHeader } from "@/components/social/feed/DistrictHeader";
      import { FEED_PLACES, FEED_STORIES, PLACE_REVIEWS } from "@/app/(dev)/preview/f4/fixtures";`,
    body: inShell(`
      <div className="flex flex-col gap-[var(--nf-feed-gap)]">
        <DistrictHeader name={FEED_PLACES[0].name} city={FEED_PLACES[0].city} places={FEED_PLACES} currentSlug={FEED_PLACES[0].slug} />
        <DistrictChips active="all" counts={{ stories: FEED_STORIES.length, reviews: PLACE_REVIEWS.length }} onPick={() => {}} />
      </div>`),
    css: MEMBER_CSS,
  },
  {
    name: "/u/[handle], the cover inside the daylight island (light theme)",
    path: "/u/seyifunmi",
    imports: `${SHELL_IMPORTS}
      import PublicProfilePreview from "@/app/(dev)/preview/f4/public-profile/page";`,
    /* The preview is the real ProfileHeader on fixture props, in a bare <main>; the
       page draws it in the shell's column, as here. */
    body: inShell(`<div className="mx-auto max-w-2xl pb-4xl"><PublicProfilePreview /></div>`),
    css: MEMBER_CSS,
    theme: "light",
  },
  {
    name: "the console's operations desk, jobs table",
    path: "/admin/operations",
    imports: `
      import { OperationsView } from "@/app/admin/operations/OperationsView";
      import { AdminFrame } from "@/app/admin/_components/AdminFrame";
      import { COUNTS, IDENTITY, JOBS, NOW, REAL_ALERTS } from "@/app/(dev)/preview/session-b/admin/fixtures";`,
    body: `
      <AdminFrame identity={IDENTITY} counts={COUNTS} unread={2} navLabel="Admin console" navLabels={t.admin.nav}
        searchLabel="Search" bellLabel="Notifications"
        experience={{ palette: t.experienceAdmin.palette, deskLedes: t.experienceAdmin.deskLedes, waitingTotal: t.experienceAdmin.shell.waitingTotal }}>
        <OperationsView locale={locale} now={NOW} tab="jobs" jobs={JOBS}
          database={{ checkedAt: new Date(NOW - 4 * 60_000).toISOString(), failures: 1, recovered: 1, neverRan: 4, stale: 0 }}
          runDays={null} trend={null} alerts={REAL_ALERTS} audit={[]} activity={null} notifications={null} />
      </AdminFrame>`,
    css: () => layoutCss("app/admin/layout.tsx", "app/admin/_components/admin-material.css"),
    fits: ".nf-admin-dt-wrap",
  },
  {
    name: "the agent's analytics, its charts' screen-reader tables (Hausa)",
    path: "/agent/analytics",
    imports: `
      import { AnalyticsWorkspace } from "@/app/agent/analytics/AnalyticsWorkspace";
      import { AGENT_ANALYTICS } from "@/app/(dev)/preview/f5/ops-fixtures";`,
    /* AgentShell reads the database, so its two wrappers around a page are drawn
       as it draws them below 640px (components/agent/AgentShell.tsx). */
    body: `
      <div className="nf-agent flex min-h-dvh"><main className="nf-soft-top min-w-0 flex-1">
        <div className="px-md pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-lg">
          <AnalyticsWorkspace t={t.agentAnalytics} hours={{ one: t.agentBookings.card.hoursOne, other: t.agentBookings.card.hours }}
            statusLabels={t.agentListings.workspace.status} analytics={AGENT_ANALYTICS} locale={locale} />
        </div>
      </main></div>`,
    css: () => layoutCss("app/agent/layout.tsx"),
    locale: "ha",
  },
  {
    name: "the shell and the dock, signed in (/home)",
    path: "/home",
    imports: SHELL_IMPORTS,
    body: inShell(`<p className="nf-body">{t.nav.home}</p>`),
    css: MEMBER_CSS,
  },
  {
    name: "the shell and the dock, signed out (/search)",
    path: "/search",
    imports: SHELL_IMPORTS,
    body: inShell(`<p className="nf-body">{t.nav.search}</p>`, false),
    css: MEMBER_CSS,
  },
  {
    name: "listing cards in the shell, one across and wide (/search)",
    path: "/search",
    imports: `${SHELL_IMPORTS}
      import { ListingCard } from "@/components/app/ListingCard";
      import { SHELF } from "@/app/(dev)/preview/f3/fixtures";`,
    body: inShell(`
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16 }}>
        {SHELF.map((listing, i) => <ListingCard key={listing.id} listing={listing} locale={locale} t={t} index={i} />)}
        {SHELF.slice(0, 2).map((listing, i) => <ListingCard key={"w" + listing.id} listing={listing} locale={locale} t={t} index={i} wide />)}
      </div>`),
    css: MEMBER_CSS,
  },
];

/*
 * Real findings, reported and not yet fixed: the case runs as `it.fails`, so it
 * turns red the day it is fixed and the entry must go. Key "<case> at <width>px".
 */
const KNOWN: Record<string, string> = {
  /* social.css is mid-move by another agent; the fix is a patch in the report
     (flex-wrap on `.nf-profile-text .nf-social-counts`), measured to pass. */
  "/u/[handle], the cover inside the daylight island (light theme) at 320px":
    "the counts row beside the avatar: Posts spans 310 to 344 in a 320px window",
};

type Measured = { scrollWidth: number; innerWidth: number; culprits: string[]; scrolling: string[] };

/** The page's width, and every box past an edge, outermost first. */
function measure(page: Page, fits: string | null): Promise<Measured> {
  return page.evaluate((fitsSelector) => {
    const VW = window.innerWidth;
    const say = (el: Element) => {
      const cls = typeof el.className === "string" ? el.className.trim().split(/\s+/).slice(0, 3).join(".") : "";
      const words = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
      return `${el.tagName.toLowerCase()}${cls ? `.${cls}` : ""} "${words}"`;
    };
    const scrollsSideways = (el: Element) => {
      const s = getComputedStyle(el);
      return /(auto|scroll)/.test(s.overflowX);
    };
    /* The box as far as it can be seen: cut to every ancestor that hides or
       clips its overflow (a 1px sr-only box, a rounded card), until a fixed one. */
    const seen = (el: Element) => {
      const r = el.getBoundingClientRect();
      let left = r.left;
      let right = r.right;
      if (getComputedStyle(el).position === "fixed") return { left, right };
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        const s = getComputedStyle(a);
        if (/(hidden|clip)/.test(s.overflowX)) {
          const ar = a.getBoundingClientRect();
          left = Math.max(left, ar.left);
          right = Math.min(right, ar.right);
        }
        if (s.position === "fixed") break;
      }
      return { left, right };
    };
    const culprits: string[] = [];
    const flagged = new Set<Element>();
    for (const el of document.body.querySelectorAll("*")) {
      const s = getComputedStyle(el);
      if (s.display === "none" || s.visibility === "hidden") continue;
      if (el.closest("svg") && el.tagName.toLowerCase() !== "svg") continue;
      let inside = false;
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        if (flagged.has(a) || scrollsSideways(a)) {
          inside = true;
          break;
        }
      }
      if (inside) continue;
      const r = el.getBoundingClientRect();
      /* A 1px box is the visually-hidden pattern (`sr-only` sits at -1px by its
         margin); what matters is what it holds, which its overflow clips. A
         table that carries `sr-only` itself is as wide as its words and is held. */
      if (r.width <= 1 || r.height === 0) continue;
      const box = seen(el);
      if (box.right <= box.left) continue;
      if (box.right > VW + 0.5 || box.left < -0.5) {
        flagged.add(el);
        culprits.push(`${say(el)} spans ${Math.round(box.left)} to ${Math.round(box.right)}`);
      }
    }
    const scrolling = fitsSelector
      ? [...document.querySelectorAll(fitsSelector)]
          .filter((el) => el.scrollWidth > el.clientWidth + 1)
          .map((el) => `${say(el)} scrolls ${el.scrollWidth}px in ${el.clientWidth}px`)
      : [];
    return { scrollWidth: document.scrollingElement!.scrollWidth, innerWidth: VW, culprits, scrolling };
  }, fits);
}

function entry(c: OverflowCase): string {
  return `
    import { createRoot } from "react-dom/client";
    import { getDictionary } from "@vallo/i18n";
    import { ClientCopyProvider } from "@/lib/i18n/client-copy";
    import { clientCopyOf } from "@/lib/i18n/client-copy-of";
    ${c.imports}
    const locale = ${JSON.stringify(c.locale ?? "en")};
    const t = getDictionary(locale);
    createRoot(document.getElementById("root")).render(
      <ClientCopyProvider copy={clientCopyOf(t)}>${c.body}</ClientCopyProvider>,
    );
    requestAnimationFrame(() => { window.__mounted = true; });
  `;
}

describe.skipIf(!hasBrowser && !process.env.CI)("no screen is wider than the phone", () => {
  for (const c of CASES) {
    for (const viewport of PHONES) {
      const key = `${c.name} at ${viewport.width}px`;
      (key in KNOWN ? it.fails : it)(key, async () => {
        const locale = c.locale ?? "en";
        const { page, close } = await mountInBrowser({
          entry: entry(c),
          css: `${await c.css()}\n${NETS_OFF}`,
          viewport,
          url: `http://vallo.test${c.path}`,
          init: `document.cookie = ${JSON.stringify(`${LOCALE_COOKIE}=${locale}; path=/`)};
            document.documentElement.lang = ${JSON.stringify(locale)};
            ${c.theme ? `document.documentElement.dataset.theme = ${JSON.stringify(c.theme)};` : ""}`,
        });
        try {
          await page.evaluate(() => document.fonts.ready);
          /* One frame for anything measured after mount (a fold, a rail). */
          await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
          const found = await measure(page, c.fits ?? null);
          expect(found.culprits.join("\n"), "a box past the window's edge").toBe("");
          expect(found.scrolling.join("\n"), "a scroller that should fit").toBe("");
          expect(found.scrollWidth, "the page scrolls sideways").toBeLessThanOrEqual(found.innerWidth);
        } finally {
          await close();
        }
      });
    }
  }
});
