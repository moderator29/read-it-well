import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LOCALES, getDictionary } from "@vallo/i18n";
import { SETTINGS_DESTINATIONS } from "@/lib/settings/area";
import { SETTINGS_DEFAULTS } from "@/lib/profile/model";
import { AccessibilitySettings } from "./accessibility/AccessibilitySettings";
import { NotificationMatrix } from "./notifications/NotificationMatrix";
import { SettingsAreaNav } from "./SettingsAreaNav";

vi.mock("next/navigation", () => ({ usePathname: () => "/settings/region" }));

/**
 * THE SETTINGS SCREENS READ THE DICTIONARY (`experienceSettings`), NOT ENGLISH
 * CONSTANTS. Each island is drawn with a copy whose every string is wrapped in
 * markers; with the marked words taken out, none of the English words may be
 * left on the page. So a label that slips back in as a literal fails here.
 */
const en = getDictionary("en").experienceSettings;

function marked<T>(value: T): T {
  if (typeof value === "string") return `⟦${value}⟧` as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, marked(child)])) as T;
  }
  return value;
}

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

/** What is left of the page once every dictionary word is removed, with entities decoded. */
function leftover(html: string): string {
  return html
    .replace(/⟦[^⟧]*⟧/g, "")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

function expectNoEnglish(html: string, copy: unknown) {
  const rest = leftover(html);
  const found = strings(copy).filter((word) => word.length > 2 && rest.includes(word));
  expect(found, "English words drawn without the dictionary").toEqual([]);
}

describe("settings words come from the dictionary", () => {
  it("names every settings destination in every language, and no destination it does not have", () => {
    for (const locale of LOCALES) {
      const labels = getDictionary(locale).experienceSettings.area.destinations;
      for (const d of SETTINGS_DESTINATIONS) expect(labels[d.id], `${locale}: ${d.id}`).toMatch(/\S/);
      expect(Object.keys(labels).sort()).toEqual(SETTINGS_DESTINATIONS.map((d) => d.id).sort());
    }
  });

  it("the area navigation", () => {
    const copy = marked(en.area);
    const html = renderToStaticMarkup(
      <SettingsAreaNav copy={copy}>
        <p>page</p>
      </SettingsAreaNav>,
    );
    /* D78: settings has no pull-out menu. Everything lives on the Settings
       page itself, so the area wrapper draws only the page it holds. */
    expect(html).toBe("<p>page</p>");
    expectNoEnglish(html, en.area);
  });

  it("Accessibility", () => {
    const html = renderToStaticMarkup(<AccessibilitySettings copy={marked(en.accessibility)} />);
    expect(html).toContain(marked(en.accessibility.transparency));
    expectNoEnglish(html, en.accessibility);
  });

  it("the notification matrix, which says payments and never wallet (D48)", () => {
    const html = renderToStaticMarkup(<NotificationMatrix initial={SETTINGS_DEFAULTS.notifications} copy={marked(en.notifications)} />);
    expect(html).toContain(marked(en.notifications.rows.payments.label));
    expectNoEnglish(html, en.notifications);
    for (const locale of LOCALES) {
      expect(strings(getDictionary(locale).experienceSettings).join(" "), locale).not.toMatch(/wallet/i);
    }
  });

  it("Language and currency keeps its date slot", () => {
    for (const locale of LOCALES) {
      expect(getDictionary(locale).experienceSettings.region.datesSub, locale).toContain("{date}");
    }
  });
});
