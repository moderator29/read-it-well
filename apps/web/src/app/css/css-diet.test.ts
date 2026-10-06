import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/*
 * C12, the CSS diet (30 September 2026). `globals.css` is loaded by every
 * page, so what it imports is paid for on every phone. These checks keep the
 * retired wallet sheet out, keep every import pointing at a real file, and
 * keep the rules the icon and design passes left behind from coming back.
 */
const APP = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(APP, "..");
const globals = readFileSync(join(APP, "globals.css"), "utf8");
const imports = [...globals.matchAll(/@import\s+"(\.\/[^"]+)"/g)].map((m) => m[1] ?? "");

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.css$/.test(e.name)) out.push(p);
  }
  return out;
}

describe("the global stylesheet (C12)", () => {
  it("no longer loads the retired wallet sheet", () => {
    expect(imports).not.toContain("./css/wallet.css");
    expect(existsSync(join(APP, "css", "wallet.css"))).toBe(false);
  });

  it("imports only files that exist", () => {
    for (const rel of imports) expect(existsSync(join(APP, rel)), rel).toBe(true);
  });

  it("keeps the admin console sheet out of the global bundle", () => {
    expect(imports).not.toContain("./css/admin.css");
  });

  /*
   * C12, second pass: the route-only sheets load from the layouts (and the
   * few components) that draw them. Each entry names every file that must
   * import the sheet, so losing an import fails here instead of quietly
   * unstyling a route. Where two sheets share an entry, the order is the old
   * cascade order and is checked too.
   */
  const ROUTE_SHEETS: Record<string, string[]> = {
    "landing.css": ["(landing)/layout.tsx", "(site)/layout.tsx"],
    "landing-rooms.css": ["(landing)/layout.tsx", "(site)/layout.tsx"],
    "public-doors.css": [
      "(landing)/layout.tsx",
      "(site)/layout.tsx",
      "join/[code]/layout.tsx",
      "email/preferences/layout.tsx",
      "(app)/settings/invite/InviteShare.tsx",
    ],
    "agent.css": [
      "agent/layout.tsx",
      "host/layout.tsx",
      "../components/agent/ApplyWizard.tsx",
      "../components/app/desk/RangeSelect.tsx",
    ],
    "stays.css": ["host/layout.tsx", "../components/app/stays/StayCategoryTiles.tsx"],
    "map.css": ["../components/app/search/MapCanvas.tsx"],
    "feed-m.css": ["(app)/layout.tsx"],
    "side-flip.css": [
      "../components/app/AppRail.tsx",
      "../components/app/SideSwitch.tsx",
      "../components/app/flip/SideCover.tsx",
      "../components/app/flip/SideFlip.tsx",
    ],
    "auth.css": [
      "(auth)/AuthFocal.tsx",
      "(auth)/AuthGround.tsx",
      "(auth)/AuthMain.tsx",
      "(auth)/KeepPillInView.tsx",
      "(auth)/error.tsx",
      "(auth)/layout.tsx",
      "(auth)/reset-password/page.tsx",
      "../components/auth/AltSignInDoors.tsx",
      "../components/auth/ArrivalMoment.tsx",
      "../components/auth/AuthChoices.tsx",
      "../components/auth/AuthScreenSkeleton.tsx",
      "../components/auth/CodeInput.tsx",
      "../components/auth/CodeSignInForm.tsx",
      "../components/auth/EmailAuthForm.tsx",
      "../components/auth/FinishSetupForm.tsx",
      "../components/auth/ForgotPasswordForm.tsx",
      "../components/auth/NativeAppleSignIn.tsx",
      "../components/auth/PasskeySignIn.tsx",
      "../components/auth/ResendClockView.tsx",
      "../components/auth/ResetCodeForm.tsx",
      "../components/auth/ResetPasswordForm.tsx",
      "../components/auth/SignUpOptions.tsx",
      "../components/auth/VerifyCodeForm.tsx",
      "../components/auth/fields.tsx",
      "../components/auth/slate.tsx",
    ],
    "home.css": [
      "(app)/home/loading.tsx",
      "(app)/stays/page.tsx",
      "../components/app/assistant/AssistantChat.tsx",
      "../components/app/assistant/AssistantSettingsSheet.tsx",
      "../components/app/assistant/AssistantSidebar.tsx",
      "../components/app/home/CategoryRow.tsx",
      "../components/app/home/CityRow.tsx",
      "../components/app/home/FeaturedBand.tsx",
      "../components/app/home/HomeFigure.tsx",
      "../components/app/home/HomeHero.tsx",
      "../components/app/home/HomeScreen.tsx",
      "../components/app/home/SpaceTypeRow.tsx",
      "../components/app/home/UpNext.tsx",
      "../components/app/stays/AreaFigure.tsx",
    ],
    "site.css": [
      "(site)/contact/page.tsx",
      "(site)/disclaimer/page.tsx",
      "(site)/eula/page.tsx",
      "(site)/privacy/page.tsx",
      "(site)/terms/page.tsx",
      "../components/site/EdgeLap.tsx",
      "../components/site/MobileMenu.tsx",
      "../components/site/NewsletterForm.tsx",
      "../components/site/SiteFooter.tsx",
      "../components/site/SiteHead.tsx",
      "../components/site/SiteHeader.tsx",
      "../components/site/SupplyPage.tsx",
      "../components/site/landing/Hero.tsx",
      "agent/dashboard/RealDashboard.tsx",
      "host/HostTodayView.tsx",
    ],
    "catalogue.css": [
      "(app)/listing/[id]/ReserveTable.tsx",
      "(app)/listing/[id]/page.tsx",
      "(app)/rent/move-in/[listingId]/MoveInLedger.tsx",
      "(app)/rent/move-in/[listingId]/page.tsx",
      "(app)/restaurant/[id]/RestaurantFace.tsx",
      "(app)/saved/SavedBoard.tsx",
      "(app)/saved/SavedCompare.tsx",
      "(app)/saved/SwipeToRemove.tsx",
      "(app)/search/page.tsx",
      "(app)/stay/[id]/StayDetailView.tsx",
      "../components/agent/ServiceQuestions.tsx",
      "../components/agent/UnitQuestions.tsx",
      "../components/app/ListingCard.tsx",
      "../components/app/around/PulseCard.tsx",
      "../components/app/assistant/AssistantChat.tsx",
      "../components/app/bookings/TenancyCard.tsx",
      "../components/app/filters/FilterDrawer.tsx",
      "../components/app/filters/FilterDrawerPanel.tsx",
      "../components/app/filters/ViewToggle.tsx",
      "../components/app/listing/CardMenu.tsx",
      "../components/app/listing/DetailAnatomy.tsx",
      "../components/app/listing/DetailGlyph.tsx",
      "../components/app/listing/ListingActions.tsx",
      "../components/app/listing/ListingAgentCard.tsx",
      "../components/app/listing/ListingAmenityTiles.tsx",
      "../components/app/listing/ListingCompound.tsx",
      "../components/app/listing/ListingGallery.tsx",
      "../components/app/listing/ListingHandoffShell.tsx",
      "../components/app/listing/ListingMoveIn.tsx",
      "../components/app/listing/ListingMoveInBlock.tsx",
      "../components/app/listing/ListingPhotoGrid.tsx",
      "../components/app/listing/ListingPurchase.tsx",
      "../components/app/listing/ListingSectionTabs.tsx",
      "../components/app/listing/ListingService.tsx",
      "../components/app/listing/ListingSpecChips.tsx",
      "../components/app/listing/ListingStickyBar.tsx",
      "../components/app/listing/PhotoViewer.tsx",
      "../components/app/listing/VerifiedAgentBadge.tsx",
      "../components/app/messages/ShowMePanel.tsx",
      "../components/app/search/CardPhotos.tsx",
      "../components/app/search/MapListPill.tsx",
      "../components/app/search/ResultSkeleton.tsx",
      "../components/app/search/ResultsFade.tsx",
      "../components/app/search/ShelfBar.tsx",
      "../components/app/search/ShelfCount.tsx",
      "../components/app/stays/StayCard.tsx",
      "../components/app/stays/StayCategoryTiles.tsx",
      "../components/app/stays/StayFilterSheet.tsx",
      "../components/app/stays/StayFilterSheetPanel.tsx",
      "../components/app/stays/StaySearchBar.tsx",
      "../components/host/FacilitiesPicker.tsx",
      "../components/host/stays/StaysParts.tsx",
      "../components/social/profile/ProfileEditor.tsx",
      "agent/list/ListingSentForReview.tsx",
      "agent/list/ListingWizard.tsx",
    ],
    "list-views.css": [
      "(app)/saved/SavedBoard.tsx",
      "(app)/saved/SavedCompare.tsx",
      "(app)/saved/SwipeToRemove.tsx",
      "(app)/search/page.tsx",
      "../components/app/ListingCard.tsx",
      "../components/app/assistant/AssistantChat.tsx",
      "../components/app/filters/ViewToggle.tsx",
      "../components/app/listing/CardMenu.tsx",
      "../components/app/listing/ListingActions.tsx",
      "../components/app/listing/ListingGallery.tsx",
      "../components/app/search/CardPhotos.tsx",
      "../components/app/search/MapListPill.tsx",
      "../components/app/search/ResultsFade.tsx",
      "../components/app/search/ShelfCount.tsx",
      "../components/app/stays/StayCard.tsx",
    ],
  };
  const importsOf = (file: string) =>
    [...readFileSync(join(APP, file), "utf8").matchAll(/import\s+"@\/app\/css\/([\w.-]+\.css)"/g)].map((m) => m[1]);

  it("keeps the route-only sheets out of the global bundle", () => {
    for (const sheet of Object.keys(ROUTE_SHEETS)) expect(imports, sheet).not.toContain(`./css/${sheet}`);
  });

  it("loads each route-only sheet from every entry that draws it", () => {
    for (const [sheet, entries] of Object.entries(ROUTE_SHEETS)) {
      for (const entry of entries) expect(importsOf(entry), `${entry} imports ${sheet}`).toContain(sheet);
    }
  });

  it("keeps the old cascade order where one entry loads several", () => {
    const inOrder = (file: string, order: string[]) => {
      const got = importsOf(file).filter((s) => s !== undefined && order.includes(s));
      expect(got, file).toEqual(order);
    };
    inOrder("(landing)/layout.tsx", ["landing.css", "landing-rooms.css", "public-doors.css"]);
    inOrder("(site)/layout.tsx", ["landing.css", "landing-rooms.css", "public-doors.css"]);
    inOrder("host/layout.tsx", ["agent.css", "catalogue.css", "stays.css"]);
    /* stays.css answers catalogue.css on its tiles and hero (it used to load
       after it, when catalogue was global), so an entry that loads both loads
       catalogue first (auditor A6). */
    inOrder("../components/app/stays/StayCategoryTiles.tsx", ["catalogue.css", "stays.css"]);
    /* list-views.css answers catalogue.css at equal specificity on `.nf-pcard`
       (it used to load after it in globals.css), so every file that draws a
       list view imports catalogue.css first. */
    for (const entry of ROUTE_SHEETS["list-views.css"] ?? []) {
      inOrder(entry, ["catalogue.css", "list-views.css"]);
    }
  });

  it("moved the six family sheets out of globals.css (the CSS diet, 6 October)", () => {
    for (const sheet of ["side-flip", "auth", "home", "site", "catalogue", "list-views"]) {
      expect(imports, sheet).not.toContain(`./css/${sheet}.css`);
      expect(readFileSync(join(APP, "css", `${sheet}.css`), "utf8"), sheet).toContain("@layer theme, base, components, utilities;");
    }
  });

  it("keeps the sheets that many routes draw in the global bundle", () => {
    /* The lock overlays every signed-in tree, a success moment can open on
       any screen, and social-feed.css carries the round back control. */
    for (const sheet of ["./css/passcode.css", "./css/success.css", "./social-feed.css"]) {
      expect(imports, sheet).toContain(sheet);
    }
  });

  it("carries none of the dead glass and tile rules", () => {
    const dead = [
      ".nf-door__mark--glass",
      ".nf-feature-glass",
      ".nf-step__glass",
      ".nf-amenity-tile__object",
      ".nf-insp-step__tile",
      ".nf-wallet-",
      ".nf-send-",
    ];
    const css = walk(SRC).map((p) => readFileSync(p, "utf8").replace(/\/\*[\s\S]*?\*\//g, ""));
    for (const sel of dead) {
      expect(css.some((c) => c.includes(sel)), sel).toBe(false);
    }
  });
});
