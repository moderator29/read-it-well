import { describe, expect, it } from "vitest";
import { reachableModules } from "@/lib/i18n/reachable-namespaces";

/**
 * A CLIENT MODULE MUST NOT REACH THE DICTIONARY AT RUN TIME.
 *
 * `lib/saved/searches.ts` called `getDictionary` for the chips' words and is
 * imported by the client `SavedSearchBoard`, so the whole dictionary (448 KB,
 * 398 KB gzipped) rode into `/saved/searches`' first load (W13). The lint rule
 * that bans a client `getDictionary` read cannot see it, because the import is
 * transitive: the board imports this module, this module imports the
 * dictionary. So this walks the same run-time import graph and fails if any
 * module in it imports the dictionary's entry (`@vallo/i18n`, which carries
 * every locale) or calls `getDictionary`. `@vallo/i18n/core` (formatting and
 * types, no words) is the entry client code may use, and type-only imports are
 * erased and not followed.
 */
const ROOTS = ["lib/saved/searches.ts", "components/app/saved-searches/SavedSearchBoard.tsx"];

const DICTIONARY_ENTRY = /(?:^|\n)\s*(?:import|export)\s+(?!type\s)[^;]*?from\s+["']@vallo\/i18n["']/;

describe("saved searches reach no dictionary in the browser", () => {
  for (const root of ROOTS) {
    it(root, () => {
      const offenders: string[] = [];
      for (const [file, source] of reachableModules(root)) {
        if (DICTIONARY_ENTRY.test(source) || /\bgetDictionary\s*\(/.test(source)) offenders.push(file);
      }
      expect(offenders, `${root} reaches the dictionary through these modules`).toEqual([]);
    });
  }
});
