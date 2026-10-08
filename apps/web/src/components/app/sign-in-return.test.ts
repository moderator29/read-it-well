import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { withoutComments } from "@/lib/copy/source-scan";

/**
 * A SIGN-IN LINK BRINGS THE PERSON BACK (A9, after UX-02 and Round 3's C3).
 *
 * Sign-in reads only `next`. A bare `/sign-in` from a screen that asked
 * somebody to sign in to do something (review a stay, reserve, like, comment,
 * edit a profile, open the console) lands them on the home shelf with no way
 * back to what they were doing. Every such link is built with `withNext`
 * (`lib/auth/next-link`), or `useSignInHref` in a client control that has no
 * id in hand.
 *
 * This finds any href, push, replace or redirect to a bare "/sign-in" under
 * src/app and src/components. Comments are read past: a note that records
 * the old bare link is not a link.
 */
const SRC = join(process.cwd(), "src");

/**
 * Where a bare "/sign-in" is the honest link, each with why. Nothing else may
 * carry one.
 */
const ALLOWED: { path: RegExp; why: string }[] = [
  { path: /^app\/\(auth\)\//, why: "the auth pages themselves: the door's own screens" },
  { path: /^components\/auth\//, why: "the auth flow's own controls (verify, forgot, email taken), which link back to the door itself" },
  { path: /^components\/site\/SiteHeader\.tsx$/, why: "the site header's plain Sign in, on every public page: nothing to come back to" },
  { path: /^components\/site\/MobileMenu\.tsx$/, why: "the same header door, in the phone menu" },
  { path: /^components\/site\/landing\/FinalCta\.tsx$/, why: "the landing's closing door, the header's Sign in again" },
  { path: /^app\/\(site\)\/docs\/chapters\.tsx$/, why: "the documentation naming the sign-in page in its prose" },
  { path: /^app\/s\/\[token\]\/DoorViews\.tsx$/, why: "a share link that is gone or never existed: nothing to return to" },
  { path: /^app\/\(dev\)\//, why: "previews and fixtures, never served to members" },
];

const BARE = [
  /\bhref=\{?\s*["'`]\/sign-in["'`]/g,
  /\bhref:\s*["'`]\/sign-in["'`]/g,
  /\b[a-zA-Z]+Href=\{?\s*["'`]\/sign-in["'`]/g,
  /\.(?:push|replace)\(\s*["'`]\/sign-in["'`]\s*\)/g,
  /\bredirect\(\s*["'`]\/sign-in["'`]\s*\)/g,
];

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(path, found);
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) found.push(path);
  }
  return found;
}

function bareSignIns(source: string): number[] {
  const code = withoutComments(source);
  const lines: number[] = [];
  for (const pattern of BARE) {
    for (const match of code.matchAll(pattern)) lines.push(code.slice(0, match.index).split("\n").length);
  }
  return lines.sort((a, b) => a - b);
}

describe("a sign-in link carries where the person was going", () => {
  it(
    "finds no bare /sign-in link or push outside the allowlist",
    () => {
      const files = [...sourceFiles(join(SRC, "app")), ...sourceFiles(join(SRC, "components"))];
      expect(files.length).toBeGreaterThan(500);
      const found: string[] = [];
      for (const file of files) {
        const at = relative(SRC, file).split("\\").join("/");
        if (ALLOWED.some((allow) => allow.path.test(at))) continue;
        for (const line of bareSignIns(readFileSync(file, "utf8"))) found.push(`${at}:${line}`);
      }
      expect(found).toEqual([]);
    },
    30_000,
  );

  it("sees every shape the bare link took, and reads past comments", () => {
    const shapes = [
      `<Link href="/sign-in" className="x">`,
      `<ButtonLink href={"/sign-in"} variant="primary">`,
      `action={{ href: "/sign-in", label: w.signIn }}`,
      `actions={[{ label: "Sign in", href: "/sign-in", tone: "primary" }]}`,
      `cta: { href: "/sign-in", label: s.signIn },`,
      `<RewardsState signInHref="/sign-in" />`,
      `router.push("/sign-in");`,
      `router.replace('/sign-in');`,
      `redirect("/sign-in");`,
    ];
    for (const shape of shapes) expect(bareSignIns(shape), shape).toHaveLength(1);
    for (const fine of [
      `href={withNext("/sign-in", "/settings")}`,
      `router.push(withNext("/sign-in", pathname));`,
      `/* this was href="/sign-in" */`,
      `// router.push("/sign-in") lost the thread`,
      `href="/sign-in?next=%2Fhome"`,
    ]) {
      expect(bareSignIns(fine), fine).toEqual([]);
    }
  });

  it("names a reason for every allowance, and each still matches a file", () => {
    const files = [...sourceFiles(join(SRC, "app")), ...sourceFiles(join(SRC, "components"))].map((file) =>
      relative(SRC, file).split("\\").join("/"),
    );
    for (const allow of ALLOWED) {
      expect(allow.why.length, String(allow.path)).toBeGreaterThan(20);
      expect(files.some((file) => allow.path.test(file)), String(allow.path)).toBe(true);
    }
  });
});
