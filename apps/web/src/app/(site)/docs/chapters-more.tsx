import Link from "next/link";
import { getDictionary } from "@vallo/i18n";
import { AI_DISCLOSURE } from "@/lib/ai/consent";
import {
  NO_INSPECTION_FEE,
  PAYMENT_GATE_SENTENCE,
} from "@/lib/money/copy";
import {
  STAYS_DOOR_ORDER,
  STAYS_DOORS,
  SUPPLY_DOORS,
  SUPPLY_DOOR_HREF,
  WORKSPACE_STANDING_COPY,
} from "@/lib/supply/roles";
import { VERIFICATION_ORDER } from "@/lib/trust/verification";
import type { DocChapter, DocSection } from "./chapters";
import { DocsFlow } from "./DocsFlow";

/**
 * THE CHAPTERS THE PLATFORM GREW INTO (Track M, the docs pass, 25 September
 * 2026): getting around the app (the dock and its tray, the menu, light and
 * dark, the motion setting), Price Check, the AI assistant, and listing on
 * Vallo (every supplier door and the verification ladder), plus the section
 * on messaging a hotel or a restaurant that joins the messages chapter.
 *
 * The same rules as `chapters.tsx`. Every label a reader will look for on
 * screen is read from the dictionary or the module that draws it, so the
 * document and the screen cannot disagree; every rule is imported from the
 * code that enforces it; money is only ever a sentence from
 * `lib/money/copy.ts`. Nothing here describes a feature that is not there.
 * `number` is set by `chapters.tsx` from the reading order.
 */

const A = "font-semibold text-[var(--nf-content-link)] hover:underline";
const en = getDictionary("en");
const look = en.settings.appearance;

/* ------------------------------------------------------ getting around */

export const GETTING_AROUND: DocChapter = {
  slug: "getting-around",
  number: 0,
  title: "Getting around the app",
  summary:
    "The dock and its tray, the menu, light and dark, and the motion setting: how the app is laid out on a phone and a computer, and how to make it look and move the way you like.",
  icon: "map-route",
  sections: [
    {
      id: "the-dock",
      heading: "The dock, and the tray behind it",
      body: (
        <>
          <p>
            On a phone, a dock floats at the foot of the screen with the places you use most. It
            slips away while you scroll down a long page and comes back the moment you scroll
            up, so it never sits on top of what you are reading.
          </p>
          <p>
            The round button at the end of the dock opens a tray. Signed in, the tray holds{" "}
            {[
              en.nav.messages,
              en.shape.plans.title,
              en.nav.saved,
              en.nav.aiAssistant,
              en.nav.agreements,
              en.priceCheck.title,
              en.nav.settings,
            ].join(", ")}{" "}
            and {en.nav.helpSupport}. Signed out it holds {en.nav.aiAssistant},{" "}
            {en.priceCheck.title} and {en.nav.helpSupport}. The tray is a faster door, not a
            second map: everything in it is also in the menu.
          </p>
        </>
      ),
    },
    {
      id: "the-menu",
      heading: "The menu",
      body: (
        <p>
          The menu button at the top of the screen opens the full list of destinations, grouped,
          with your name and your standing at the top. On a computer the same list stays open as
          a rail down the left of the screen. The switch between the Property side and Vallo Stays
          lives in the menu too, and the chapter on{" "}
          <Link href="/docs/what-vallo-is#the-two-sides" className={A}>
            the two sides
          </Link>{" "}
          explains what it changes.
        </p>
      ),
    },
    {
      id: "light-and-dark",
      heading: "Light and dark",
      body: (
        <>
          <p>
            Vallo comes in a light and a dark theme. Choose under Settings, then{" "}
            {look.label}, then {look.theme}: {look.themeLight}, {look.themeDark} or{" "}
            {look.themeSystem}. {look.themeSystem} follows whatever your phone or computer is set
            to, and changes with it.
          </p>
          <p>
            The choice is kept on this device. A few surfaces keep the night in both themes
            because they are built on night photography, such as the photographs on a listing and
            the front of the website; everything around them follows your choice.
          </p>
        </>
      ),
    },
    {
      id: "motion",
      heading: "Motion",
      body: (
        <>
          <p>
            Under Settings, then {look.label}, then {look.motion}, you choose how much the app
            moves. {look.motionNote}
          </p>
          <ul role="list">
            <li>
              <strong>{look.motionCinematic}.</strong> {look.motionCinematicSub}
            </li>
            <li>
              <strong>{look.motionStandard}.</strong> {look.motionStandardSub}
            </li>
            <li>
              <strong>{look.motionCalm}.</strong> {look.motionCalmSub}
            </li>
            <li>
              <strong>{look.motionOff}.</strong> {look.motionOffSub}
            </li>
          </ul>
          <p>Three switches sit under the levels:</p>
          <ul role="list">
            <li>
              <strong>{look.motionSplash}.</strong> {look.motionSplashSub}
            </li>
            <li>
              <strong>{look.motionDoors}.</strong> {look.motionDoorsSub}
            </li>
            <li>
              <strong>{look.motionAmbient}.</strong> {look.motionAmbientSub}
            </li>
          </ul>
          <p>
            The splash and the door moments only play at {look.motionStandard} or{" "}
            {look.motionCinematic}. At {look.motionCalm} and {look.motionOff} nothing loops, nothing
            drifts behind the page, and every screen settles at once.
          </p>
        </>
      ),
    },
  ],
};

/* ------------------------------------------------------------- price check */

const pc = en.priceCheck;

export const PRICE_CHECK: DocChapter = {
  slug: "price-check",
  number: 0,
  title: "Price Check",
  summary:
    "What similar properties near a place are currently advertised for on Vallo, how sure the answer is, and the honest answers it gives when it cannot say.",
  icon: "report-stats",
  sections: [
    {
      id: "what-it-answers",
      heading: "What it answers",
      body: (
        <>
          <p>
            <strong>{pc.lead}</strong> {pc.intro}
          </p>
          <p>
            It reads the asking prices on listings published on Vallo. It is not what anybody
            has paid, it is not an opinion on a particular property, and it is not advice. Find
            it in the dock&rsquo;s tray, in the menu, or at{" "}
            <Link href="/price" className={A}>
              /price
            </Link>
            .
          </p>
        </>
      ),
    },
    {
      id: "what-it-asks",
      heading: "What it asks you",
      body: (
        <>
          <p>
            <strong>{pc.ladder.heading}</strong> The {pc.ladder.state.toLowerCase()}, the{" "}
            {pc.ladder.lga.toLowerCase()}, the {pc.ladder.area.toLowerCase()}, and a pin on the
            map. {pc.ladder.pinHelp}
          </p>
          <p>
            <strong>{pc.subject.heading}</strong> A {pc.subject.apartment.toLowerCase()}, a{" "}
            {pc.subject.home.toLowerCase()}, a {pc.subject.shop.toLowerCase()} or an{" "}
            {pc.subject.office.toLowerCase()}; to rent or for sale; the bedrooms and bathrooms;
            and the size if you know it. {pc.subject.sizeHint}
          </p>
          <p>Opened from a listing, it arrives filled in from that listing, and you can change anything that is wrong.</p>
        </>
      ),
    },
    {
      id: "what-you-get",
      heading: "What you get back",
      body: (
        <>
          <DocsFlow
            label="How Price Check answers"
            steps={[
              { object: "pin-map", label: "Where it is" },
              { object: "home-search", label: "What it is" },
              { object: "listing-search", label: "Nearby listings" },
              { object: "report-stats", label: "Asking range" },
            ]}
          />
          <ul role="list">
            <li>
              <strong>{pc.result.askingRange}.</strong> What the comparable properties near the
              pin are asking.
            </li>
            <li>
              <strong>What it is based on.</strong> How many listings, how far away, and how
              recently they were published, with the listings themselves beneath.
            </li>
            <li>
              <strong>{pc.result.confidence}.</strong> {pc.result.confidenceBody}
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "when-it-says-no",
      heading: "When it says it cannot tell you",
      body: (
        <>
          <p>
            Price Check would rather give no figure than a weak one, and it says which of these
            it has run into:
          </p>
          <ul role="list">
            {[
              pc.refusals.noLocation,
              pc.refusals.noComparables,
              pc.refusals.tooFewComparables,
              pc.refusals.wideDispersion,
              pc.refusals.stale,
              pc.refusals.unsupportedPeriod,
              pc.refusals.demoOnly,
            ].map((r) => (
              <li key={r.title}>
                <strong>{r.title.replace("{count}", "only a few")}.</strong> {r.body.replace(/\{count\}/g, "a few")}
              </li>
            ))}
            <li>
              <strong>{pc.refusals.unsupportedType.title}.</strong> Land, hotels and restaurants
              are priced in ways a street of nearby listings cannot answer: land by plot, title and
              access, and stays and tables by the night and the cover.
            </li>
          </ul>
        </>
      ),
    },
  ],
};

/* ------------------------------------------------------------ the assistant */

export const AI_ASSISTANT: DocChapter = {
  slug: "ai-assistant",
  number: 0,
  title: "The AI assistant",
  summary:
    "What Vallo AI can do for you, what it will not do, how to read its answers, and what happens to what you type.",
  icon: "bot",
  sections: [
    {
      id: "what-it-is",
      heading: "What it is",
      body: (
        <>
          <p>
            Vallo AI answers questions about finding, renting, buying and staying, in English,
            Yorùbá, Hausa or Igbo. It searches the same listings you do, so it can only tell you
            about places that are really on Vallo, and it links every one it names.
          </p>
          <p>{AI_DISCLOSURE.body}</p>
          <p>
            The first time you open it, you are asked to agree to that before anything is sent.{" "}
            {AI_DISCLOSURE.human}.
          </p>
        </>
      ),
    },
    {
      id: "what-it-can-do",
      heading: "What it can do",
      body: (
        <ul role="list">
          <li>
            <strong>Search.</strong> Property to rent or buy, somewhere to stay, and restaurants,
            with the figures the listing states.
          </li>
          <li>
            <strong>Compare.</strong> Two to four listings side by side on the things that decide
            between them: the price and the period it covers, the bedrooms, where it is, light
            and water, and how far the lister has climbed the verification ladder.
          </li>
          <li>
            <strong>Say what moving in costs.</strong> The rent is rarely the whole number: the
            caution deposit and the agency, legal and agreement fees are normal, and it names
            them.
          </li>
          <li>
            <strong>Say what an area is like</strong>, from what people who live there have
            posted in Around, always as their words and never as a finding of ours.
          </li>
        </ul>
      ),
    },
    {
      id: "what-it-will-not-do",
      heading: "What it will not do",
      body: (
        <ul role="list">
          <li>Invent a listing, a price, a date, a rating or a review.</li>
          <li>
            Tell you a land title is good. It says which document a listing states, says so
            plainly when it states none, and sends you to a lawyer before any money moves.
          </li>
          <li>
            Suggest paying outside the platform, for any reason. {PAYMENT_GATE_SENTENCE}
          </li>
          <li>Talk about things that are not Vallo. It steers back, politely.</li>
        </ul>
      ),
    },
    {
      id: "reading-an-answer",
      heading: "Reading an answer",
      body: (
        <>
          <DocsFlow
            label="How an answer is built"
            steps={[
              { object: "chat-duo", label: "You ask" },
              { object: "listing-search", label: "It searches Vallo" },
              { object: "doc-review", label: "It answers" },
              { object: "home-check", label: "Linked listings" },
            ]}
          />
          <p>
            Every place it names is a link to that listing. An example listing is marked Example
            and cannot be rented, bought or booked. A rating comes with the number of reviews
            behind it, because two reviews say very little. When nothing suitable comes back, it
            says so and suggests widening the search.
          </p>
          <p>
            It is an assistant, not an agent: it cannot book, pay or message anybody for you. The
            listing it links to is where you do those things.
          </p>
        </>
      ),
    },
  ],
};

/* ------------------------------------------------------- listing on Vallo */

const STANDINGS = (["draft", "pending", "refused", "suspended"] as const).flatMap((key) => {
  const copy = (WORKSPACE_STANDING_COPY as Record<string, { label: string | null; meaning: string | null }>)[key];
  return copy?.label ? [{ key, label: copy.label, meaning: copy.meaning ?? "" }] : [];
});

export const LISTING_ON_VALLO: DocChapter = {
  slug: "listing-on-vallo",
  number: 0,
  title: "Listing on Vallo",
  summary:
    "Every door for somebody supplying a place: an owner, an agent, a registered firm, a hotel, a shortlet or a restaurant. What each asks for, how long it takes, and the verification ladder behind the ticks.",
  icon: "keys-handover",
  sections: [
    {
      id: "the-doors",
      heading: "Choose your door",
      body: (
        <>
          <p>
            Everybody who supplies a place starts from the same screen, at{" "}
            <Link href={SUPPLY_DOOR_HREF} className={A}>
              {SUPPLY_DOOR_HREF}
            </Link>
            , and picks the door that describes them. The door decides what Vallo asks for,
            because each kind of supplier can go wrong in a different way, and the checks are
            written against that.
          </p>
          <DocsFlow
            label="From a door to a published listing"
            steps={[
              { object: "person-card", label: "Pick a door" },
              { object: "id-card-check", label: "Tell us who you are" },
              { object: "doc-review", label: "A person reviews it" },
              { object: "home-check", label: "Publish" },
            ]}
          />
        </>
      ),
    },
    ...(["owner", "agent", "firm"] as const).map(
      (key): DocSection => ({
        id: `door-${key}`,
        heading: SUPPLY_DOORS[key].title,
        body: (
          <>
            <p>
              <strong>{SUPPLY_DOORS[key].blurb}</strong> {SUPPLY_DOORS[key].whoItIsFor}
            </p>
            <p>What it asks for:</p>
            <ul role="list">
              {SUPPLY_DOORS[key].needs.map((need) => (
                <li key={need}>{need}</li>
              ))}
            </ul>
            <p>{SUPPLY_DOORS[key].howLong}</p>
          </>
        ),
      }),
    ),
    {
      id: "stays-doors",
      heading: "Hotels, shortlets and restaurants",
      body: (
        <>
          <p>The Vallo Stays side has its own three doors:</p>
          <ul role="list">
            {STAYS_DOOR_ORDER.map((id) => (
              <li key={id}>
                <strong>{STAYS_DOORS[id].title}.</strong> {STAYS_DOORS[id].blurb}
              </li>
            ))}
          </ul>
          <p>
            A hotel or a shortlet sets its rooms, rates and calendar; a restaurant sets its
            tables, hours and menu. Guests can then reserve, book a table, or message the business
            from its page.
          </p>
        </>
      ),
    },
    {
      id: "the-ladder",
      heading: "The verification ladder",
      body: (
        <>
          <p>
            A lister climbs the same ladder, one rung at a time, and a listing shows how far its
            lister has climbed rather than a single word that could mean anything:
          </p>
          <ol role="list">
            {VERIFICATION_ORDER.map((rung) => (
              <li key={rung.label}>
                <strong>{rung.label}.</strong> {rung.meaning}
              </li>
            ))}
          </ol>
          <p>
            A person at Vallo decides each rung by hand. The Verified tick appears only once a
            person here has checked the ID of the lister behind the listing.
          </p>
        </>
      ),
    },
    {
      id: "standing",
      heading: "Where your application stands",
      body: (
        <ul role="list">
          {STANDINGS.map((s) => (
            <li key={s.key}>
              <strong>{s.label}.</strong> {s.meaning}
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: "inspections-for-listers",
      heading: "Inspections, and what you may charge",
      body: (
        <p>
          {NO_INSPECTION_FEE} A renter inspects before anything is paid, submits the inspection
          report, and only then does the agreement go to both of you and to Vallo.
        </p>
      ),
    },
  ],
};

/* ------------------------------------------- messages: hotels and tables */

export const MESSAGING_A_BUSINESS: DocSection = {
  id: "messaging-a-business",
  heading: "Messaging a hotel or a restaurant",
  body: (
    <>
      <p>
        You do not need a booking to ask a hotel or a restaurant something. Where the business
        takes messages, its page carries a message button: the conversation goes to the business
        itself, one thread per business, and lives in your inbox beside your other
        conversations.
      </p>
      <p>
        The inbox keeps the two sides apart: property conversations and stays conversations
        each have their own tab.
      </p>
    </>
  ),
};
