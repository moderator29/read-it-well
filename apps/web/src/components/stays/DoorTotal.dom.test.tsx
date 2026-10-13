import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { formatMoney, getDictionary } from "@vallo/i18n";
import { toDoorCharges } from "@/lib/stays/door-total";
import type { ArrivalCharges } from "@/lib/stays/arrival-charges";
import { DoorTotal } from "./DoorTotal";

/**
 * Every cost before booking (product rule 2): the block the stay page, the
 * listing's reserve panel and checkout all draw. It names each declared
 * charge, works it out for the stay, and states the all-in figure, which is
 * the price plus every charge that can be counted.
 */
const copy = getDictionary("en").afterTheGate.arrival;

const declaration: ArrivalCharges = {
  caution: { minor: 5_000_000, per: "stay" },
  power: { minor: 20_000, per: "unit" },
  cleaning: { minor: 500_000, per: "night" },
  extra_guest: { none: true },
  visitor: { none: true },
};

describe("DoorTotal", () => {
  it("states each charge for the stay and the all-in figure before booking", () => {
    const html = renderToStaticMarkup(
      <DoorTotal charges={toDoorCharges(declaration, copy)} nights={3} guests={2} priceMinor={30_000_000} locale="en" copy={copy} />,
    );
    expect(html).toContain('data-testid="stay-all-in"');
    expect(html).toContain(copy.keys.caution);
    expect(html).toContain(copy.keys.cleaning);
    expect(html).toContain(copy.keys.power);
    expect(html).not.toContain(copy.keys.visitor);
    expect(html).toContain(copy.asUsed);
    expect(html).toContain(copy.returned);
    expect(html).toContain(copy.allIn);
    /* 300,000 for the nights, 50,000 caution, 3 nights of 5,000 cleaning; power is as used. */
    expect(html).toContain(formatMoney(36_500_000, "en"));
  });

  it("draws nothing when nothing is owed at the door", () => {
    const none: ArrivalCharges = {
      caution: { none: true },
      power: { none: true },
      cleaning: { none: true },
      extra_guest: { none: true },
      visitor: { none: true },
    };
    const html = renderToStaticMarkup(
      <DoorTotal charges={toDoorCharges(none, copy)} nights={2} guests={1} priceMinor={10_000_000} locale="en" copy={copy} />,
    );
    expect(html).toBe("");
  });

  it("speaks the reader's language", () => {
    const yo = getDictionary("yo").afterTheGate.arrival;
    const html = renderToStaticMarkup(
      <DoorTotal charges={toDoorCharges(declaration, yo)} nights={1} guests={1} priceMinor={1_000_000} locale="yo" copy={yo} />,
    );
    expect(html).toContain(yo.allIn);
    expect(html).not.toContain(copy.allIn);
  });
});
