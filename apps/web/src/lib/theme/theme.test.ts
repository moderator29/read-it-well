import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_THEME, THEME_BOOT_SCRIPT, parseThemeChoice, resolveTheme, serverTheme } from "./theme";
import { CHROME_COLOUR, CHROME_COLOUR_LIGHT } from "./chrome";
import { isNightDoorPath } from "./night-door";

/**
 * DARK IS THE DEFAULT FOR EVERYBODY WHO HAS NOT CHOSEN (the founder,
 * 29 September 2026: "anyone that enters our website should be on dark
 * mode"). A phone set to light does not change that; only an explicit Light
 * (or an explicit System on a light phone) paints light.
 *
 * The before-paint script is run here against a stand-in document, because it
 * is the one thing that decides the first frame and it is a string no type
 * checker reads.
 */
function boot({
  stored,
  cookie = "",
  prefersLight,
  pathname = "/",
}: {
  stored: string | null;
  cookie?: string;
  prefersLight: boolean;
  pathname?: string;
}) {
  const dataset: Record<string, string> = {};
  let colour: string | null = null;
  const document = {
    documentElement: { dataset },
    cookie,
    querySelector: () => ({ setAttribute: (_: string, value: string) => (colour = value) }),
  };
  const localStorage = { getItem: () => stored };
  const matchMedia = () => ({ matches: prefersLight });
  const window = { matchMedia };
  new Function("document", "localStorage", "matchMedia", "window", "location", THEME_BOOT_SCRIPT)(
    document,
    localStorage,
    matchMedia,
    window,
    { pathname },
  );
  return { theme: dataset.theme, choice: dataset.themeChoice, colour, door: dataset.door };
}

describe("theme default", () => {
  it("is dark", () => {
    expect(DEFAULT_THEME).toBe("dark");
    expect(parseThemeChoice(undefined)).toBe("dark");
    expect(parseThemeChoice("nonsense")).toBe("dark");
    expect(serverTheme(parseThemeChoice(undefined))).toBe("dark");
  });

  it("a first visit on a phone set to light paints dark before first paint", () => {
    expect(boot({ stored: null, prefersLight: true })).toMatchObject({ theme: "dark", choice: "dark" });
  });

  it("an explicit Light keeps Light, from storage or from the cookie", () => {
    expect(boot({ stored: "light", prefersLight: false }).theme).toBe("light");
    expect(boot({ stored: null, cookie: "nf_theme=light", prefersLight: false }).theme).toBe("light");
  });

  it("an explicit Dark stays dark on a light phone", () => {
    expect(boot({ stored: "dark", prefersLight: true }).theme).toBe("dark");
  });

  it("only an explicit System follows the phone", () => {
    expect(boot({ stored: "system", prefersLight: true }).theme).toBe("light");
    expect(resolveTheme("system", false)).toBe("dark");
    expect(resolveTheme("dark", true)).toBe("dark");
  });
});

/**
 * THE NIGHT DOORS (the founder, 30 September 2026): Get started and the
 * sign-up flow are dark whatever was chosen, before the first paint, chrome
 * included; the choice itself is kept. Sign in, forgot password and the new
 * password page follow the theme.
 */
describe("night doors before paint", () => {
  const doors = ["/sign-up", "/sign-up/verify", "/sign-up/email", "/sign-up/finish"];
  const themed = ["/", "/welcome", "/welcome/", "/sign-in", "/sign-in/code", "/forgot-password", "/reset-password", "/welcomes", "/sign-upx", "/home"];

  it("paints a door dark under an explicit Light and keeps the choice", () => {
    for (const pathname of doors) {
      expect(boot({ stored: "light", prefersLight: true, pathname })).toEqual({
        theme: "dark",
        choice: "light",
        colour: CHROME_COLOUR,
        door: "night",
      });
    }
  });

  it("leaves every other screen to the theme", () => {
    for (const pathname of themed) {
      expect(boot({ stored: "light", prefersLight: false, pathname })).toMatchObject({
        theme: "light",
        colour: CHROME_COLOUR_LIGHT,
        door: undefined,
      });
    }
  });

  it("the script and `isNightDoorPath` agree", () => {
    for (const pathname of [...doors, ...themed]) {
      expect(boot({ stored: "light", prefersLight: false, pathname }).door === "night").toBe(isNightDoorPath(pathname));
    }
  });
});

/**
 * Text size and Increase contrast apply before paint from `nf_settings`, so a
 * person who chose Large never sees the medium page reflow after hydration.
 */
function bootSettings(settings: string | null) {
  const dataset: Record<string, string> = {};
  const style: Record<string, string> = {};
  const document = {
    documentElement: { dataset, style },
    cookie: "",
    querySelector: () => null,
  };
  const localStorage = { getItem: (key: string) => (key === "nf_settings" ? settings : null) };
  const window = { matchMedia: () => ({ matches: false }) };
  new Function("document", "localStorage", "matchMedia", "window", THEME_BOOT_SCRIPT)(
    document,
    localStorage,
    window.matchMedia,
    window,
  );
  return { dataset, style };
}

describe("device settings before paint", () => {
  it("applies Large and Small to the root font size", () => {
    expect(bootSettings(JSON.stringify({ textSize: "l" }))).toMatchObject({ dataset: { textSize: "l" }, style: { fontSize: "106.25%" } });
    expect(bootSettings(JSON.stringify({ textSize: "s" }))).toMatchObject({ dataset: { textSize: "s" }, style: { fontSize: "93.75%" } });
  });

  it("leaves Medium, nothing stored and a malformed document alone", () => {
    for (const raw of [JSON.stringify({ textSize: "m" }), null, "{not json", JSON.stringify({ textSize: "xl" })]) {
      const { dataset, style } = bootSettings(raw);
      expect(dataset.textSize).toBeUndefined();
      expect(style.fontSize).toBeUndefined();
      expect(dataset.theme).toBe("dark");
    }
  });

  it("marks Increase contrast only when it is on", () => {
    expect(bootSettings(JSON.stringify({ increaseContrast: true })).dataset.contrast).toBe("more");
    expect(bootSettings(JSON.stringify({ increaseContrast: false })).dataset.contrast).toBeUndefined();
  });
});

describe("Reduce transparency before paint", () => {
  it("marks the root reduced only when it is on, as applyTransparency does", () => {
    expect(bootSettings(JSON.stringify({ reduceTransparency: true })).dataset.transparency).toBe("reduced");
    for (const raw of [JSON.stringify({ reduceTransparency: false }), JSON.stringify({ reduceTransparency: "true" }), null, "{not json"]) {
      expect(bootSettings(raw).dataset.transparency).toBeUndefined();
    }
  });

  it("writes the value a11y-prefs.css reads, alongside contrast and text size", () => {
    const { dataset, style } = bootSettings(JSON.stringify({ reduceTransparency: true, increaseContrast: true, textSize: "l" }));
    expect(dataset).toMatchObject({ transparency: "reduced", contrast: "more", textSize: "l", theme: "dark" });
    expect(style.fontSize).toBe("106.25%");
    const css = readFileSync(join(__dirname, "../../app/css/a11y-prefs.css"), "utf8");
    expect(css).toContain(`html:root[data-transparency="${dataset.transparency}"]`);
  });
});
