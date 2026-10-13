import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { SearchPill } from "./SearchPill";

/**
 * WCAG 2.5.3, label in name: the filters link's accessible name contains the
 * word it shows, so a voice-control user can say what they see. axe 4.14
 * flags it as serious; on 6 October Hausa, Yoruba and Igbo showed the English
 * "Filters" under a translated name that did not contain it.
 */
describe("the landing search pill's filters link", () => {
  for (const locale of ["en", "ha", "yo", "ig"] as const) {
    it(`names itself with the word it shows (${locale})`, () => {
      const labels = getDictionary(locale).landing.face.search;
      const html = renderToStaticMarkup(<SearchPill labels={labels} />);
      const name = html.match(/class="nf-landing-pill-filters" aria-label="([^"]*)"/)?.[1] ?? "";
      expect(name.toLocaleLowerCase()).toContain(labels.filtersShort.toLocaleLowerCase());
      expect(name.toLocaleLowerCase()).toContain(labels.filters.toLocaleLowerCase());
    });
  }
});
