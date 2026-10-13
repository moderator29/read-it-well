import Link from "next/link";
import { NO_INSPECTION_FEE, OFF_PLATFORM_SENTENCE, PAYMENT_GATE_SENTENCE, PRIVATE_FEE_NOTE } from "@/lib/money/copy";
import { SUPPLY_DOOR_HREF } from "@/lib/supply/roles";
import type { DocChapter, DocSection } from "./chapters";
import { DocsFlow } from "./DocsFlow";

/**
 * THE CHAPTERS WRITTEN FROM THE FOUNDER'S DECISIONS OF 13 OCTOBER 2026
 * (docs/DECISIONS_2026-10-13.md): a quick start for each kind of person, what
 * Vallo costs, viewings, hosting a hotel, shortlet or restaurant, badges, and
 * the messaging section.
 *
 * The same rules as `chapters.tsx`: nothing here describes a feature that is
 * not built. Where a decision is made but its code is on another branch, the
 * detail is left out of these pages and listed in the decisions document under
 * "to document when merged". No provider is named: the product speaks as
 * Vallo, and money is described by what it does.
 */

const A = "font-semibold text-[var(--nf-content-link)] hover:underline";

/* ---------------------------------------------------------- quick start */

export const QUICK_START: DocChapter = {
  slug: "quick-start",
  number: 0,
  title: "Quick start",
  summary:
    "The first five things to do, whether you are renting, letting, selling as an agent, hosting a hotel, shortlet or restaurant, or offering a professional service.",
  icon: "house-sparkle",
  sections: [
    {
      id: "renter",
      heading: "If you are looking for a home or a stay",
      body: (
        <>
          <ol role="list">
            <li>
              Make an account. It is free, and so is looking, saving, messaging and asking to
              view.
            </li>
            <li>
              <Link href="/search" className={A}>
                Search
              </Link>{" "}
              and use the filters. Light, water and the gate are filters, not small print.
            </li>
            <li>Message the lister from the listing with anything you want to know.</li>
            <li>Pick a free viewing slot, or ask for a time that suits you. Viewing never costs money.</li>
            <li>
              After you have seen the place, decide. Money moves for a rental or a sale only after
              the viewing and your decision.
            </li>
          </ol>
          <p>
            Read <Link href="/docs/viewings" className={A}>Viewings</Link> and{" "}
            <Link href="/docs/what-vallo-costs" className={A}>What Vallo costs</Link> next.
          </p>
        </>
      ),
    },
    {
      id: "landlord",
      heading: "If you own a property and want to let or sell it",
      body: (
        <>
          <ol role="list">
            <li>
              Open{" "}
              <Link href={SUPPLY_DOOR_HREF} className={A}>
                the supplier chooser
              </Link>{" "}
              and pick the owner door.
            </li>
            <li>Tell Vallo who you are. A person at Vallo reviews it.</li>
            <li>Post the listing with clear photos and videos, the price and every cost the tenant will meet.</li>
            <li>Vallo reviews the listing before it is published. If it needs more, you are told what, and you can edit and send it again.</li>
            <li>Answer viewing requests and messages from the thread.</li>
          </ol>
          <p>
            Listing is free. An account is either an owner (landlord) account or an agent account,
            never both. If you are both, you use two accounts.
          </p>
        </>
      ),
    },
    {
      id: "agent",
      heading: "If you are an agent or a registered firm",
      body: (
        <>
          <ol role="list">
            <li>Apply through the agent or firm door. A person at Vallo checks your identity and, for a firm, its papers.</li>
            <li>Post listings the same way an owner does. Each is reviewed before it is published.</li>
            <li>Keep your calendar of viewing slots up to date so renters can book at once.</li>
            <li>Reply quickly. Reply speed is one of the things a badge can recognise.</li>
          </ol>
          <p>
            Read <Link href="/docs/for-agents" className={A}>For agents and hosts</Link> and{" "}
            <Link href="/docs/badges-and-verification" className={A}>Badges and verification</Link>.
          </p>
        </>
      ),
    },
    {
      id: "host",
      heading: "If you run a hotel, a shortlet or a restaurant",
      body: (
        <>
          <ol role="list">
            <li>Choose the hotel, shortlet or restaurant door and work through the host setup.</li>
            <li>Add your identity and business papers. Vallo reviews them.</li>
            <li>Set your rooms, rates and calendar, or your tables and hours.</li>
            <li>Agree to the Terms, the Privacy Policy and the <Link href="/host-agreement" className={A}>Host Agreement</Link>, then publish.</li>
          </ol>
          <p>
            Read <Link href="/docs/hosting" className={A}>Hosting a hotel, shortlet or restaurant</Link>.
          </p>
        </>
      ),
    },
    {
      id: "photos-and-videos",
      heading: "Photos and videos for a listing",
      body: (
        <ul role="list">
          <li>Photos and videos go in one uploader.</li>
          <li>A listing needs at least 3 items. 5 is recommended.</li>
          <li>The first item is the cover, and the cover must be a photo.</li>
          <li>You can add up to 3 videos. Each can be up to 100MB and 60 seconds, as MP4, MOV or WebM.</li>
          <li>Sale prices can be up to 50 billion naira.</li>
        </ul>
      ),
    },
    {
      id: "professional",
      heading: "If you work in property professionally",
      body: (
        <>
          <p>
            Agents and registered firms are the professional accounts on Vallo. They go through
            the same identity checks as everyone who lists, and the verification ladder shows
            how far each has climbed. Start with{" "}
            <Link href="/docs/listing-on-vallo" className={A}>Listing on Vallo</Link>.
          </p>
        </>
      ),
    },
  ],
};

/* ------------------------------------------------------ what it costs */

export const WHAT_VALLO_COSTS: DocChapter = {
  slug: "what-vallo-costs",
  number: 0,
  title: "What Vallo costs",
  summary:
    "Vallo is free to use and free to list on. It charges only when a deal is completed. A Pro plan is optional and nobody has to pay a monthly subscription.",
  icon: "shield-check",
  sections: [
    {
      id: "free-to-use",
      heading: "Free to use, free to list",
      body: (
        <>
          <p>
            Making an account is free. Searching, saving, messaging and asking to view a property
            are free. Listing a property is free.
          </p>
          <p>
            No one has to pay a monthly subscription to use Vallo, whether they rent, let, sell,
            host or work as an agent.
          </p>
        </>
      ),
    },
    {
      id: "only-on-a-deal",
      heading: "Vallo charges only on a completed deal",
      body: (
        <>
          <p>
            When a deal is completed, Vallo charges a fee. It is shown to the lister in naira. A
            renter or a guest pays the price on the listing, with nothing added by Vallo. Until a
            deal is completed, Vallo charges nothing.
          </p>
          <p>{NO_INSPECTION_FEE}</p>
        </>
      ),
    },
    {
      id: "pro",
      heading: "The Pro plan is optional",
      body: (
        <p>
          Vallo offers an optional Pro plan. It is never required to list, to book, to view or to
          get paid, and nothing you can do on Vallo is locked behind it.
        </p>
      ),
    },
    {
      id: "see-every-cost",
      heading: "Every cost is shown before you book",
      body: (
        <>
          <p>
            Before you confirm a booking you see the total. Anything a host or lister charges
            must be listed on Vallo. A host must not charge anything that is not listed on the
            page, and must not add a charge without saying why.
          </p>
          <p>
            If someone asks you for a charge that is not listed, do not pay it. {PRIVATE_FEE_NOTE}{" "}
            Report it from the listing or the thread.
          </p>
        </>
      ),
    },
    {
      id: "who-holds-the-money",
      heading: "Who holds the money",
      body: (
        <>
          <p>
            Vallo does not hold customer money. Payments, and escrow where it is used, are held
            by licensed payment partners. Vallo records what happened and shows you where your
            payment stands.
          </p>
          <p>{PAYMENT_GATE_SENTENCE}</p>
          <p>
            For how a payment is split, refunded and recorded, read{" "}
            <Link href="/docs/money-and-the-guarantee" className={A}>Money and the guarantee</Link>.
          </p>
        </>
      ),
    },
  ],
};

/* ------------------------------------------------------------ viewings */

export const VIEWINGS: DocChapter = {
  slug: "viewings",
  number: 0,
  title: "Viewings",
  summary:
    "How to see a property before any money moves: book a free slot or ask for a time, what the lister can answer, the reminders you get, and how a viewing is closed.",
  icon: "calendar-clock",
  sections: [
    {
      id: "viewing-is-free",
      heading: "A viewing never takes money",
      body: (
        <p>
          {NO_INSPECTION_FEE} Money for a rental or a sale moves only after you have seen the
          property and decided.
        </p>
      ),
    },
    {
      id: "two-ways",
      heading: "Two ways to get a viewing",
      body: (
        <>
          <DocsFlow
            label="Getting a viewing"
            steps={[
              { object: "calendar-check", label: "Pick a free slot" },
              { object: "home-check", label: "Booked at once" },
            ]}
          />
          <p>
            <strong>Pick a free slot.</strong> Where the lister has published viewing times, you
            see the free ones on the listing. Tap one and the viewing is booked at once.
          </p>
          <p>
            <strong>Ask for a time.</strong> If no slot suits you, ask for the time you want. The
            lister then confirms it, offers you another time, or declines. You are told which. If
            the lister offers another time, you can take it in one tap. The times are Lagos time.
          </p>
        </>
      ),
    },
    {
      id: "reminders",
      heading: "Reminders",
      body: (
        <p>
          The renter and the lister are both reminded twice: in the evening before the viewing,
          from 19:00 Lagos time, and again two hours before it.
        </p>
      ),
    },
    {
      id: "changing",
      heading: "Changing your mind",
      body: (
        <p>
          A renter can withdraw a request or cancel a booked viewing, and the lister is told.
          A lister can offer another time or cancel, and may add a line saying why. Either way the
          chat stays open.
        </p>
      ),
    },
    {
      id: "closing",
      heading: "After the viewing",
      body: (
        <>
          <p>
            Once the time has passed, either side can mark the viewing complete and say how it
            went: <strong>inspected</strong>, <strong>deal done</strong> or <strong>no deal</strong>.
            A viewing report with photos and answers to Vallo's questions about the place can be
            added to the record.
          </p>
          <p>{PAYMENT_GATE_SENTENCE}</p>
        </>
      ),
    },
    {
      id: "no-show",
      heading: "If somebody does not come",
      body: (
        <>
          <p>
            Either side can report a no-show once the viewing time has come, and for up to 14 days
            after it. The person reported can dispute it within 48 hours. If it is disputed, a
            person at Vallo looks at both sides and decides.
          </p>
        </>
      ),
    },
    {
      id: "safety",
      heading: "Staying safe at a viewing",
      body: (
        <p>
          Keep the arrangement in the Vallo chat. {OFF_PLATFORM_SENTENCE} Never pay a fee to see a
          property. Read the{" "}
          <Link href="/safety" className={A}>Safety centre</Link>.
        </p>
      ),
    },
  ],
};

/* ------------------------------------------------------------- hosting */

export const HOSTING: DocChapter = {
  slug: "hosting",
  number: 0,
  title: "Hosting a hotel, shortlet or restaurant",
  summary:
    "The host setup, what Vallo reviews, what happens if you are sent back, the rules every host agrees to, and how tables and nights are booked.",
  icon: "keys-handover",
  sections: [
    {
      id: "setup",
      heading: "The host setup",
      body: (
        <>
          <DocsFlow
            label="From setup to published"
            steps={[
              { object: "person-card", label: "Choose your door" },
              { object: "id-card-check", label: "ID and business papers" },
              { object: "doc-review", label: "Vallo reviews" },
              { object: "home-check", label: "Publish" },
            ]}
          />
          <p>
            Hotels, shortlets and restaurants are set up through one host wizard. You give your
            identity, your business papers and the details of the place. A person at Vallo reviews
            them before you are published. Start from{" "}
            <Link href={SUPPLY_DOOR_HREF} className={A}>the supplier chooser</Link>.
          </p>
        </>
      ),
    },
    {
      id: "sent-back",
      heading: "If Vallo sends it back",
      body: (
        <p>
          If something is missing or unclear, Vallo tells you what to fix. You edit the same
          application and send it again; you do not start over. While you set up, Vallo asks
          before you leave a step with changes you have not saved.
        </p>
      ),
    },
    {
      id: "rules",
      heading: "The rules every host agrees to",
      body: (
        <>
          <ul role="list">
            <li>You agree to the <Link href="/terms" className={A}>Terms</Link>, the <Link href="/privacy" className={A}>Privacy Policy</Link> and the <Link href="/host-agreement" className={A}>Host Agreement</Link> before you create a host account or publish.</li>
            <li>You do not charge anything that is not listed on Vallo.</li>
            <li>You do not add a charge without a stated reason.</li>
            <li>Every cost a guest will meet, including any charge at the door (a caution deposit, power, cleaning, an extra guest or a visitor), is listed before they book, so they see the full total before they confirm.</li>
          </ul>
        </>
      ),
    },
    {
      id: "stays",
      heading: "Hotels and shortlets",
      body: (
        <p>
          You set your rooms or units, your nightly rates and your calendar, and choose a
          cancellation policy for your stays: Flexible, Moderate, Firm or Strict. The refund schedule that applies to a paid stay is
          on the{" "}
          <Link href="/cancellations" className={A}>Cancellations</Link> page, and the guest sees
          it before they pay.
        </p>
      ),
    },
    {
      id: "restaurants",
      heading: "Restaurants",
      body: (
        <>
          <p>
            A guest asks for a table, which is free, and no money is paid in advance. You confirm
            the table when you have one, and the diner pays the bill at your restaurant.
          </p>
          <p>
            Each booking has a check-in code. After the time, you mark the table seated, for
            example by entering the diner&apos;s code, or mark it a no-show. If you do not answer,
            Vallo asks the diner the next day whether they dined. If you and the diner disagree,
            Vallo decides.
          </p>
          <p>
            Only diners whose table was seated can review the restaurant. Listing is free; Vallo
            charges a restaurant a fixed fee only for each guest seated from a Vallo booking, shown
            in your host settings before it applies. See the{" "}
            <Link href="/host-agreement" className={A}>Host Agreement</Link>.
          </p>
        </>
      ),
    },
  ],
};

/* -------------------------------------------------------------- badges */

export const BADGES_AND_VERIFICATION: DocChapter = {
  slug: "badges-and-verification",
  number: 0,
  title: "Badges and verification",
  summary:
    "What the verification ladder and the badges mean, how they are earned, and what they do not mean. A badge is not a guarantee against fraud.",
  icon: "shield-check",
  sections: [
    {
      id: "what-a-badge-means",
      heading: "What a badge means",
      body: (
        <>
          <p>
            Verification and badges are signals. The verification ladder says what Vallo has
            checked about a lister, one rung at a time. A badge says something a person has
            earned, such as replying quickly.
          </p>
          <p>
            A person at Vallo decides each verification rung. Most badges are awarded
            automatically each night from what has actually happened on the platform. Vallo can
            also remove a badge if something changes.
          </p>
        </>
      ),
    },
    {
      id: "what-it-does-not-mean",
      heading: "What a badge does not mean",
      body: (
        <>
          <p>
            A badge is not a guarantee. It does not promise that a person will never behave badly,
            that a listing is exactly as described or that a deal will go well. It is one thing to
            weigh alongside the listing, the photos, the conversation and a viewing.
          </p>
          <p>
            Whatever the badge says, pay only inside Vallo, and only after the viewing.
          </p>
        </>
      ),
    },
    {
      id: "agent-badges",
      heading: "Agent badges",
      body: (
        <ul role="list">
          <li><strong>Verified agent.</strong> Identity and payout account checked and the application approved.</li>
          <li><strong>First listing.</strong> The first listing was published.</li>
          <li><strong>Fast responder.</strong> A quick typical first reply across many conversations.</li>
          <li><strong>Ten stays.</strong> Ten bookings completed.</li>
          <li><strong>Estate specialist.</strong> Several published listings in one area.</li>
          <li><strong>Photo pro.</strong> Listings that passed the photo checks.</li>
          <li><strong>Vallo Elite.</strong> A high bar over time. It is removed while there is an open trust flag.</li>
        </ul>
      ),
    },
    {
      id: "member-badges",
      heading: "Member badges",
      body: (
        <ul role="list">
          <li><strong>Verified member.</strong> Email and phone confirmed.</li>
          <li><strong>First stay.</strong> A first completed booking.</li>
          <li><strong>Honest reviewer.</strong> Reviews written after real stays.</li>
          <li><strong>Neighbour</strong> and <strong>Local guide.</strong> Helpful contributions to a place on Around.</li>
          <li><strong>Year one.</strong> A year since joining.</li>
          <li><strong>Top contributor.</strong> Given by Vallo to someone who has helped others.</li>
        </ul>
      ),
    },
  ],
};

/* ------------------------------------------------------------ messaging */

export const MESSAGE_TOOLS: DocSection = {
  id: "message-tools",
  heading: "Replying, forwarding, deleting and calling",
  body: (
    <>
      <ul role="list">
        <li><strong>Reply</strong> to a particular message so everyone sees which one you mean.</li>
        <li><strong>Forward</strong> a message to another conversation.</li>
        <li><strong>Delete for me</strong> removes a message from your own view only.</li>
        <li><strong>Delete for everyone</strong> removes it for both sides, and works for 2 days and 12 hours after the message was sent.</li>
        <li><strong>Call</strong> by voice or video from inside the conversation, so the call stays on Vallo.</li>
      </ul>
      <p>
        Messages from people you do not follow arrive as <strong>Requests</strong>, so a stranger
        cannot fill your inbox. Requests wait in their own tab until you open them.
      </p>
      <p>
        Do not share account numbers in chat. Messages that look like account numbers are
        flagged to the Vallo team.
      </p>
    </>
  ),
};
