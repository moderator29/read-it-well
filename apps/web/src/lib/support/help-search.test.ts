import { describe, expect, it } from "vitest";
import { FAQS, POPULAR_QUESTIONS } from "./help-articles";
import { popularArticles, searchHelpArticles } from "./help-search";

const A = [
  { category: "Payments and refunds", q: "How do refunds work?", a: "One schedule applies." },
  { category: "Booking a stay", q: "How do I book?", a: "Pick dates. A refund follows the schedule." },
  { category: "Languages", q: "Which languages?", a: "English, Yorùbá, Hausa and Igbo." },
];

describe("help search", () => {
  it("finds nothing for an empty query, so the caller shows its featured list", () => {
    expect(searchHelpArticles(A, "   ")).toEqual([]);
  });

  it("ranks a hit in the question above a hit only in the answer", () => {
    expect(searchHelpArticles(A, "refund").map((a) => a.q)).toEqual(["How do refunds work?", "How do I book?"]);
  });

  it("needs every word, and folds case and accents", () => {
    expect(searchHelpArticles(A, "REFUND dates").map((a) => a.q)).toEqual(["How do I book?"]);
    expect(searchHelpArticles(A, "yoruba").map((a) => a.q)).toEqual(["Which languages?"]);
  });

  it("respects the limit", () => {
    expect(searchHelpArticles(A, "o", 1)).toHaveLength(1);
  });

  it("every featured question is a real help centre article", () => {
    const popular = popularArticles(FAQS, POPULAR_QUESTIONS);
    expect(popular.map((a) => a.q)).toEqual([...POPULAR_QUESTIONS]);
  });

  it("drops a featured question that no longer exists rather than inventing one", () => {
    expect(popularArticles(A, ["Gone?", "Which languages?"]).map((a) => a.q)).toEqual(["Which languages?"]);
  });
});
