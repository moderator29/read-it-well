import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { Fab } from "./Fab";
import { DropdownButton } from "./DropdownButton";
import { LinkButton } from "./LinkButton";
import { ActionTile, actionTileClass } from "./ActionTile";
import { Quantity, stepQuantity } from "./Quantity";
import { Checkbox, Radio } from "./Check";
import { Tag, tagClass } from "./Tag";
import { Switch, Toggle } from "./Switch";
import { Segmented } from "./Segmented";

/* The button system (reference 55, spec section 19): the primitives added for
   the kinds the platform lacked, rendered on the server. */
describe("the button system's new primitives", () => {
  it("Fab is the primary button drawn round, named, with the plus by default", () => {
    const html = renderToString(<Fab aria-label="Add a listing" />);
    expect(html).toContain("nf-btn--primary");
    expect(html).toContain("nf-btn--fab");
    expect(html).toContain("nf-btn--lg");
    expect(html).toContain('aria-label="Add a listing"');
    expect(html).toContain('type="button"');
  });

  it("DropdownButton states its popup and whether it is open", () => {
    const closed = renderToString(<DropdownButton>Sort by</DropdownButton>);
    expect(closed).toContain('aria-haspopup="listbox"');
    expect(closed).toContain('aria-expanded="false"');
    expect(closed).toContain("nf-btn--dropdown");
    expect(closed).toContain("nf-btn__chevron");
    const open = renderToString(
      <DropdownButton expanded popup="dialog" size="md">
        Sort by
      </DropdownButton>,
    );
    expect(open).toContain('aria-expanded="true"');
    expect(open).toContain('aria-haspopup="dialog"');
    expect(open).toContain("nf-btn--md");
  });

  it("LinkButton is a link with the arrow unless asked not to", () => {
    expect(renderToString(<LinkButton href="/search">View all</LinkButton>)).toMatch(/href="\/search"[^>]*class="nf-link-btn"|class="nf-link-btn"[^>]*href="\/search"/);
    expect(renderToString(<LinkButton href="/a">View all</LinkButton>)).toContain("nf-btn__arrow");
    expect(renderToString(<LinkButton href="/a" arrow={false}>View all</LinkButton>)).not.toContain("nf-btn__arrow");
  });

  it("ActionTile is a button or a link, and takes its tone", () => {
    expect(actionTileClass()).toBe("nf-action-tile");
    expect(actionTileClass("danger", "x")).toBe("nf-action-tile nf-action-tile--danger x");
    const button = renderToString(<ActionTile icon="trash" label="Delete" tone="danger" disabled />);
    expect(button).toContain("<button");
    expect(button).toContain("disabled");
    expect(button).toContain("Delete");
    const link = renderToString(<ActionTile icon="phone" label="Call" href="tel:+2340000000000" external />);
    expect(link).toContain('href="tel:+2340000000000"');
    expect(link).toContain('rel="noopener noreferrer"');
  });

  it("Quantity clamps and disables each end", () => {
    expect(stepQuantity(1, 1, 0, 9)).toBe(2);
    expect(stepQuantity(9, 1, 0, 9)).toBe(9);
    expect(stepQuantity(0, -1, 0, 9)).toBe(0);
    expect(stepQuantity(4, -10, 1, 9)).toBe(1);
    expect(stepQuantity(3, Number.NaN, 0, 9)).toBe(3);
    const atMin = renderToString(
      <Quantity value={0} onChange={() => undefined} label="Guests" decreaseLabel="Fewer guests" increaseLabel="More guests" />,
    );
    expect(atMin).toContain('role="group"');
    expect(atMin).toContain('aria-label="Guests"');
    expect(atMin).toMatch(/aria-label="Fewer guests"[^>]*disabled/);
    expect(atMin).not.toMatch(/aria-label="More guests"[^>]*disabled/);
  });

  it("Checkbox and Radio wrap the native input in the 44px label row", () => {
    const box = renderToString(<Checkbox defaultChecked>Remember me</Checkbox>);
    expect(box).toContain('class="nf-check"');
    expect(box).toContain('type="checkbox"');
    expect(renderToString(<Radio name="p">Card</Radio>)).toContain('type="radio"');
  });

  it("Tag takes its tone and draws its glyph hidden", () => {
    expect(tagClass()).toBe("nf-tag");
    expect(tagClass("spark")).toBe("nf-tag nf-tag--spark");
    const html = renderToString(
      <Tag tone="success" icon="circle-check">
        Available
      </Tag>,
    );
    expect(html).toContain("nf-tag--success");
    expect(html).toContain('aria-hidden="true"');
  });

  it("Toggle is the Switch, and the switch no longer fades when disabled", () => {
    expect(Toggle).toBe(Switch);
    const html = renderToString(<Toggle checked={false} onCheckedChange={() => undefined} aria-label="Alerts" disabled />);
    expect(html).toContain('role="switch"');
    expect(html).not.toContain("opacity-45");
  });

  it("Segmented icon-only keeps each label as the segment's name", () => {
    const html = renderToString(
      <Segmented<"home" | "search">
        label="View"
        iconOnly
        value="home"
        onChange={() => undefined}
        options={[
          { value: "home", label: "Home", icon: "home" },
          { value: "search", label: "Search", icon: "search" },
        ]}
      />,
    );
    expect(html).toContain('class="sr-only"');
    expect(html).toContain("Search");
  });
});
