import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push() {}, replace() {}, refresh() {} }) }));
vi.mock("@/lib/social/people-search-actions", () => ({ searchPeople: vi.fn() }));

import { PeopleSearch } from "./PeopleSearch";

const copy = {
  label: "Find people by @username",
  placeholder: "Find people by @username",
  clear: "Clear the search",
  searching: "Searching",
  none: "Nobody called {query}. Try the handle itself.",
  seeAll: "See everyone matching {query}",
};

describe("PeopleSearch", () => {
  it("is a plain form that submits to /u?q= even before any script runs", () => {
    const html = renderToStaticMarkup(<PeopleSearch mode="dropdown" copy={copy} />);
    expect(html).toContain('action="/u"');
    expect(html).toContain('method="get"');
    expect(html).toContain('name="q"');
    expect(html).toContain('placeholder="Find people by @username"');
  });

  it("draws no result panel until something is typed", () => {
    expect(renderToStaticMarkup(<PeopleSearch mode="dropdown" copy={copy} />)).not.toContain("nf-pfind__panel");
  });

  it("keeps the page's own search in the box on /u", () => {
    const html = renderToStaticMarkup(<PeopleSearch mode="page" initialQuery="ada" copy={copy} />);
    expect(html).toContain('value="ada"');
    expect(html).toContain('data-mode="page"');
  });
});
