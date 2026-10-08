import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it } from "vitest";
import { axe, closeAxe, hasBrowser } from "@/lib/a11y/axe";
import { PREVIEW_PLANS } from "@/app/(dev)/preview/pro/plans-fixture";
import { PlanPicker } from "./PlanPicker";

afterAll(closeAxe);

const words = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, " ");

function picker(over: Partial<Parameters<typeof PlanPicker>[0]> = {}): string {
  return renderToStaticMarkup(
    <PlanPicker plans={PREVIEW_PLANS} trialDays={4} locale="en" signedIn signInHref="/sign-in?next=/pro" {...over} />,
  );
}

describe("the /pro plan page (D83: Vallo Pro and Vallo Business)", () => {
  it("draws both plans, the first with its price from the row, the 4-day free trial and what it includes", () => {
    const html = picker();
    const text = words(html);
    expect(html).toContain('data-testid="pro-plan-pro"');
    expect(html).toContain('data-testid="pro-plan-business"');
    expect(text).toContain("Vallo Pro");
    expect(text).toContain("For an individual agent or landlord.");
    expect(text).toContain("₦9,500 a month");
    expect(text).toContain("4-day free trial");
    expect(text).toContain("4 Boosts a month");
    expect(text).toContain("Deep analytics");
    expect(text).toContain("Pro badge");
    expect(text).toContain("Priority support");
    expect(text).toContain("Not on sale yet, so nothing can be charged.");
  });

  it("never offers a checkout or a trial start, because neither exists", () => {
    const text = words(picker());
    expect(text).not.toMatch(/start (your |a )?free trial|subscribe|pay now|buy now/i);
  });

  it("says nothing about a trial when its length could not be read", () => {
    const html = picker({ trialDays: null });
    expect(html).not.toContain('data-testid="pro-plan-trial"');
    expect(words(html)).not.toMatch(/free trial/i);
  });

  it("shows no plan, and no figure, when the plan rows could not be read", () => {
    const html = picker({ plans: [] });
    expect(html).toContain('data-testid="pro-plans-none"');
    expect(html).not.toContain("₦");
  });
});

describe.skipIf(!hasBrowser && !process.env.CI)("the /pro plan page (axe)", () => {
  it("has no violations with the plans drawn, or with none", async () => {
    expect(await axe(`<h1>Vallo Pro</h1>${picker()}`)).toEqual([]);
    expect(await axe(`<h1>Vallo Pro</h1>${picker({ plans: [] })}`)).toEqual([]);
  });
});
