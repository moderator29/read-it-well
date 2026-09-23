/**
 * THE FRONT OF THE FUNNEL, in English: the share door, the public area price
 * pages, the store readiness desk, the pasted broadcast and the board.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS ITS OWN FILE, and the reason is the one `price-check.en.ts`
 * gives: `en.ts` is five thousand lines, several builders write to it in the
 * same hour, and a namespace in a separate module costs the contested file one
 * import and one line.
 *
 * ---------------------------------------------------------------------------
 * EVERY SENTENCE HERE WILL BE READ BY A STRANGER, and most of them by a
 * stranger who has not signed in. Three rules follow.
 *
 *   No claim the code cannot prove. The door never says "verified", never
 *   says how many people looked, and never names the sharer.
 *   No address, ever. The copy talks about the area because the area is all
 *   any public artefact may carry, and it says so out loud where a person
 *   might expect more.
 *   No banned words. Nothing here says demo, sample, preview or coming soon.
 *
 * The other three locales inherit this through `withFallback`, which is the
 * honest state until a speaker translates it.
 */
export const frontDoorEn = {
  door: {
    /** The page title a tab and an unfurler read. */
    pageTitle: "A home on Vallo",
    eyebrow: "Shared from Vallo",
    signIn: "Sign in to open it on Vallo",
    signInArea: "Sign in to run your own Price Check",
    /** "₦3.2m to move in" */
    moveIn: "{amount} to move in",
    /** "Rent ₦2.5m a year" */
    rent: "Rent {amount} {period}",
    periods: { year: "a year", month: "a month", quarter: "a quarter" },
    /** "₦180m asking price" */
    salePrice: "{amount} asking price",
    /** "₦85,000 a night" */
    rate: "{amount} a night",
    askForPrice: "Ask the lister for the price once you are in",
    bedrooms: { one: "1 bedroom", other: "{count} bedrooms", studio: "Studio" },
    codeLabel: "Listing code",
    codeHint: "Type this code into Vallo search to find it again.",
    areaOnly: "A shared card shows the area and never the address.",
    example: "Example listing",
    exampleBody:
      "This is an example listing. No such property is available, and it has no price to show.",
    goneTitle: "This listing is no longer on Vallo",
    goneBody: "It has been taken down or let. Sign in to see what is on Vallo now.",
    goneAction: "Sign in to Vallo",
    missingTitle: "This link does not open anything",
    missingBody:
      "It may have been mistyped, or the person who shared it has closed it. Sign in to look for yourself.",
    unreachableTitle: "We could not open this card just now",
    unreachableBody: "Nothing is wrong with the link. Try again in a moment.",
    retry: "Try again",
    loading: "Opening the card",
    imageAlt: "A home on Vallo",
    areaEyebrow: "Vallo Price Check",
  },
  areas: {
    /** "What homes in Yaba, Lagos are asking" */
    title: "What homes in {place} are asking",
    lead: "Yearly asking rents on Vallo, by type and bedrooms. Every figure says how many listings it came from and when they were published.",
    rangeNote: "The middle half of asking rents: a quarter of listings ask less, a quarter ask more.",
    cta: "See the {count} homes in {area} on Vallo",
    ctaNote: "You will be asked to sign in first. Listings are shown inside Vallo, to members.",
    tooFew: "Not enough listings of one kind in {area} to give a range yet.",
    tooFewBody: "A range needs at least three listings of the same type and size. The count above is everything we hold here.",
    unreachable: "We could not read the figures just now. Try again in a moment.",
    holding: "{count} homes to rent in {area} on Vallo right now.",
    loading: "Reading the figures",
    metaDescription: "Asking rents for homes in {place}, from {count} listings on Vallo. Asking prices, not sold prices.",
  },
  store: {
    tab: "Store",
    title: "Store readiness",
    lede: "The checks an App Store or Play reviewer runs by hand, run here against the live platform. Each one says what it saw and, when it is not green, the one thing to do.",
    summary: "{pass} of {total} ready",
    summaryRed: "{fail} to fix before submitting",
    summaryUnknown: "{unknown} could not be run here",
    ran: "Checked just now, against {origin}",
    rerun: "Run the checks again",
    pass: "Ready",
    fail: "Fix",
    unknown: "Not run",
    fixLabel: "What to do",
    couldNotRun: "This check could not be run: {why}.",
    couldNotRunFix: "Run the checks again in a minute. If it stays unrun, the reason above is the thing to look at.",
    unavailable: "The store checks could not be run. Nothing about the platform was changed.",
    checks: {
      abuseFilter: {
        title: "Objectionable content filter (guideline 1.2)",
        pass: "The filter holds {count} terms and its pattern matches.",
        fail: "The filter holds {count} terms, or its pattern is empty, so it matches nothing.",
        fix: "Seed blocked_terms (the seed migration of 23 September does this) and confirm private.objectionable_pattern() is not null.",
      },
      reportBlock: {
        title: "Report and block (guideline 1.2)",
        pass: "A member may file a report and block an account; the database accepts both. The browser walk that proves every surface draws them is tests/report.spec.mjs.",
        fail: "A member cannot file a report or block an account: a grant or an insert policy is missing.",
        fix: "Restore INSERT on public.reports and public.blocks for authenticated, with their own-row insert policies.",
      },
      reviewer: {
        title: "The reviewer account signs in",
        pass: "The reviewer account in the store notes signed in with the password on file.",
        fail: "The reviewer account did not sign in.",
        fix: "Set STORE_REVIEWER_EMAIL and STORE_REVIEWER_PASSWORD in Vercel to the account in the store notes, and reseed it with scripts/seed/store-reviewer.mjs if the password has drifted.",
      },
      deleteAccount: {
        title: "Account deletion page (Play)",
        pass: "/delete-account answers a stranger with 200.",
        fail: "/delete-account answered a stranger with {status}.",
        fix: "Keep delete-account in PUBLIC_SEGMENTS in proxy.ts; Play requires it without signing in.",
      },
      deepLinks: {
        title: "App links and universal links",
        pass: "Both association files are real: a Team ID and both Play fingerprints.",
        fail: "The association files are not ready: {problems}.",
        fix: "Replace the placeholders in public/.well-known with the Apple Team ID and the Play app signing and upload key fingerprints, then run npm run check:deep-links.",
      },
      privacyProcessors: {
        title: "The privacy notice names every processor",
        pass: "The privacy notice names all {count} processors switched on here.",
        passNone: "No processor is switched on here, so there is nothing for the notice to name.",
        fail: "Switched on here and not named in the privacy notice: {names}.",
        fix: "Add each named processor to lib/legal/privacy.tsx with what it receives, or remove its key.",
      },
      exampleLabel: {
        title: "Examples are labelled (guideline 2.3.1)",
        pass: "No page a reviewer reaches first shows an example listing without its label.",
        fail: "The landing page shows {count} example listings without the Example label.",
        fix: "Label every example card on the landing page with Example listing, or show no listing cards there until real supply exists.",
      },
      nativeStart: {
        title: "The app never opens on the website (guideline 4.2)",
        pass: "A fresh install opens on {path}, never on the marketing page.",
        fail: "A fresh install would open on {start}, and / sent the shell to {landing}.",
        fix: "Keep appendUserAgent in capacitor.config.ts and the shell branch in /home-or-landing and the landing page (lib/native/shell.ts).",
      },
      versions: {
        title: "Native versions match",
        pass: "The web, iOS and Android versions agree.",
        fail: "The native project files are not deployed with the server, so this cannot be read here.",
        fix: "Before each submission run npm run sync:versions -- --check at the repository root.",
      },
    },
  },
  share: {
    making: "Making the link",
    failed: "We could not make a link just now. Nothing was shared, so try again in a moment.",
    copied: "Link copied",
    copyFallback: "Copy this link",
    elsewhereBody: "A card with the area and the move-in total. Never the address.",
  },
};

export type FrontDoorCopy = typeof frontDoorEn;
