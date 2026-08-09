import type { ReactNode } from "react";
import Link from "next/link";
import { formatMoney } from "@naijafinds/i18n";
import type { BrandIconName } from "@/design-system/icons/BrandIcon";
import { SUPPORT_HREF, SUPPORT_LABEL } from "@/lib/support-email";
import { FULL_REFUND_HOURS } from "@/lib/trust/cancellation";
import { VERIFICATION_ORDER } from "@/lib/trust/verification";
import { MAX_MOVE_KOBO, MIN_MOVE_KOBO } from "@/lib/wallet/schema";
import { MAX_BLOCK_NIGHTS } from "@/lib/agent/calendar-schema";
import { EDIT_WINDOW_MINUTES, POST_MAX, POST_MEDIA_MAX } from "@/lib/social/posts-schema";
import { MODERATOR_CAN, MODERATOR_CANNOT } from "@/lib/social/areas-schema";
import { REPORT_CATEGORY_COPY, REPORT_CATEGORY_ORDER } from "@/lib/reports/schema";

/**
 * The documentation, as data.
 *
 * Every chapter, every heading and every paragraph lives in this one array, so
 * the sidebar, the table of contents, the "on this page" rail, the prev and
 * next links and the pages themselves are all reading the same list. A
 * documentation site whose navigation is written separately from its content is
 * a site that will tell somebody a chapter exists and then hand them a 404.
 *
 * Numbers that already exist in the product are IMPORTED rather than typed out:
 * the wallet's movement bounds, the refund window, the verification ladder, the
 * report categories, the post limits and what a place moderator may do. If any
 * of those change, this document changes with them in the same commit. A
 * figure typed into prose is a figure that starts lying the first time somebody
 * edits the code beside it.
 *
 * Nothing here describes a feature that does not exist. Every screen named is a
 * real route, every rule stated is enforced somewhere in `apps/web/src/lib` or
 * in a migration under `supabase/migrations`.
 */

export type DocSection = {
  /** Anchor id. Stable, because people link to headings. */
  id: string;
  heading: string;
  body: ReactNode;
};

export type DocChapter = {
  slug: string;
  /** Its place in the reading order, 1 upwards. */
  number: number;
  title: string;
  /** One line, used on the card, in the sidebar tooltip and as the meta description. */
  summary: string;
  icon: BrandIconName;
  sections: DocSection[];
};

/** How a link inside the prose is drawn. One class, every chapter. */
const A = "font-semibold text-[var(--nf-content-link)] hover:underline";

const MIN_MOVE = formatMoney(MIN_MOVE_KOBO);
const MAX_MOVE = formatMoney(MAX_MOVE_KOBO);

export const CHAPTERS: DocChapter[] = [
  /* ------------------------------------------------------------------ 1 */
  {
    slug: "what-rentme-is",
    number: 1,
    title: "What RentMe is, and who it is for",
    summary:
      "A Nigeria-first platform for finding somewhere, booking it, paying for it and talking about it, with no platform fee anywhere.",
    icon: "house-sparkle",
    sections: [
      {
        id: "the-short-version",
        heading: "The short version",
        body: (
          <>
            <p>
              RentMe is a Nigerian platform for finding a place and getting into it.
              Shortlets, hotels, apartments, homes, villas, restaurants, experiences,
              annual rentals, shops, offices and land all sit in one catalogue, and the
              same account carries your bookings, your money, your messages and your
              conversations about the areas you live in.
            </p>
            <p>
              It is built for how renting and staying actually works here. That means
              three questions come before the price: is there light, is there water,
              and will the gate let you in. Those are structured facts on a listing,
              not a tick box called Backup Power, and you can filter on them.
            </p>
          </>
        ),
      },
      {
        id: "what-you-can-do",
        heading: "What you can do here",
        body: (
          <ul>
            <li>
              <strong>Find somewhere.</strong> Search by city or area, filter by budget,
              rooms, guests, amenities, power and water, then look at the results as a
              list or on a map.
            </li>
            <li>
              <strong>Book and pay.</strong> Hold your dates, see the whole price in
              naira before you commit, and pay by card or from your wallet.
            </li>
            <li>
              <strong>Keep your money in one place.</strong> Fund a wallet, withdraw to
              a Nigerian bank account, send money to another RentMe account, and read
              every movement in a statement that cannot be edited.
            </li>
            <li>
              <strong>Talk to the agent.</strong> Ask about the road, the generator or
              the landlord before you commit anything, inside the platform where the
              conversation is on record.
            </li>
            <li>
              <strong>Join your place.</strong> Around is a layer of places rather than
              strangers: your local government, your estate, your campus, and what
              people there are saying today.
            </li>
            <li>
              <strong>List a property.</strong> Apply as an agent, get verified,
              publish, manage a calendar and get paid.
            </li>
          </ul>
        ),
      },
      {
        id: "who-it-is-for",
        heading: "Who it is for",
        body: (
          <>
            <p>
              <strong>Guests and tenants.</strong> Someone looking for two nights in
              Lekki, a month in Wuse, or a year in Yaba. The rent market works
              differently from a shortlet, and the product says so: an annual tenancy is
              message the agent, inspect the property, then pay. There is no Reserve
              button on a rental, by design.
            </p>
            <p>
              <strong>Agents and hosts.</strong> Independent agents, estate managers and
              property owners who want their stock in front of people without paying to
              be there.
            </p>
            <p>
              <strong>People who live somewhere.</strong> You do not have to be booking
              anything to use Around. It is worth opening on a Tuesday to find out
              whether the light is on in your area.
            </p>
          </>
        ),
      },
      {
        id: "no-fees",
        heading: "The platform charges nothing",
        body: (
          <>
            <p>
              RentMe takes no fee. Not to look, not to book, not to list, not to be
              paid. The total on a booking is the nightly rate multiplied by the nights
              plus a cleaning charge if the host sets one. There is no service fee, no
              booking fee, no listing fee and no commission taken out of what a guest
              pays an agent.
            </p>
            <p>
              This is not a promotion with an end date. It is how the ledger is built:
              every settled charge is split into the agent share, the payment processor
              charge and the platform share, and the platform share is zero. If a card
              processor charges for moving money, that is named as the processor
              charge, because it is theirs.
            </p>
            <p>
              So if anybody presents an agency fee, an inspection fee, a holding fee or
              a caution fee as a RentMe charge, they are lying to you. Read{" "}
              <Link href="/docs/trust-and-safety" className={A}>
                Trust and safety
              </Link>{" "}
              and report them.
            </p>
          </>
        ),
      },
      {
        id: "how-it-is-laid-out",
        heading: "How the product is laid out",
        body: (
          <>
            <p>Three surfaces, one account.</p>
            <ul>
              <li>
                <strong>The platform.</strong> Home, Search, Around, Saved, Bookings,
                Wallet, Inbox, Notifications, your profile and Settings.
              </li>
              <li>
                <strong>Agent Mode.</strong> A separate workspace at{" "}
                <code>/agent</code> for listings, the calendar, bookings, earnings,
                reviews and verification. You switch into it once your application is
                approved.
              </li>
              <li>
                <strong>The public site.</strong> The pages you are reading now, plus{" "}
                <Link href="/help" className={A}>
                  the help centre
                </Link>
                ,{" "}
                <Link href="/safety" className={A}>
                  safety
                </Link>
                ,{" "}
                <Link href="/standards" className={A}>
                  standards
                </Link>{" "}
                and{" "}
                <Link href="/cancellations" className={A}>
                  cancellations
                </Link>
                .
              </li>
            </ul>
            <p>
              The product works in English, Yorùbá, Hausa and Igbo, and the switcher is
              in the header on every public page and in Settings inside the platform.
              Dark is the default theme and stays dark unless you choose otherwise in
              Settings, whatever your phone is set to.
            </p>
          </>
        ),
      },
    ],
  },

  /* ------------------------------------------------------------------ 2 */
  {
    slug: "getting-started",
    number: 2,
    title: "Getting started",
    summary:
      "Creating an account, signing in with email or Google, and filling in the profile the rest of the product reads.",
    icon: "user-check",
    sections: [
      {
        id: "creating-an-account",
        heading: "Creating an account",
        body: (
          <>
            <p>
              Go to{" "}
              <Link href="/sign-up" className={A}>
                Sign up
              </Link>
              . You are offered the ways in that are actually switched on, and nothing
              else: a button for a provider that is not connected would send you to an
              error page, so it is not shown.
            </p>
            <ul>
              <li>
                <strong>Email and password.</strong> Your name, email and a password.
                We send a confirmation email; open it and the account is live.
              </li>
              <li>
                <strong>Google.</strong> One tap, and you come back signed in. Apple is
                wired the same way and appears when it is enabled.
              </li>
            </ul>
            <p>
              An account is free and takes about a minute. You need one to book, to hold
              money, to message an agent and to post in a place, because all four of
              those have to belong to somebody.
            </p>
            <p>You must be at least 18 to hold an account.</p>
          </>
        ),
      },
      {
        id: "signing-in",
        heading: "Signing in, and getting back in",
        body: (
          <>
            <p>
              <Link href="/sign-in" className={A}>
                Sign in
              </Link>{" "}
              takes the same two routes. If you signed up with Google, keep using
              Google: it is the same account either way, keyed on your email address.
            </p>
            <p>
              Forgotten your password? Use{" "}
              <Link href="/forgot-password" className={A}>
                Forgot password
              </Link>{" "}
              and we email a reset link. A link that has expired or has already been
              used says so in plain words on the sign-in screen rather than dropping you
              on an empty form.
            </p>
            <p>
              If you tap something that needs an account while signed out, you are sent
              to sign in with a line saying why, and back to where you were going once
              you are in.
            </p>
          </>
        ),
      },
      {
        id: "your-profile",
        heading: "Your profile",
        body: (
          <>
            <p>
              <Link href="/profile" className={A}>
                Your account
              </Link>{" "}
              is where your details live and where everything you have on the platform
              is linked from: bookings, saved places, reviews, wallet, inbox and
              notifications.
            </p>
            <ul>
              <li>
                <strong>Your details.</strong> First name, surname, a nickname if you
                want one, phone number and a photograph.
              </li>
              <li>
                <strong>Where you are.</strong> A state and a local government, chosen
                from the real list of 36 states, the Federal Capital Territory and all
                774 local governments. This is what lets Around open the right door for
                you.
              </li>
              <li>
                <strong>What you do.</strong> An occupation, from a fixed list.
              </li>
              <li>
                <strong>What you came for.</strong> Interests, set in{" "}
                <Link href="/settings/interests" className={A}>
                  Settings
                </Link>
                , which shape what Home puts in front of you.
              </li>
            </ul>
          </>
        ),
      },
      {
        id: "your-handle",
        heading: "Your handle and your public page",
        body: (
          <>
            <p>
              A handle is your address on RentMe. Claim one and your public page lives at{" "}
              <code>/u/your-handle</code>: your name, your area, your occupation, any
              standing you have earned, and tabs for what you have posted, replied to
              and shared. An agent gets a Properties tab and a Reviews tab instead.
            </p>
            <p>
              Handles are lowercase letters, digits and underscores, three to twenty
              characters, starting with a letter. A handle nobody has taken is not a
              dead page: it says the address is free and offers it to you.
            </p>
            <p>
              What appears there is your choice. Settings has a switch called Hide my
              activity that keeps your reviews and recent stays off the public page.
            </p>
          </>
        ),
      },
      {
        id: "settings",
        heading: "Settings worth knowing about",
        body: (
          <>
            <ul>
              <li>
                <strong>Appearance.</strong> Dark or light. Dark is the default and the
                phone does not override it.
              </li>
              <li>
                <strong>Language.</strong> English, Yorùbá, Hausa or Igbo, remembered on
                your device.
              </li>
              <li>
                <strong>Notifications.</strong> Four switches: bookings, messages,
                wallet, and ideas and offers. Marketing is off until you turn it on.
              </li>
              <li>
                <strong>Privacy.</strong> Hide my activity, and Data saver for lighter
                images on a slow connection.
              </li>
              <li>
                <strong>Security.</strong> Change your password and sign out.
              </li>
              <li>
                <strong>Your data.</strong> Ask for a copy, or delete the account. See{" "}
                <Link href="/docs/your-data-and-your-rights" className={A}>
                  Your data and your rights
                </Link>
                .
              </li>
            </ul>
            <p>
              Preferences kept on your device stay on your device. Account preferences
              are stored against your row and protected with row level security, so only
              you can read or change them.
            </p>
          </>
        ),
      },
    ],
  },

  /* ------------------------------------------------------------------ 3 */
  {
    slug: "finding-a-place",
    number: 3,
    title: "Finding a place",
    summary:
      "Search, the filters including power and water, the map, saving a shortlist, and sharing a search by its link.",
    icon: "home-search",
    sections: [
      {
        id: "searching",
        heading: "Searching",
        body: (
          <>
            <p>
              Search lives at{" "}
              <Link href="/search" className={A}>
                /search
              </Link>{" "}
              and is reachable from the field on Home and from the bottom bar. Type a
              city, an area or the kind of place you want.
            </p>
            <p>
              The category tiles across the top narrow the catalogue to one kind: hotels,
              apartments, homes, shortlets, villas, restaurants, experiences, rentals,
              shops, offices or land. The result count names the category honestly, so
              you get plots rather than results.
            </p>
            <p>
              Sorting is Recommended, Top rated, Price low to high, or Price high to low.
            </p>
          </>
        ),
      },
      {
        id: "filters",
        heading: "The filters",
        body: (
          <>
            <p>Open Filters and set as many as you want. The drawer counts what you have switched on.</p>
            <ul>
              <li>
                <strong>Budget.</strong> A minimum, a maximum, or both, typed in whole
                naira. Type them the wrong way round and they are swapped rather than
                returning nothing.
              </li>
              <li>
                <strong>Bedrooms and bathrooms.</strong> A minimum of each.
              </li>
              <li>
                <strong>Guests.</strong> The party the place must take.
              </li>
              <li>
                <strong>Amenities.</strong> Wi-Fi, air conditioning, TV, kitchen,
                parking, swimming pool, gym, security, lift, furnished, balcony, garden,
                laundry, backup power, running water, hot shower, breakfast, workspace.
                Every one you tick must be present.
              </li>
              <li>
                <strong>Instant book.</strong> Only places you can book without waiting
                for the host to accept.
              </li>
              <li>
                <strong>Verified only.</strong> Only first-party stock we have checked.
                See{" "}
                <Link href="/docs/understanding-a-listing" className={A}>
                  Understanding a listing
                </Link>
                .
              </li>
            </ul>
          </>
        ),
      },
      {
        id: "power-and-water",
        heading: "Light and water, which nobody else filters on",
        body: (
          <>
            <p>
              These two are the reason search here is different, and they behave
              differently from each other on purpose.
            </p>
            <p>
              <strong>Power is a requirement, so the filters combine with AND.</strong>{" "}
              There are two of them: <em>Backup power</em>, meaning the host has a
              generator, an inverter or solar, and <em>Band A</em>, meaning the address
              sits on a Band A feeder. A place can have both, so asking for both means
              both.
            </p>
            <p>
              <strong>Water is a source, so the filters combine with OR.</strong> Treated
              mains, borehole, pumped storage, tanker delivery. Water comes from one
              place, so ticking borehole and treated mains means either will do. As an
              AND it would match nothing at all, every single time, which is a trap
              rather than a filter.
            </p>
            <p>
              A host who has not answered is not counted as a yes. Silence about the
              light is shown as silence, and the filter leaves that listing out.
            </p>
          </>
        ),
      },
      {
        id: "the-map",
        heading: "The map",
        body: (
          <>
            <p>
              Switch between List and Map with the toggle beside the sort control. The
              map draws the same results your filters produced, priced in naira on each
              pin, with nearby pins clustered until you zoom in. Tap a pin to open the
              card, tap the card to open the listing.
            </p>
            <p>
              The map follows your theme, so it is dark at night and paper in daylight,
              and the view you last chose is remembered for your next search.
            </p>
          </>
        ),
      },
      {
        id: "saving",
        heading: "Saving a shortlist",
        body: (
          <>
            <p>
              Tap the heart on any card or listing to save it.{" "}
              <Link href="/saved" className={A}>
                Saved
              </Link>{" "}
              is your shortlist, newest first, with the same cards search uses so a place
              looks the same wherever you meet it.
            </p>
            <p>
              Hearts work before you sign in: they are kept on your device and carried
              onto your account the moment you do, so nothing you tapped is quietly
              dropped. Unsaving offers an undo.
            </p>
          </>
        ),
      },
      {
        id: "sharing-a-search",
        heading: "Sharing a search",
        body: (
          <>
            <p>
              The address bar is the search. Every control writes to it and nothing else,
              so a filtered hunt can be copied to a friend on WhatsApp, opened on a
              laptop, bookmarked, and walked backwards with the browser back button.
            </p>
            <p>
              The parameters read as English:{" "}
              <code>?q=lekki&amp;type=shortlet&amp;power=backup&amp;water=borehole</code>{" "}
              is a shortlet in Lekki with backup power and a borehole. An address with
              rubbish in it renders the unfiltered page rather than an error.
            </p>
          </>
        ),
      },
    ],
  },

  /* ------------------------------------------------------------------ 4 */
  {
    slug: "understanding-a-listing",
    number: 4,
    title: "Understanding a listing",
    summary:
      "The badges, verified against partner stock, what the light and water rows really say, and how the gate details reach you.",
    icon: "listing-review",
    sections: [
      {
        id: "the-page",
        heading: "What is on the page",
        body: (
          <>
            <p>
              A listing opens with its photographs, then the title, the area and city, the
              price, and the rows that matter: rooms, guests, amenities, light and water,
              the gate, the host, the reviews and the map.
            </p>
            <p>
              Tap any photograph to open the viewer and go through the set full screen.
              Everything below is written by the agent and checked before the listing
              goes live.
            </p>
          </>
        ),
      },
      {
        id: "badges",
        heading: "What the badges mean",
        body: (
          <ul>
            <li>
              <strong>Verified.</strong> The agent behind this listing passed identity
              verification and the listing itself was reviewed before publishing. It is
              the strongest thing a listing can say about itself here.
            </li>
            <li>
              <strong>Instant.</strong> You can book without waiting for the host to
              accept. Without it, the host has to accept your request first.
            </li>
            <li>
              <strong>Powered by Google</strong>, or a hotel that books with a partner.
              That is third-party stock. It comes from an outside inventory provider so
              the catalogue is not empty in a city we have not filled yet.
            </li>
          </ul>
        ),
      },
      {
        id: "verified-vs-partner",
        heading: "Verified against partner stock",
        body: (
          <>
            <p>
              These two never overlap, and the rule is absolute:{" "}
              <strong>only first-party inventory can carry the verified badge.</strong>{" "}
              A partner listing is never verified, whatever the partner says about it,
              because we have not met that agent, checked that identity or reviewed that
              property.
            </p>
            <p>
              Partner listings also do not book on RentMe. A partner hotel opens the
              partner to book; a partner restaurant gives you directions and the venue,
              because we do not take restaurant reservations for venues that are not
              ours. Nothing about a partner listing touches your wallet.
            </p>
            <p>
              If you only want stock we stand behind, use the <em>Verified only</em>{" "}
              filter in search.
            </p>
          </>
        ),
      },
      {
        id: "light",
        heading: "Light",
        body: (
          <>
            <p>
              Power is two separate facts, because one number cannot hold both. Band A
              with no backup and rarely on with a generator running all day are opposite
              places, and a single tick box would flatten them into the same claim.
            </p>
            <p>
              <strong>What the grid gives this address.</strong> One of: Band A, twenty
              hours a day or more. Mostly on, light most of the day with gaps. Patchy, on
              and off through the day. Rarely on, a few hours at best. No grid supply,
              nothing from the distribution company.
            </p>
            <p>
              <strong>What the host does about it.</strong> No backup, a generator, an
              inverter, solar, or a generator and inverter together. Where there is a
              backup, the host states how many hours a day it actually runs, which is
              the number that decides whether the place is livable in a bad week.
            </p>
            <p>
              The row also says whether the unit is on a prepaid meter, which decides
              whether you can be asked to buy units.
            </p>
            <p>
              <strong>Unanswered is shown as unanswered.</strong> A host who has not said
              whether there is light does not get silence read as good news. Where the
              answer is missing, the listing says so and points you at the one control
              that gets a real answer: message the agent.
            </p>
          </>
        ),
      },
      {
        id: "water",
        heading: "Water",
        body: (
          <>
            <p>One closed list, because four spellings of borehole cannot be filtered on:</p>
            <ul>
              <li>
                <strong>Treated mains.</strong> Running water from the mains.
              </li>
              <li>
                <strong>Borehole.</strong> The property has its own.
              </li>
              <li>
                <strong>Pumped storage.</strong> A tank filled and pumped through.
              </li>
              <li>
                <strong>Tanker delivery.</strong> Water is bought in and stored.
              </li>
              <li>
                <strong>No running water.</strong> Water is fetched.
              </li>
            </ul>
            <p>
              These are genuinely different daily experiences, and everybody here knows
              which one they are looking at.
            </p>
          </>
        ),
      },
      {
        id: "the-gate",
        heading: "Getting through the gate",
        body: (
          <>
            <p>
              Estate name, gate directions, the security post number and any access code
              are the difference between arriving and standing outside at eleven at
              night. They are also exactly the details that must never be public.
            </p>
            <p>
              So they are not on the listing. A published listing is readable by the whole
              internet, and a gate code stored on it would be a gate code published. They
              live in their own place with their own rule: the host can see them, an
              administrator can see them, and a guest holding a confirmed booking on that
              listing can see them. Nobody else, ever.
            </p>
            <p>
              Before you book, the page tells you the estate has a gate and that the
              details arrive when the booking is confirmed. The moment it is confirmed,
              the real details appear on the same listing and on your booking. A listing
              with no gate simply does not show the block at all.
            </p>
          </>
        ),
      },
      {
        id: "rent-listings",
        heading: "Rental listings work differently",
        body: (
          <>
            <p>
              An annual tenancy is not lodging, so there is no Reserve button on one. The
              path is message the agent, inspect the property, then pay, and every step
              stays inside the platform where it can be protected.
            </p>
            <p>
              The rent market has its own front door at{" "}
              <Link href="/rent" className={A}>
                /rent
              </Link>
              . Never hand over cash at an inspection, and never pay into an account
              number somebody sends you. Read{" "}
              <Link href="/docs/trust-and-safety" className={A}>
                Trust and safety
              </Link>{" "}
              before you go and look at anything.
            </p>
          </>
        ),
      },
    ],
  },

  /* ------------------------------------------------------------------ 5 */
  {
    slug: "booking-and-paying",
    number: 5,
    title: "Booking and paying",
    summary:
      "Reserving holds your dates, the price breakdown shows everything, and you pay by card or from your wallet.",
    icon: "calendar-check",
    sections: [
      {
        id: "reserve-and-hold",
        heading: "Reserve, and what the hold does",
        body: (
          <>
            <p>
              Pick your dates and your party, then tap Reserve. That writes a pending
              booking and holds those nights on the calendar so nobody else can take them
              while you decide.
            </p>
            <p>
              <strong>The hold lasts 48 hours and costs nothing.</strong> Nothing has
              been taken from you, no card has been touched, and you can let it go at any
              hour for nothing. If you do nothing, the hold releases itself and the
              nights reopen, without touching a night the agent had closed by hand.
            </p>
            <p>
              If somebody pays for those exact nights a moment before you, the database
              refuses the overlap and you are told the dates were just taken. Two people
              cannot hold the same night here.
            </p>
          </>
        ),
      },
      {
        id: "who-is-arriving",
        heading: "Who is arriving",
        body: (
          <p>
            The person paying is often not the person staying: a sister in London pays for
            a cousin flying into Lagos. You can name the guest who will arrive, with their
            phone number, and that is what the host and the gate get. Leave it blank and
            the booking is simply yours.
          </p>
        ),
      },
      {
        id: "the-rules-that-refuse",
        heading: "Why a reservation is sometimes refused",
        body: (
          <ul>
            <li>
              <strong>Minimum stay.</strong> If the host takes bookings of three nights or
              more, a two-night request is refused, and the message names the number so
              you know which way to move.
            </li>
            <li>
              <strong>Party size.</strong> A place that takes four guests refuses a party
              of eight, on the same principle, at the moment you reserve rather than at
              the gate.
            </li>
            <li>
              <strong>Dates already taken.</strong> Pick different dates.
            </li>
          </ul>
        ),
      },
      {
        id: "the-price-breakdown",
        heading: "The price breakdown",
        body: (
          <>
            <p>Checkout shows every line that makes up the total, in naira:</p>
            <ul>
              <li>
                <strong>The nightly rate multiplied by the nights.</strong> Written out,
                so you can check the arithmetic.
              </li>
              <li>
                <strong>Cleaning</strong>, only when the host charges for it.
              </li>
              <li>
                <strong>The total.</strong> Nothing hidden inside it.
              </li>
            </ul>
            <p>
              There is no platform line, because the platform takes nothing. The amount
              you are charged is the amount stored on the booking, worked out from the
              price on the listing at the moment you reserved. It is never taken from
              your browser, so it cannot be edited on the way through, and the price
              cannot move under you between reserving and paying.
            </p>
          </>
        ),
      },
      {
        id: "paying",
        heading: "Paying by card or from your wallet",
        body: (
          <>
            <p>
              <strong>Card.</strong> You are taken to a hosted checkout run by a licensed
              Nigerian payment processor, where you pay with a Nigerian debit card or a
              bank transfer the processor raises. We never see or store your full card
              number. Your booking carries a payment reference from the moment you start,
              so support can trace it if anything goes wrong.
            </p>
            <p>
              <strong>Wallet.</strong> If your balance covers the total, pay in one tap.
              That single action debits the wallet, records the payment, writes the
              ledger row, confirms the booking, and closes the nights, all in one
              database transaction. It either all happens or none of it does, because a
              half-paid booking is the worst state this platform could hold.
            </p>
            <p>
              Tap twice on a bad connection and you are not charged twice. Each attempt
              carries a key, and a retry replays the first answer instead of taking your
              money again.
            </p>
          </>
        ),
      },
      {
        id: "instant-and-requests",
        heading: "Instant book against a request",
        body: (
          <>
            <p>
              A listing marked <em>Instant</em> is payable straight away. Everything else
              is a request: you reserve, the host sees it in their bookings console, and
              they accept or decline.
            </p>
            <p>
              Once a host accepts, the stay is payable. Open it from{" "}
              <Link href="/bookings" className={A}>
                Bookings
              </Link>{" "}
              and pay by card or wallet exactly as above. A stay a host has accepted is
              not paid until you pay it, and the product says so plainly rather than
              telling you it is settled when the host has received nothing.
            </p>
          </>
        ),
      },
      {
        id: "confirmation",
        heading: "Confirmation",
        body: (
          <>
            <p>Once the payment settles:</p>
            <ul>
              <li>The booking moves to confirmed and the nights are closed for good.</li>
              <li>
                The gate details unlock on the listing and on your booking: estate,
                directions, security number, any access code.
              </li>
              <li>You get a notification, and an email with the booking on it.</li>
              <li>The host is told somebody is coming, and who.</li>
            </ul>
            <p>
              Everything after that lives under{" "}
              <Link href="/bookings" className={A}>
                Bookings
              </Link>
              : the dates, the address, the price you paid and the reference.
            </p>
          </>
        ),
      },
      {
        id: "cancelling",
        heading: "Cancelling, and what comes back",
        body: (
          <>
            <p>
              One schedule governs every stay on the platform, and it is written out at{" "}
              <Link href="/cancellations" className={A}>
                Cancellations
              </Link>
              .
            </p>
            <ul>
              <li>
                <strong>More than {FULL_REFUND_HOURS} hours before check-in:</strong>{" "}
                everything back.
              </li>
              <li>
                <strong>Inside that window:</strong> half back. The other half stays with
                the host, whose nights are now very hard to re-let.
              </li>
              <li>
                <strong>From check-in day onwards:</strong> the stay is the host&apos;s.
              </li>
            </ul>
            <p>
              If the host cancels, or the property was materially not what was listed, you
              get everything back whenever it happens. Refunds land in your RentMe wallet,
              usually within minutes, and you move them to your bank from there.
            </p>
            <p>
              An unpaid hold is different again: let it go whenever you like, for nothing.
            </p>
          </>
        ),
      },
      {
        id: "after-the-stay",
        heading: "After the stay",
        body: (
          <p>
            When a stay is finished you can review it: a rating and what it was actually
            like. The agent can reply once, publicly. Reviews are attached to real
            completed bookings, which is why the ratings on this platform are worth
            reading.
          </p>
        ),
      },
    ],
  },

  /* ------------------------------------------------------------------ 6 */
  {
    slug: "your-wallet",
    number: 6,
    title: "Your wallet",
    summary:
      "Funding, withdrawing to a Nigerian bank, sending money to another account, the statement, and what the platform charges: nothing.",
    icon: "wallet-secure",
    sections: [
      {
        id: "what-it-is",
        heading: "What the wallet is",
        body: (
          <>
            <p>
              <Link href="/wallet" className={A}>
                Your wallet
              </Link>{" "}
              is a naira balance held against your account. Refunds land here, you can pay
              for a stay from here in one tap, and you can move money to a Nigerian bank
              account whenever you want.
            </p>
            <p>
              The balance is not a number somebody stores and edits. It is derived from a
              statement of movements that can only be added to, so the figure at the top
              of the page and the rows underneath it can never disagree with each other.
              Every amount is held as whole kobo, so nothing is ever lost to rounding.
            </p>
          </>
        ),
      },
      {
        id: "adding-money",
        heading: "Adding money",
        body: (
          <>
            <p>
              Tap <strong>Add money</strong>, type the amount in naira, and you are taken
              to the payment processor to pay by card or bank transfer. When you come
              back, the credit is posted against a reference beginning{" "}
              <code>rm-fund-</code>.
            </p>
            <p>
              If the processor tells us before your browser gets back, or your browser
              gets back before the processor tells us, the credit still posts exactly
              once. It is keyed on the reference, so whichever arrives first wins and the
              second changes nothing.
            </p>
          </>
        ),
      },
      {
        id: "withdrawing",
        heading: "Withdrawing to your bank",
        body: (
          <>
            <p>
              Tap <strong>Withdraw</strong>, choose your bank, enter the account number
              and the amount. The account must be a Nigerian account in your own name.
            </p>
            <p>
              A withdrawal is held while it settles, and the amount is taken out of what
              you can spend the moment you request it, so money already on its way to your
              bank can never be spent again on a stay. References begin{" "}
              <code>rm-wd-</code>.
            </p>
          </>
        ),
      },
      {
        id: "transfers",
        heading: "Sending money to another account",
        body: (
          <p>
            <strong>Transfer</strong> sends money to another RentMe account by email
            address or phone number. It moves inside the platform, so it is instant and
            it lands in their wallet. Both sides get a row in their statement, paired on a
            reference beginning <code>rm-p2p-</code>.
          </p>
        ),
      },
      {
        id: "limits",
        heading: "The limits",
        body: (
          <p>
            The smallest amount you can move in one go is {MIN_MOVE}, and the largest is{" "}
            {MAX_MOVE}. Those bounds apply to adding money, withdrawing and transferring
            alike. Larger than the ceiling, split it into more than one movement.
          </p>
        ),
      },
      {
        id: "spendable",
        heading: "Spendable against settled",
        body: (
          <p>
            The wallet shows what you can actually spend, which is your settled balance
            minus anything already committed to a withdrawal that has not landed yet.
            That is the figure checkout uses too, so a stay can never be paid with money
            that is already on its way to your bank.
          </p>
        ),
      },
      {
        id: "the-statement",
        heading: "The statement",
        body: (
          <>
            <p>
              Under the balance is every movement, grouped by day, newest first: what it
              was, which way it went, how much, and its reference. Every stay you pay for,
              every refund, every top-up and every withdrawal appears here.
            </p>
            <p>
              A reference is the thing to quote to support. It is unique, enforced by the
              database rather than checked in passing, which is what makes a payment
              traceable rather than merely recorded.
            </p>
          </>
        ),
      },
      {
        id: "what-we-charge",
        heading: "What the platform charges",
        body: (
          <>
            <p>
              <strong>Nothing.</strong> There is no fee to hold a wallet, no fee to add
              money, no fee to withdraw, no fee to transfer, and no fee to pay for a stay
              from it.
            </p>
            <p>
              This is not a line of marketing copy, it is the shape of the ledger. Every
              settled charge on this platform decomposes into three parts that must add up
              exactly to what was paid: the agent share, the payment processor charge, and
              the platform share. The platform share is zero, and the database refuses a
              row where the three parts do not balance.
            </p>
            <p>
              A card processor may charge for moving money. Where that happens it is
              labelled as the processor charge, because it belongs to them and not to us.
              Nobody at RentMe will ever ask you for a fee of any other kind.
            </p>
          </>
        ),
      },
    ],
  },

  /* ------------------------------------------------------------------ 7 */
  {
    slug: "messages-and-notifications",
    number: 7,
    title: "Messages and notifications",
    summary:
      "Talking to an agent safely, confirming an inspection in the thread, and deciding what reaches you.",
    icon: "chat-duo",
    sections: [
      {
        id: "the-inbox",
        heading: "The inbox",
        body: (
          <>
            <p>
              <Link href="/messages" className={A}>
                Your inbox
              </Link>{" "}
              holds every conversation you are part of, with unread state, a search field
              and a way to hold people you have never spoken to apart from people you
              have. New messages arrive without a refresh.
            </p>
            <p>
              You start a conversation from a listing. Every approved listing has a
              message control, so you can ask about the road, the light, the water, the
              parking or the landlord before you commit to anything.
            </p>
          </>
        ),
      },
      {
        id: "keep-it-here",
        heading: "Keep it on the platform",
        body: (
          <>
            <p>
              A conversation held here is a record. A conversation moved to WhatsApp is
              somebody&apos;s word against somebody else&apos;s.
            </p>
            <p>
              The first time a message you are typing drifts towards money, the composer
              shows one line and then gets out of the way:{" "}
              <em>
                for your safety, keep every chat and payment inside RentMe. Deals made
                outside the platform are not protected by us. Pay only after you have
                inspected the property.
              </em>
            </p>
            <p>
              Ten-digit account numbers and payment wording in a thread are flagged
              automatically to the RentMe team. Nobody reads your conversations for
              entertainment, but an account number being passed around is the single
              clearest signal of the fraud this platform exists to keep out.
            </p>
          </>
        ),
      },
      {
        id: "inspections",
        heading: "Confirming an inspection",
        body: (
          <p>
            After you have seen a property, confirm the inspection from inside the thread.
            It records that you went, that it matched, and when. For a longer let that
            confirmation is the step that should come before any money moves, and having
            it on record is what makes a later dispute solvable.
          </p>
        ),
      },
      {
        id: "notifications",
        heading: "Notifications",
        body: (
          <>
            <p>
              <Link href="/notifications" className={A}>
                Notifications
              </Link>{" "}
              is your record of what happened: booking requests, confirmations and
              changes, new messages, money in and money out, and activity on what you
              posted in Around. They are grouped by day, arrive live, and you can mark the
              lot read in one tap.
            </p>
            <p>
              Each one goes somewhere. Tapping a booking notification opens that booking,
              not a list.
            </p>
          </>
        ),
      },
      {
        id: "choosing-what-reaches-you",
        heading: "Choosing what reaches you",
        body: (
          <>
            <p>
              Settings has four switches: <strong>Bookings</strong>,{" "}
              <strong>Messages</strong>, <strong>Wallet</strong> and{" "}
              <strong>Ideas and offers</strong>. Marketing is off until you turn it on,
              and every marketing email carries a way out.
            </p>
            <p>
              Those switches govern email. Anything that puts money at risk still appears
              in the app, whatever you have switched off, because a silent warning is not
              a warning.
            </p>
          </>
        ),
      },
    ],
  },

  /* ------------------------------------------------------------------ 8 */
  {
    slug: "around",
    number: 8,
    title: "Around: places, posts and people",
    summary:
      "You do not follow strangers here, you enter a place: your local government, your estate, your campus.",
    icon: "map-spot",
    sections: [
      {
        id: "the-idea",
        heading: "The idea",
        body: (
          <>
            <p>
              <Link href="/around" className={A}>
                Around
              </Link>{" "}
              inverts the usual arrangement. You do not build a following, you walk into a
              place: the local government you live in, the estate behind your gate, the
              campus you study on. What people there are saying today is the feed.
            </p>
            <p>
              It exists for the questions a Nigerian day is actually governed by. Is there
              light in Gwarinpa. Is the road at Ikorodu passable this morning. Has the
              tanker come. Those are worth opening the app for on a day you are not
              booking anything.
            </p>
          </>
        ),
      },
      {
        id: "the-geography",
        heading: "The geography is real",
        body: (
          <>
            <p>
              Nigeria is here as 36 states plus the Federal Capital Territory, and all 774
              local governments behind them. Every one of those is a door: a place that
              either already has people in it, or is waiting for the first person to open
              it.
            </p>
            <p>
              A place can also sit inside a local government rather than being one. Lekki
              Phase 1 inside Eti-Osa, a university inside Lagos Mainland. Those are
              proposed by people who live there and reviewed before they open.
            </p>
            <p>Every place is one of four kinds, and the kind changes nothing but the label:</p>
            <ul>
              <li>
                <strong>City.</strong> A whole city, like Abuja.
              </li>
              <li>
                <strong>Area.</strong> A neighbourhood people name in conversation, like
                Yaba or Gwagwalada.
              </li>
              <li>
                <strong>Estate.</strong> One gated estate, where the gate and the
                generator are shared.
              </li>
              <li>
                <strong>Campus.</strong> A university or polytechnic and the streets
                around it.
              </li>
            </ul>
          </>
        ),
      },
      {
        id: "joining",
        heading: "Joining a place",
        body: (
          <>
            <p>
              Open{" "}
              <Link href="/around/manage" className={A}>
                the directory
              </Link>
              , find your state, then your local government, and join. You can be in as
              many places as you actually have something to do with, and leave any of them
              at any time.
            </p>
            <p>
              If the place you want has nobody in it yet, you open it. That writes the
              first entries and you are standing in it. If what you want is smaller than a
              local government, propose it from{" "}
              <Link href="/around/new" className={A}>
                the new place screen
              </Link>{" "}
              and a person reviews it.
            </p>
            <p>
              Reading does not need an account. Signed out, or signed in with nothing
              joined yet, the feed shows the busiest open places under a line saying
              plainly that these are not yours yet, and one control that goes and picks
              them.
            </p>
          </>
        ),
      },
      {
        id: "posting",
        heading: "Posting",
        body: (
          <>
            <p>Two things you can write, and the difference is what you want back:</p>
            <ul>
              <li>
                <strong>Say something.</strong> Anything worth knowing about the place.
              </li>
              <li>
                <strong>Ask a question.</strong> Something you want an answer to. People
                who know the area see it.
              </li>
            </ul>
            <p>
              Up to {POST_MAX.toLocaleString("en-NG")} characters and up to{" "}
              {POST_MEDIA_MAX} pictures. Pictures are resized on your phone before they
              are uploaded, so posting on a slow connection is not a punishment. You have{" "}
              {EDIT_WINDOW_MINUTES} minutes to fix a post after you write it, and you can
              take your own post down whenever you like.
            </p>
            <p>
              People reply, mark what is useful, and repost into the places they are in.
              Replies are one level deep on purpose, so a thread stays readable on a phone.
            </p>
          </>
        ),
      },
      {
        id: "stories",
        heading: "Stories",
        body: (
          <p>
            A story is a longer piece with a picture, a headline and a standfirst: a place
            written about rather than a line said in passing. It is not ephemeral. Nothing
            counts down twenty-four hours and nothing expires it, because the whole point
            is that it is still there next month when the next person is deciding whether
            to move to that street. Stories carry their own comments and their own likes.
          </p>
        ),
      },
      {
        id: "listings-in-a-place",
        heading: "Listings speak in their own place",
        body: (
          <p>
            When an agent publishes a property, it is announced once in the place it is
            actually in, and once only. A finished stay by a verified agent speaks there
            too. That is how a room stays alive without anybody inventing anything: the
            real activity of the platform surfaces where it happened.
          </p>
        ),
      },
      {
        id: "moderators",
        heading: "Moderators",
        body: (
          <>
            <p>
              A place can have moderators, who are members of that place and not RentMe
              staff. The word administrator is deliberately not used for them anywhere you
              can see it, because they are not one.
            </p>
            <p>A moderator can:</p>
            <ul>
              {MODERATOR_CAN.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p>A moderator cannot:</p>
            <ul>
              {MODERATOR_CANNOT.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p>
              You can apply to moderate a place you are in, and withdraw the application
              at any time.
            </p>
          </>
        ),
      },
      {
        id: "people",
        heading: "People",
        body: (
          <p>
            You can follow somebody whose posts you find useful, and they can follow you.
            You can block or mute an account, and you can report a post or a profile. What
            you see is a place first and people second, which is the opposite of how most
            of this works elsewhere and is the reason Around is worth having.
          </p>
        ),
      },
    ],
  },

  /* ------------------------------------------------------------------ 9 */
  {
    slug: "for-agents",
    number: 9,
    title: "For agents",
    summary:
      "Applying, the verification ladder, listing a property, the calendar, accepting bookings and getting paid.",
    icon: "keys-home",
    sections: [
      {
        id: "what-it-costs",
        heading: "What it costs",
        body: (
          <p>
            Nothing, and it stays nothing. There is no listing fee, no subscription, no
            featured placement to buy, and nothing is taken out of what a guest pays you.
            The whole amount is yours, less whatever the payment processor charges for
            moving it, which is named as theirs.
          </p>
        ),
      },
      {
        id: "applying",
        heading: "Applying",
        body: (
          <>
            <p>
              Start at{" "}
              <Link href="/agents" className={A}>
                Become an agent
              </Link>
              . The application is six short steps and your progress saves as you go, so
              you can put it down and come back:
            </p>
            <ol>
              <li>
                <strong>Personal details.</strong> Name and phone number.
              </li>
              <li>
                <strong>Identity.</strong> Your NIN or a government issued ID.
              </li>
              <li>
                <strong>Business and location.</strong> Whether you operate as an
                individual or a registered business, and where you are.
              </li>
              <li>
                <strong>Documents.</strong> A photograph or scan of the identification,
                plus business registration if you are a business. Documents are required:
                an application with no identity document cannot be verified by anybody.
              </li>
              <li>
                <strong>Payout account.</strong> The Nigerian bank account your earnings
                go to. We ask the bank whose account it is and store the name the bank
                gave, not the one typed into the form.
              </li>
              <li>
                <strong>Review.</strong> Check it and submit.
              </li>
            </ol>
            <p>
              Your documents go straight into a private store that only you and a reviewer
              can reach, and the reviewer opens them through short-lived links rather than
              downloading them. You get a reference, and you can follow the application at{" "}
              <Link href="/agents/status" className={A}>
                its status page
              </Link>
              . A person reviews it, not just a script.
            </p>
          </>
        ),
      },
      {
        id: "verification",
        heading: "The verification ladder",
        body: (
          <>
            <p>
              Approval gets you listing. Verification is a ladder of four rungs on top of
              it, climbed in order, and each one says something specific to a guest:
            </p>
            <ol>
              {VERIFICATION_ORDER.map((rung) => (
                <li key={rung.kind}>
                  <strong>{rung.label}.</strong> {rung.meaning} Checked against:{" "}
                  {rung.evidence.charAt(0).toLowerCase()}
                  {rung.evidence.slice(1)}
                </li>
              ))}
            </ol>
            <p>
              A rung only counts with every rung below it passed, so nobody is promoted by
              a site visit alone. You can see where you stand at{" "}
              <Link href="/agent/verification" className={A}>
                Verification
              </Link>{" "}
              in Agent Mode.
            </p>
          </>
        ),
      },
      {
        id: "listing-a-property",
        heading: "Listing a property",
        body: (
          <>
            <p>
              <Link href="/agent/list" className={A}>
                List a property
              </Link>{" "}
              walks you through it: what kind of place it is, where it is, how many rooms
              and how many guests it takes, photographs, amenities, and the price with any
              cleaning charge and any minimum stay.
            </p>
            <p>
              <strong>Answer the light and water questions.</strong> They take a minute
              and they are the reason a guest picks your listing over the one beside it.
              Say what the grid gives the address, what your backup is and how many hours a
              day it runs, where the water comes from, and whether the unit is on a
              prepaid meter. An unanswered question is shown to the guest as unanswered,
              which is worse for you than a modest honest answer.
            </p>
            <p>
              <strong>Fill in the gate details.</strong> Estate name, how to find the
              gate, the security post number and any access code. These are never public.
              They are released to a guest only once their booking is confirmed, which is
              why they can be specific enough to be useful.
            </p>
            <p>
              You can also mark a listing as instant book, which lets a guest pay without
              waiting for you to accept. A published listing is announced once in the
              place it sits in, so people in that area see it.
            </p>
          </>
        ),
      },
      {
        id: "calendar",
        heading: "Managing your calendar",
        body: (
          <>
            <p>
              Each listing has a calendar. Close nights you are not letting, up to{" "}
              {MAX_BLOCK_NIGHTS} nights in one action, and reopen them the same way.
            </p>
            <p>
              Nights held by a guest reservation and nights you closed by hand are
              different things, and the platform keeps them apart. When an unpaid hold
              expires, it reopens only the nights it took, and never a night you had
              closed yourself.
            </p>
          </>
        ),
      },
      {
        id: "bookings",
        heading: "Accepting bookings",
        body: (
          <>
            <p>
              <Link href="/agent/bookings" className={A}>
                Bookings
              </Link>{" "}
              is your queue: who is coming, when, for how many nights, and for how much.
              Where a listing is not instant book, you accept or decline the request from
              here.
            </p>
            <p>
              Accepting a request does not mean you have been paid. It makes the stay
              payable, and the guest pays it. The status on the booking says which of
              those two things has happened, so you are never told a stay is settled when
              no money has arrived.
            </p>
          </>
        ),
      },
      {
        id: "earnings",
        heading: "Earnings",
        body: (
          <>
            <p>
              <Link href="/agent/earnings" className={A}>
                Earnings
              </Link>{" "}
              reads the ledger, month by month: what was paid in total, your share, what
              the processor charged, and how many stays settled. It projects nothing and
              annualises nothing. If no money has moved, it says zero.
            </p>
            <p>
              The platform share on every one of those rows is zero. Payouts go to the
              Nigerian account you added during your application, which you can change in{" "}
              <Link href="/agent/settings" className={A}>
                Agent settings
              </Link>
              .
            </p>
          </>
        ),
      },
      {
        id: "reviews-and-messages",
        heading: "Reviews and enquiries",
        body: (
          <p>
            Guests review a stay after it finishes, and you can reply once, publicly, from{" "}
            <Link href="/agent/reviews" className={A}>
              Reviews
            </Link>
            . Enquiries about your listings arrive in{" "}
            <Link href="/agent/messages" className={A}>
              your agent inbox
            </Link>
            . Answering quickly and honestly, especially about the light and the road, is
            what makes the difference here.
          </p>
        ),
      },
    ],
  },

  /* ------------------------------------------------------------------ 10 */
  {
    slug: "trust-and-safety",
    number: 10,
    title: "Trust and safety",
    summary:
      "What verification proves, why every payment stays on the platform, how to report, and how support answers.",
    icon: "shield-check",
    sections: [
      {
        id: "what-verification-proves",
        heading: "What verification proves, and what it does not",
        body: (
          <>
            <p>
              A verified listing means a real person with government identification stands
              behind it, we have seen that identification, and the listing was reviewed
              before it went live. Higher rungs mean we also know where they are, that
              their payout account is genuinely theirs, and in the top case that somebody
              from RentMe has met them or stood in one of their properties.
            </p>
            <p>
              It does not mean the mattress is comfortable. Read the reviews for that.
            </p>
            <p>
              The verified badge is first-party stock only. Third-party listings from an
              outside inventory provider never carry it, because we have not met that
              agent or seen that property.
            </p>
          </>
        ),
      },
      {
        id: "pay-on-the-platform",
        heading: "Pay on the platform. Always",
        body: (
          <>
            <p>
              Every payment happens inside RentMe: on the checkout screen, by card, by a
              bank transfer the processor raises, or from your wallet. That is what leaves
              a reference against your booking that both you and support can open, which
              is the thing that makes a dispute solvable.
            </p>
            <p>
              <strong>Nobody here has any reason to send you an account number.</strong>{" "}
              Not an agent, not support, not anybody wearing our name. If somebody does,
              that is the moment to stop and report them.
            </p>
            <p>
              There is no holding fee, no inspection fee, no agency fee and no caution fee
              payable to RentMe, because RentMe charges nothing at all. Anybody presenting
              one as ours is lying.
            </p>
            <p>
              At an inspection: go in daylight where you can, tell somebody where you are
              going, and never hand over cash. Confirm the inspection in the message
              thread afterwards so there is a record of what you saw and when.
            </p>
          </>
        ),
      },
      {
        id: "reporting",
        heading: "How to report",
        body: (
          <>
            <p>
              Every listing, profile and post has a report control. It asks one question,
              and the answers are short and concrete on purpose:
            </p>
            <ul>
              {REPORT_CATEGORY_ORDER.map((code) => (
                <li key={code}>
                  <strong>{REPORT_CATEGORY_COPY[code].label}.</strong>{" "}
                  {REPORT_CATEGORY_COPY[code].hint}
                </li>
              ))}
            </ul>
            <p>
              Add what you saw in your own words, and include the link. Reports about
              somebody asking for payment outside the platform go to the front of the
              queue.
            </p>
          </>
        ),
      },
      {
        id: "what-happens-next",
        heading: "What happens to a report",
        body: (
          <>
            <p>
              It lands in a queue a person works through. Serious reports can hide a
              listing while it is checked, because leaving a suspected scam visible while
              somebody reads the ticket is not a neutral act.
            </p>
            <p>
              An account can be stopped. A stop is not silent: the person is told, in
              words, what happened and what they can do about it, and a stop can be
              lifted. Every action a reviewer takes is written to a record that can only
              be added to, never edited or removed.
            </p>
          </>
        ),
      },
      {
        id: "already-sent-money",
        heading: "If you have already sent money outside the platform",
        body: (
          <>
            <p>
              Call your bank first and ask them to raise a dispute on the transfer. A fast
              report is sometimes enough for them to place a lien on the receiving account.
            </p>
            <p>
              Then report it to us with the listing link, the account details and the
              messages. We cannot recover money that never came through RentMe. We can
              remove the account and stop the same person reaching anybody else, which is
              worth doing immediately.
            </p>
          </>
        ),
      },
      {
        id: "support",
        heading: "How support works",
        body: (
          <>
            <p>
              <Link href="/contact" className={A}>
                The contact form
              </Link>{" "}
              opens a real ticket against your account. A person reads it, and their reply
              reaches you as a notification, so nothing goes into a mailbox nobody
              watches. You can also write to{" "}
              <a href={SUPPORT_HREF} className={A}>
                {SUPPORT_LABEL}
              </a>
              .
            </p>
            <p>
              A person replies within one business day. Reports about payment outside the
              platform are answered within four hours. Write in English, Yorùbá, Hausa or
              Igbo and you get a reply in the language you used.
            </p>
            <p>
              There is also a support assistant in the help centre and in Settings for the
              questions that have a written answer already.
            </p>
          </>
        ),
      },
    ],
  },

  /* ------------------------------------------------------------------ 11 */
  {
    slug: "your-data-and-your-rights",
    number: 11,
    title: "Your data and your rights",
    summary:
      "What we hold, how it is protected, the rights the NDPA gives you, and how to delete your account for good.",
    icon: "doc-lock",
    sections: [
      {
        id: "what-we-hold",
        heading: "What we hold",
        body: (
          <>
            <ul>
              <li>
                <strong>Account data.</strong> Your name, email, phone number, language,
                and your password stored only as a hash.
              </li>
              <li>
                <strong>Booking data.</strong> What you looked at, what you booked, the
                dates, the guests, your messages with agents, and your reviews.
              </li>
              <li>
                <strong>Payment data.</strong> References, amounts, refunds and your
                wallet statement. Card details are handled by licensed Nigerian payment
                processors and we never hold your full card number.
              </li>
              <li>
                <strong>Agent verification data</strong>, if you apply: your NIN or
                government ID, business registration where it applies, and your payout
                account.
              </li>
              <li>
                <strong>Technical data.</strong> Device, browser, IP address and how you
                move through the product, used to keep it working and secure.
              </li>
            </ul>
            <p>
              The full document is the{" "}
              <Link href="/privacy" className={A}>
                privacy policy
              </Link>
              . This chapter is the plain-language version of it.
            </p>
          </>
        ),
      },
      {
        id: "how-it-is-protected",
        heading: "How it is protected",
        body: (
          <>
            <p>
              Every table in the database has row level security switched on. That is not
              a setting in the application that a bug could skip past: the database itself
              refuses to hand your rows to anybody who is not you. Your wallet, your
              bookings, your messages and your settings are all reached that way.
            </p>
            <p>
              Gate details are the sharpest example. They are readable by the host, by an
              administrator, and by a guest holding a confirmed booking on that listing,
              and by nobody else, and the rule is enforced by the database rather than by a
              screen deciding what to draw.
            </p>
            <p>
              Data is encrypted in transit, passwords are hashed, agent documents live in a
              private store reached through short-lived links, and payments run through
              licensed providers.
            </p>
          </>
        ),
      },
      {
        id: "your-rights",
        heading: "Your rights under the NDPA",
        body: (
          <>
            <p>
              The Nigeria Data Protection Act 2023 gives you rights over your personal
              data, and they are real rights you can exercise here:
            </p>
            <ul>
              <li>Ask for a copy of what we hold about you.</li>
              <li>Ask us to correct anything inaccurate or incomplete.</li>
              <li>Ask us to delete what we have no lawful reason to keep.</li>
              <li>Object to, or ask us to restrict, certain processing.</li>
              <li>Ask for your data in a portable format.</li>
              <li>Withdraw consent where the processing rests on consent.</li>
            </ul>
            <p>
              To exercise any of them, write to us through{" "}
              <a href={SUPPORT_HREF} className={A}>
                {SUPPORT_LABEL}
              </a>{" "}
              with Privacy as the subject. We answer within the timelines the NDPA sets. If
              our answer does not satisfy you, you can complain to the Nigeria Data
              Protection Commission.
            </p>
          </>
        ),
      },
      {
        id: "controls",
        heading: "The controls you already have",
        body: (
          <ul>
            <li>
              <strong>Hide my activity</strong> keeps your reviews and recent stays off
              your public page.
            </li>
            <li>
              <strong>Notification switches</strong> decide what email reaches you.
              Marketing is off until you turn it on.
            </li>
            <li>
              <strong>Data saver</strong> serves lighter images, which matters on a
              metered connection.
            </li>
            <li>
              <strong>Language and appearance</strong> are yours and are remembered.
            </li>
          </ul>
        ),
      },
      {
        id: "deleting",
        heading: "Deleting your account",
        body: (
          <>
            <p>
              Settings, then Account, then Delete account. You are asked to type{" "}
              <code>DELETE MY ACCOUNT</code> exactly, in capitals, because this cannot be
              undone.
            </p>
            <p>
              It is a real deletion. Your sign-in is removed, you are signed out
              everywhere, and your profile, your posts, your places and everything else
              keyed to you goes with it. Nothing is left behind as a hidden row waiting to
              be reactivated, and the platform is deliberately built so that no counter, no
              record and no cascade anywhere can block a person from leaving.
            </p>
            <p>
              Two honest exceptions. Financial records connected to money that actually
              moved are kept for as long as Nigerian financial and tax rules require, and
              content somebody else has already replied to may remain as a marker showing
              it was removed, so a conversation does not become unreadable. Neither one
              carries your identity.
            </p>
            <p>
              If deletion cannot complete for a technical reason, you are told plainly and
              given a way to have it done by hand. You are never shown a confirmation for
              something that did not happen.
            </p>
          </>
        ),
      },
    ],
  },

  /* ------------------------------------------------------------------ 12 */
  {
    slug: "troubleshooting",
    number: 12,
    title: "Troubleshooting",
    summary:
      "The things that go wrong, what they mean, and what to do about each one.",
    icon: "support-chat",
    sections: [
      {
        id: "cannot-sign-in",
        heading: "I cannot sign in",
        body: (
          <>
            <p>
              <strong>The link expired or was already used.</strong> Email links are
              single use. Ask for a new one from{" "}
              <Link href="/sign-in" className={A}>
                Sign in
              </Link>{" "}
              or{" "}
              <Link href="/forgot-password" className={A}>
                Forgot password
              </Link>
              .
            </p>
            <p>
              <strong>I signed up with Google and the password does not work.</strong>{" "}
              There is no password on that account. Use the Google button.
            </p>
            <p>
              <strong>The Google button is not there.</strong> A provider is only offered
              when it is connected, because a button that leads to an error page is worse
              than an absent one. Use email in the meantime.
            </p>
          </>
        ),
      },
      {
        id: "dates-taken",
        heading: "Those dates were just taken",
        body: (
          <p>
            Somebody reserved or paid for the same nights a moment before you. Nothing has
            been charged. Pick different dates, or open the listing calendar to see what is
            actually free. The database refuses overlapping stays outright, which is why
            this can never turn into two people arriving at one door.
          </p>
        ),
      },
      {
        id: "minimum-stay",
        heading: "It says the stay is too short, or the party too large",
        body: (
          <p>
            The host sets a minimum stay and a maximum number of guests. The message names
            the number you need to meet, so add the nights or lower the party. If neither
            works, search again with the guest filter set and you will only be shown places
            that take your party.
          </p>
        ),
      },
      {
        id: "payment-trouble",
        heading: "My payment did not go through",
        body: (
          <>
            <p>
              <strong>The card was refused.</strong> Nothing was taken and your dates are
              still held. Try again, try another card, or pay from your wallet.
            </p>
            <p>
              <strong>Money left my account and the booking still says unpaid.</strong>{" "}
              Open the booking again first: the settlement often lands a moment after you
              return. If it still says unpaid, contact support with the payment reference
              from your{" "}
              <Link href="/wallet" className={A}>
                wallet statement
              </Link>{" "}
              or from the booking. A reference is unique, so it can be traced.
            </p>
            <p>
              <strong>I tapped pay twice.</strong> You were not charged twice. A repeated
              attempt replays the first answer rather than taking money again.
            </p>
            <p>
              <strong>Card payment is not offered.</strong> Then it is not connected yet,
              and the screen says so rather than failing at the last step. Your booking is
              untouched and your dates are still held.
            </p>
          </>
        ),
      },
      {
        id: "refund-missing",
        heading: "My refund has not arrived",
        body: (
          <p>
            Refunds land in your RentMe wallet, usually within minutes, not back on your
            card. Check the{" "}
            <Link href="/wallet" className={A}>
              wallet statement
            </Link>{" "}
            first. From there, withdraw to your bank: a bank transfer takes as long as your
            bank takes. If nothing appears in the statement, contact support with the
            booking reference.
          </p>
        ),
      },
      {
        id: "balance-looks-low",
        heading: "My balance is lower than I expected",
        body: (
          <p>
            The wallet shows what you can spend, which is your settled balance minus any
            withdrawal that has been requested and has not landed yet. That money is not
            missing, it is committed. The statement shows it as a pending movement.
          </p>
        ),
      },
      {
        id: "no-gate-details",
        heading: "The gate details are not showing",
        body: (
          <p>
            They appear only once your booking is confirmed, and confirmed means paid or
            accepted and settled. Until then the listing tells you the estate has a gate
            and that the details arrive on confirmation. If your booking is confirmed and
            they are still not there, the agent has not filled them in: message them, and
            report the listing if you get no answer.
          </p>
        ),
      },
      {
        id: "listing-problems",
        heading: "The place is not what was listed",
        body: (
          <p>
            Report it before or at check-in, from the listing itself, and choose{" "}
            <em>{REPORT_CATEGORY_COPY.not_as_described.label}</em>. Take photographs. A
            property that is materially not what was listed is a full refund whenever it
            happens, but the report has to exist for that to be actionable.
          </p>
        ),
      },
      {
        id: "around-paused",
        heading: "Around says it is paused",
        body: (
          <p>
            Around has a switch, and it is off while something is being fixed. Nothing you
            posted is gone and nothing you joined is lost. Everything else on the platform,
            including booking and your wallet, carries on working.
          </p>
        ),
      },
      {
        id: "offline",
        heading: "Nothing is loading",
        body: (
          <p>
            RentMe installs as an app and keeps working on a bad connection, with an
            honest offline screen rather than a blank one. If a page shows an error, the
            back control follows your real history rather than guessing, so you will not be
            thrown to the top of the product. If it persists, tell us what you were doing
            through{" "}
            <Link href="/contact" className={A}>
              the contact form
            </Link>
            .
          </p>
        ),
      },
      {
        id: "still-stuck",
        heading: "Still stuck",
        body: (
          <p>
            The{" "}
            <Link href="/help" className={A}>
              help centre
            </Link>{" "}
            is searchable and answers most of it. Beyond that,{" "}
            <Link href="/contact" className={A}>
              contact support
            </Link>{" "}
            and a person replies within one business day. Include a reference where you
            have one: it is the fastest way to get a real answer instead of a
            conversation.
          </p>
        ),
      },
    ],
  },
];

/* ------------------------------------------------------------------ index */

/**
 * The navigation shape: plain data, no React elements.
 *
 * This is what crosses into the client sidebar, as props. Importing `CHAPTERS`
 * itself from a client component would pull every paragraph of the whole
 * document into the browser bundle, which is a documentation site that costs a
 * megabyte to open a single chapter.
 */
export type DocChapterIndexEntry = {
  slug: string;
  number: number;
  title: string;
  summary: string;
  icon: BrandIconName;
};

export const CHAPTER_INDEX: DocChapterIndexEntry[] = CHAPTERS.map((chapter) => ({
  slug: chapter.slug,
  number: chapter.number,
  title: chapter.title,
  summary: chapter.summary,
  icon: chapter.icon,
}));

/** One chapter by its slug, or undefined so the route can answer with notFound. */
export function chapterBySlug(slug: string): DocChapter | undefined {
  return CHAPTERS.find((chapter) => chapter.slug === slug);
}

/** What comes before and after, for the foot of a chapter. Either can be null. */
export function chapterNeighbours(slug: string): {
  previous: DocChapterIndexEntry | null;
  next: DocChapterIndexEntry | null;
} {
  const at = CHAPTER_INDEX.findIndex((chapter) => chapter.slug === slug);
  if (at === -1) return { previous: null, next: null };
  return {
    previous: at > 0 ? (CHAPTER_INDEX[at - 1] ?? null) : null,
    next: at < CHAPTER_INDEX.length - 1 ? (CHAPTER_INDEX[at + 1] ?? null) : null,
  };
}
