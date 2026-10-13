/**
 * The answer to "needs more information", rendered for real. A business is
 * offered a slot for its registration papers as well as the identity and
 * address slots, because the CAC certificate is the commonest thing a
 * reviewer asks a business for and there was nowhere to send it. Every slot
 * says what it takes before a file is chosen, and the screen stays clean
 * under axe in Chromium.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it, vi } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { axe, closeAxe, hasBrowser } from "@/lib/a11y/axe";
import { forRespond } from "./agent-copy";

vi.mock("@/lib/agent/application-respond", () => ({ respondToReview: vi.fn() }));

const { RespondToReview } = await import("./RespondToReview");
const t = forRespond(getDictionary("en"));
const copy = t.agent.status.respond;

afterAll(closeAxe);

const fileInputs = (html: string) => html.match(/type="file"/g)?.length ?? 0;

describe("RespondToReview", () => {
  it("offers an identity and an address slot to a person", () => {
    const html = renderToStaticMarkup(<RespondToReview t={t} />);
    expect(fileInputs(html)).toBe(2);
    expect(html).not.toContain(copy.attachBusinessTitle);
  });

  it("adds a registration slot for a business", () => {
    const html = renderToStaticMarkup(<RespondToReview t={t} business />);
    expect(fileInputs(html)).toBe(3);
    expect(html).toContain(copy.attachBusinessTitle);
  });

  it("states the limit on every empty slot", () => {
    const html = renderToStaticMarkup(<RespondToReview t={t} business />);
    expect(html.match(/up to 8MB/g)?.length).toBe(3);
  });

  it.skipIf(!hasBrowser && !process.env.CI)("has no axe violations", async () => {
    const html = renderToStaticMarkup(<RespondToReview t={t} business />);
    expect(await axe(`<h1>Your application</h1>${html}`)).toEqual([]);
  });
});
