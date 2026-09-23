import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { LITERAL_EXPANSIONS, NON_NAVIGABLE, ROUTE_PARENTS } from "./route-parents";
import { matchRoute, parentOf } from "./resolve";

/**
 * THE GAP TEST. Not "are the declarations right", but "is there a route
 * nobody has made a decision about".
 *
 * `route-parents.ts` declared 143 routes and `src/app` holds 328 route files.
 * Nothing said which of the other 185 were deliberate and which were simply
 * never looked at, and that is exactly the silence that let sixty routes draw
 * no back control for months: an undeclared route is loud at RUNTIME, in a
 * development console, on a screen somebody happens to open. It was silent
 * here, where it would have been read.
 *
 * So this walks the directory tree, not the map, and every route file must be
 * in exactly one of two places: matched by a pattern in `ROUTE_PARENTS`, or
 * named in `NON_NAVIGABLE` with a reason. A new page cannot be added without a
 * decision and a new API handler cannot be added without a sentence.
 *
 * WHAT THIS WOULD REPORT ON AN EMPTY TREE, asked before it was written,
 * because a walk that finds nothing passes every assertion about what it
 * found. `finds every route file in the application` is the floor: a run that
 * discovers fewer route files than the application has is a broken walk and
 * fails before any coverage is claimed. The same question for the map itself
 * is answered by the second floor below.
 */

const APP = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "app");

/** Every `page` and `route` file under `src/app`, as the URL it serves. */
function walk(dir: string, segments: string[], out: { url: string; kind: "page" | "route" }[]) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      /* A route group, `(app)` or `(auth)`, never appears in a URL. */
      const named = /^\(.*\)$/.test(entry) ? segments : [...segments, entry];
      walk(full, named, out);
      continue;
    }
    const file = /^(page|route)\.tsx?$/.exec(entry);
    if (!file) continue;
    out.push({
      url: segments.length === 0 ? "/" : `/${segments.join("/")}`,
      kind: file[1] === "route" ? "route" : "page",
    });
  }
}

const ROUTE_FILES: { url: string; kind: "page" | "route" }[] = [];
walk(APP, [], ROUTE_FILES);

describe("the walk itself", () => {
  it("finds every route file in the application, so an empty read cannot pass as coverage", () => {
    /* Measured at 328 on 23 September. The floor is what makes every
       assertion below mean something: a walk that returned two files would
       otherwise report full coverage of two files. */
    expect(ROUTE_FILES.length).toBeGreaterThanOrEqual(300);
    expect(ROUTE_FILES.filter((r) => r.kind === "page").length).toBeGreaterThanOrEqual(250);
    /* And landmarks, so a walk that found 300 of the WRONG things still fails. */
    for (const landmark of ["/", "/home", "/admin", "/api/push/drain", "/listing/[id]"]) {
      expect(ROUTE_FILES.map((r) => r.url)).toContain(landmark);
    }
  });

  it("reads a map with something in it, so an empty map cannot pass either", () => {
    expect(Object.keys(ROUTE_PARENTS).length).toBeGreaterThanOrEqual(150);
    expect(Object.keys(NON_NAVIGABLE).length).toBeGreaterThanOrEqual(25);
  });
});

describe("every route file has been decided about", () => {
  it("is either declared in the hierarchy or named as non-navigable", () => {
    const undecided = ROUTE_FILES.filter(
      (r) =>
        matchRoute(r.url) === null &&
        NON_NAVIGABLE[r.url] === undefined &&
        LITERAL_EXPANSIONS[r.url] === undefined,
    ).map((r) => `${r.kind} ${r.url}`);
    expect(undecided).toEqual([]);
  });

  it("declares a parent for every literal a one-file-many-addresses route serves", () => {
    const missing: string[] = [];
    for (const [file, expansions] of Object.entries(LITERAL_EXPANSIONS)) {
      expect(ROUTE_FILES.map((r) => r.url)).toContain(file);
      for (const one of expansions) {
        if (ROUTE_PARENTS[one] === undefined) missing.push(`${file}: ${one}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("is never in both, because two answers is the same as none", () => {
    const both = Object.keys(NON_NAVIGABLE).filter((url) => ROUTE_PARENTS[url] !== undefined);
    expect(both).toEqual([]);
  });

  it("carries a real reason on every non-navigable entry", () => {
    for (const [url, reason] of Object.entries(NON_NAVIGABLE)) {
      expect({ url, long: reason.trim().length >= 12 }).toEqual({ url, long: true });
    }
  });

  it("names no route that does not exist", () => {
    const urls = new Set(ROUTE_FILES.map((r) => r.url));
    const ghosts = Object.keys(NON_NAVIGABLE).filter((url) => !urls.has(url));
    expect(ghosts).toEqual([]);
  });
});

describe("every declared parent is a place that exists", () => {
  /**
   * THE FAULT THIS WAS WRITTEN FOR. `/preview/[deck]/[screen]` resolved a
   * harness screen's way up to `/preview/<deck>`, and four decks have no index
   * page, so twenty five screens had a back control pointing at a not-found
   * body while reading as correctly declared. A parent is a claim about a
   * destination, and a destination nobody serves is a wrong answer however
   * carefully it was written down.
   */
  const pageUrls = ROUTE_FILES.filter((r) => r.kind === "page").map((r) => r.url);
  const handlerUrls = ROUTE_FILES.filter((r) => r.kind === "route").map((r) => r.url);

  /** Does some page or handler file serve this concrete path? */
  function served(path: string): boolean {
    if (pageUrls.includes(path) || handlerUrls.includes(path)) return true;
    /* A parent with a filled dynamic segment, e.g. `/listing/abc`, is served
       by the pattern it came from. Match it back against the file list. */
    const want = path.slice(1).split("/");
    return [...pageUrls, ...handlerUrls].some((candidate) => {
      const have = candidate.slice(1).split("/");
      if (have.length !== want.length) return false;
      return have.every((seg, i) => /^\[.+\]$/.test(seg) || seg === want[i]);
    });
  }

  it("resolves every page route to a parent the application actually serves", () => {
    const broken: string[] = [];
    for (const url of pageUrls) {
      const target = parentOf(url);
      if (target.kind !== "parent") continue;
      if (!served(target.href)) broken.push(`${url} -> ${target.href}`);
    }
    expect(broken).toEqual([]);
  });

  /**
   * The same question asked of the MAP rather than of the tree, which catches
   * a pattern that no page file happens to exercise today.
   *
   * Patterns whose parent still carries a `[segment]` after filling are left
   * out, and that is a limitation rather than a pass: `/preview/[deck]` is a
   * SHAPE, and whether the concrete `/preview/f5` is served is a question
   * about `f5` and not about the shape. Those cases are covered by the walk
   * above, which asks it of every real screen. Said plainly so nobody reads
   * this list as complete.
   */
  it("resolves every fully concrete parent in the map to a place the application serves", () => {
    const broken: string[] = [];
    for (const pattern of Object.keys(ROUTE_PARENTS)) {
      const target = parentOf(pattern);
      if (target.kind !== "parent") continue;
      if (/\[.+\]/.test(target.href)) continue;
      if (!served(target.href)) broken.push(`${pattern} -> ${target.href}`);
    }
    expect(broken).toEqual([]);
  });
});

/**
 * A PREVIEW DECK WITH NO INDEX IS A BACK BUTTON THAT GOES NOWHERE.
 *
 * Every screen at `/preview/<deck>/<screen>` declares `/preview/<deck>` as its
 * parent. Four decks had no `page.tsx` there, and on this deployment an unknown
 * path answers **HTTP 200 with the site shell** rather than 404, so the failure
 * looked like a page. That is why this is a test and not a note: the browser
 * cannot tell you, and neither can a status code.
 *
 * The rule is deliberately about DIRECTORIES rather than about the route map,
 * so it fails the moment somebody creates a folder, before any map is edited
 * and before anybody opens the deck. Directories beginning with `_` are not
 * routes and are not asked.
 */
describe("every preview deck serves its own index", () => {
  const PREVIEW = join(APP, "(dev)", "preview");

  /**
   * THE ONE EXCEPTION, NAMED RATHER THAN HIDDEN IN A PREDICATE.
   *
   * `session-b` is not a deck. It is the namespace holding Session B's fifteen
   * decks, and its tree is theirs under lead ruling R-G, so Session A does not
   * write a file into it. R23 in `docs/BUILD_07_LEDGER.md` asks them for the
   * index. **When that lands, this list goes back to empty and stays empty.**
   */
  const NOT_MINE_TO_WRITE = new Set(["session-b"]);

  /** Every directory under the preview tree, deck-relative, excluding `_` ones. */
  function decks(dir: string, prefix: string[], out: string[]) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
      const here = [...prefix, entry.name];
      out.push(here.join("/"));
      decks(join(dir, entry.name), here, out);
    }
    return out;
  }

  /** Does any route file live at or beneath this directory. */
  function holdsARoute(dir: string): boolean {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isFile() && (entry.name === "page.tsx" || entry.name === "route.ts")) return true;
      if (entry.isDirectory() && !entry.name.startsWith("_") && holdsARoute(join(dir, entry.name))) {
        return true;
      }
    }
    return false;
  }

  it("finds the preview tree at all, so an empty walk cannot pass as coverage", () => {
    const found = decks(PREVIEW, [], []);
    expect(found.length).toBeGreaterThan(20);
    expect(found).toContain("e");
  });

  it("serves a page at every directory that has screens under it", () => {
    const missing: string[] = [];
    for (const deck of decks(PREVIEW, [], [])) {
      if (NOT_MINE_TO_WRITE.has(deck)) continue;
      const dir = join(PREVIEW, ...deck.split("/"));
      if (!holdsARoute(dir)) continue;
      if (!existsSync(join(dir, "page.tsx"))) missing.push(`/preview/${deck}`);
    }
    expect(missing).toEqual([]);
  });

  it("names nothing in the exception list that has since been fixed", () => {
    /* The half that stops the exception outliving its reason. A deck that grew
       its own index must leave this list, or the list quietly becomes a place
       things are hidden. */
    const stale = [...NOT_MINE_TO_WRITE].filter((deck) =>
      existsSync(join(PREVIEW, ...deck.split("/"), "page.tsx")),
    );
    expect(stale).toEqual([]);
  });
});
