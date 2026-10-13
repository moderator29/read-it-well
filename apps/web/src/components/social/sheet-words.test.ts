import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";

import { reportWordsOf, sheetWordsOf } from "./sheet-words";

/**
 * THE REPORT SHEET'S TITLES AND SUBJECTS TRAVEL WITH ITS WORDS (C9).
 *
 * ProfileMenu, StoryViewer and CommentsSheet wrote "Report {who}" and "Report
 * this comment" in English beside a sheet whose reasons were already in the
 * reader's language. They read the same `ReportWords` object now; these pin
 * the English to what the components spelled, so the move changed no byte.
 */
describe("the report sheet's titles and subjects", () => {
  const words = reportWordsOf(getDictionary("en"));

  it("say in English what the three components spelled", () => {
    expect(words.reportWho.replace("{who}", () => "@tolu")).toBe("Report @tolu");
    expect(words.accountSubject.replace("{handle}", () => "tolu")).toBe(
      "The account at @tolu, not one thing they wrote. To report a single post, use the menu on that post.",
    );
    expect(words.reportStory).toBe("Report this story");
    expect(words.storySubject.replace("{handle}", () => "tolu")).toBe("The account behind this story, at @tolu.");
    expect(words.reportComment).toBe("Report this comment");
    expect(words.commentSubject.replace("{who}", () => "Tolu A.")).toBe("Written by Tolu A.");
  });

  it("are the same object a post's sheet carries, so every screen that has the reasons has the titles", () => {
    expect(sheetWordsOf(getDictionary("en")).report).toBe(words);
  });

  it("reach every locale, English where a translator has not been yet", () => {
    for (const locale of ["ha", "ig", "yo"] as const) {
      const report = reportWordsOf(getDictionary(locale));
      for (const key of ["reportWho", "accountSubject", "reportStory", "storySubject", "reportComment", "commentSubject"] as const) {
        expect(report[key], `${locale} ${key}`).toBeTruthy();
      }
    }
  });
});
