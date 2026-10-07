/**
 * Test-only: the product stylesheet the W6 surfaces stand on, for
 * `mountInBrowser`. The ported components' bundle (tokens, the sheet, the
 * button system, the plate) plus the glass partial the Card and Island tiers
 * live in, the settings rows, and the four sheets W6 ships. When `W6_APP_CSS`
 * names a compiled copy of `globals.css` (the screenshot run), that is used
 * instead, so a picture is drawn from the real cascade.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PORTED_CSS } from "@/components/ui/ported-test-css";

const SRC = join(__dirname, "..", "..", "..");
const read = (...parts: string[]) => readFileSync(join(SRC, ...parts), "utf8");

const compiled = process.env.W6_APP_CSS && existsSync(process.env.W6_APP_CSS) ? process.env.W6_APP_CSS : null;

export const W6_CSS = [
  compiled ? readFileSync(compiled, "utf8") : PORTED_CSS,
  ...(compiled
    ? []
    : [read("app", "css", "glass.css"), read("app", "css", "chips.css"), read("app", "settings-rows.css")]),
  read("components", "app", "account", "invite-reveal.css"),
  read("components", "app", "account", "referral.css"),
  read("components", "app", "account", "passport.css"),
  read("components", "verification", "verification-path.css"),
].join("\n");
