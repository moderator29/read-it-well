/**
 * Locale fit, the shared controls (north star checklist point 22): Button in
 * every variant and size (with its loading ring), Chip, Segmented, StatusChip,
 * DragToConfirm and a Sheet with a title and actions, each mounted in Chromium
 * at 390px in English, Hausa, Igbo and Yorùbá from the real dictionaries, on the
 * product's real compiled cascade and its own fonts. See `fit-cases.ts` for the
 * three things held, and `lib/testing/locale-fit.ts` for how they are measured.
 *
 * Every string on screen is a string the product has: a label from `common`,
 * `nav`, `frontDoor` or `catalogue` in the locale under test (the longest real
 * button words among them, chosen below), never one written for the test.
 */
import { afterAll, beforeAll, describe, vi } from "vitest";
import { BROWSER_TEST_TIMEOUT, closeBrowser, hasBrowser, warmBrowser } from "@/lib/testing/mount-in-browser";
import { appCss } from "@/lib/testing/locale-fit";
import { fitCases } from "./fit-cases";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const CSS = () => appCss();

/* Real strings that sit on buttons, as a set: the short verbs and the long ones. */
const LABELS = `[...new Set([
  t.common.signUp, t.common.viewAll, t.common.continue, t.common.priceOnRequest,
  t.nav.exploreStays, t.nav.commercial, t.frontDoor.door.signIn, t.frontDoor.door.signInArea,
])]`;

/* The key is "<surface> <locale>"; the value is the report line. Empty until a finding is reported. */
const KNOWN: Record<string, string> = {
};

describe.skipIf(!hasBrowser && !process.env.CI)("locale fit: the shared controls at 390px", () => {
  fitCases(
    {
      name: "Button, every variant and size, full width and inline",
      imports: `import { Button } from "@/components/ui/Button";`,
      setup: `const labels = ${LABELS};
        const variants = ["primary", "secondary", "quiet", "glass", "ghost", "danger", "dangerQuiet"];
        const sizes = ["sm", "md", "lg"];`,
      body: `
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 8 }}>
          {variants.flatMap((v) => sizes.map((s) => (
            <Button key={v + s + "full"} variant={v} size={s} full>{labels[(v.length + s.length) % labels.length]}</Button>
          )))}
          {labels.map((l) => <Button key={"all" + l} variant="primary" size="md" full>{l}</Button>)}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {variants.flatMap((v) => sizes.map((s) => (
              <Button key={v + s + "inline"} variant={v} size={s}>{labels[(v.length * s.length) % labels.length]}</Button>
            )))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {labels.map((l) => <Button key={"lead" + l} variant="secondary" leadingIcon="search" trailingIcon="arrow-right">{l}</Button>)}
          </div>
        </div>`,
      css: CSS,
    },
    KNOWN,
  );

  fitCases(
    {
      name: "Button loading ring, icon buttons and the morph",
      imports: `import { Button } from "@/components/ui/Button";`,
      setup: `const labels = ${LABELS};
        const sizes = ["sm", "md", "lg"];`,
      body: `
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 8 }}>
          {sizes.flatMap((s) => labels.slice(0, 5).map((l) => (
            <Button key={"load" + s + l} variant="primary" size={s} full loading>{l}</Button>
          )))}
          {labels.map((l) => <Button key={"morph" + l} variant="primary" morph loading full>{l}</Button>)}
          {labels.map((l) => <Button key={"secload" + l} variant="secondary" loading>{l}</Button>)}
          <div style={{ display: "flex", gap: 8 }}>
            {["search", "close", "arrow-right"].map((icon) => <Button key={icon} variant="icon" round aria-label={t.common.search} leadingIcon={icon} />)}
          </div>
        </div>`,
      css: CSS,
    },
    KNOWN,
  );

  fitCases(
    {
      name: "Chip, filter, choice, link and static",
      imports: `import { Chip } from "@/components/ui/Chip";`,
      setup: `const words = [t.nav.stays, t.nav.exploreStays, t.nav.hotels, t.nav.apartments, t.nav.homes, t.nav.buy, t.nav.shortlets, t.nav.land, t.nav.commercial, t.nav.restaurants, t.nav.services, t.nav.properties, t.common.verified, t.common.instantBook];`,
      body: `
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 12 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {words.map((w, i) => <Chip key={"f" + w} behaviour="filter" selected={i % 3 === 0} icon="search">{w}</Chip>)}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {words.map((w, i) => <Chip key={"c" + w} behaviour="choice" shape="pill" selected={i % 2 === 0}>{w}</Chip>)}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {words.map((w) => <Chip key={"l" + w} behaviour="link" href="/x" chevron>{w}</Chip>)}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {words.map((w) => <Chip key={"s" + w} behaviour="static" size="sm">{w}</Chip>)}
          </div>
        </div>`,
      css: CSS,
    },
    KNOWN,
  );

  const SEGMENTED_SETUP = `
        const sets = [
          [t.nav.buy, t.nav.shortlets, t.nav.stays, t.nav.land],
          [t.catalogue.card.forRent, t.catalogue.card.forSale],
          [t.catalogue.card.perNight, t.catalogue.card.perHead, t.catalogue.card.rent],
          [t.common.search, t.common.viewAll, t.common.back, t.common.next],
        ];
        function Row({ words, shape, semantics }) {
          const options = words.map((w, i) => ({ value: "v" + i, label: w }));
          const [v, setV] = useState("v0");
          return <Segmented options={options} value={v} onChange={setV} shape={shape} semantics={semantics} full label="x" />;
        }`;

  fitCases(
    {
      name: "Segmented, pill shape, tabs and radio",
      imports: `import { useState } from "react";\nimport { Segmented } from "@/components/ui/Segmented";`,
      setup: SEGMENTED_SETUP,
      body: `
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 12 }}>
          {sets.flatMap((words, i) => [
            <Row key={"b" + i} words={words} shape="pill" semantics="tabs" />,
            <Row key={"d" + i} words={words} shape="pill" semantics="radio" />,
          ])}
        </div>`,
      css: CSS,
    },
    KNOWN,
  );

  fitCases(
    {
      name: "Segmented, control shape, tabs and radio",
      imports: `import { useState } from "react";\nimport { Segmented } from "@/components/ui/Segmented";`,
      setup: SEGMENTED_SETUP,
      body: `
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 12 }}>
          {sets.flatMap((words, i) => [
            <Row key={"a" + i} words={words} shape="control" semantics="tabs" />,
            <Row key={"c" + i} words={words} shape="control" semantics="radio" />,
          ])}
        </div>`,
      css: CSS,
    },
    KNOWN,
  );

  fitCases(
    {
      name: "StatusChip, every state",
      imports: `import { StatusChip } from "@/components/ui/StatusChip";`,
      setup: `const states = ["success", "pending", "failed", "protected", "disputed", "neutral"];
        const words = [t.common.verified, t.common.instantBook, t.common.priceOnRequest, t.common.notSet, t.catalogue.card.forSale, t.catalogue.card.moveIn];`,
      body: `
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {states.flatMap((s) => words.map((w) => <StatusChip key={s + w} state={s} size="md">{w}</StatusChip>))}
        </div>`,
      css: CSS,
    },
    KNOWN,
  );

  fitCases(
    {
      name: "DragToConfirm, rest, brand and danger",
      imports: `import { DragToConfirm } from "@/components/ui/DragToConfirm";`,
      body: `
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 12 }}>
          {["brand", "danger"].map((tone) => (
            <DragToConfirm key={tone} tone={tone} label={t.experienceUi.slideToConfirm} keyboardLabel={t.common.continue}
              confirmingLabel={t.experienceUi.confirming} confirmedLabel={t.experienceUi.confirmed}
              errorLabel={t.experienceUi.stop} onConfirm={() => true} />
          ))}
          <DragToConfirm money label={t.frontDoor.door.signInArea} keyboardLabel={t.common.continue}
            confirmingLabel={t.experienceUi.confirming} confirmedLabel={t.experienceUi.confirmed} onConfirm={() => true} />
        </div>`,
      css: CSS,
    },
    KNOWN,
  );

  fitCases(
    {
      name: "Sheet with a title, body and actions",
      imports: `import { Sheet } from "@/components/ui/Sheet";\nimport { Button } from "@/components/ui/Button";`,
      body: `
        <Sheet open onOpenChange={() => {}} title={t.catalogue.filters.trust} closeLabel={t.common.back}
          reset={{ label: t.catalogue.filters.reset, onClick() {} }} apply={{ label: t.catalogue.filters.apply.replace(" ({count})", ""), onClick() {} }}>
          <ul style={{ display: "grid", gap: 8 }}>
            {[t.catalogue.filters.water, t.catalogue.filters.verifiedOnly, t.catalogue.filters.locationPlaceholder, t.catalogue.filters.sortBy, t.catalogue.filters.noUpperLimit, t.catalogue.filters.location, t.catalogue.filters.bandA].map((w) => <li key={w}><Button variant="secondary" full>{w}</Button></li>)}
          </ul>
        </Sheet>`,
      css: CSS,
      scope: "body",
      before: async (page) => {
        await page.getByRole("dialog").waitFor();
      },
    },
    KNOWN,
  );
});
