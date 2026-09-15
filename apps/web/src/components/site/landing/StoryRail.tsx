import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/site/Reveal";
import { CarouselRail } from "./CarouselRail";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { gatedHref } from "@/lib/site/gated-href";

/**
 * The story rail.
 *
 * Eight panels, each carrying one promise of the platform: the assistant,
 * smart search, protected payment, the whole ecosystem, the rent market and
 * round the clock support. They scroll
 * horizontally with native snap on phones and glass paging controls on
 * desktop, so the landing page tells its story as a sequence of large,
 * cinematic panels instead of another wall of text.
 *
 * Each panel is a real link into the surface it describes, so the rail is
 * navigation, not decoration. The artwork sits on a studio stage that reads as
 * a lit product shot in daylight and as a luminous plinth at night.
 *
 * ------------------------------------------------------------------------
 * THE RENTME SCENES ARE GONE FROM HERE
 * ------------------------------------------------------------------------
 *
 * This rail used to paint eight `/brand/story-*.png` renders, 6.6MB between
 * them, on the first screen a stranger sees. Two of them had the OLD RENTME
 * R-AND-HOUSE LOGO MODELLED INTO THE ARTWORK, so the dead brand was still
 * being served from the landing page after every string in the tree had been
 * renamed. **A logo baked into a PNG survives a name sweep.** That is the
 * lesson worth carrying: an image is not searchable, so image assets need
 * their own pass and a rename is not one.
 *
 * Each panel now paints one of the 87 commissioned brand objects, which are
 * already ours, already on brand, and roughly a hundredth of the weight. The
 * mask on `.nf-story-art` dissolves their white studio ground into the paper
 * stage, which is the treatment that ground was lit for.
 *
 * **These are not stand-ins.** They are the platform's own visual language and
 * the rail is complete as it stands. When supplied photography arrives, set
 * `photo` on a story and that panel paints it instead, one at a time, with no
 * other edit.
 */

type Story = {
  /** A commissioned brand object. One of the 87 in `BrandIconName`. */
  art: BrandIconName;
  /**
   * A supplied photograph for this panel, when one exists.
   *
   * **This is the slot for the founder's own artwork.** Set it to a path under
   * `/brand/` and the panel paints that instead of the brand object, with no
   * other change. Leave it out and the panel uses the object, which is on
   * brand and is not a placeholder waiting to be replaced.
   */
  photo?: string;
  /**
   * The ground the artwork was lit on, so its stage matches it exactly.
   *
   * Every one of the 87 brand objects is lit on a white studio ground, so
   * every panel using one is `paper`. Four panels were `night`, for four of
   * the removed RentMe scenes that were rendered on black; a white-ground
   * object on a night stage shows its own square as a bright box. Supplied
   * photography lit on dark can set `night` again.
   */
  stage: "paper" | "night";
  alt: string;
  overline: string;
  title: string;
  body: string;
  href: string;
  action: string;
  points: { icon: BrandIconName; label: string }[];
};

const STORIES: Story[] = [
  {
    art: "bot-chat",
    stage: "paper",
    alt: "The Vallo assistant surrounded by floating glass app cards",
    overline: "Vallo AI",
    title: "An assistant that knows every street",
    body: "Ask in plain words for a two bedroom in Lekki under 300k with a pool. It reads the whole catalogue and hands back places you can actually book.",
    href: gatedHref("/assistant"),
    action: "Meet the assistant",
    points: [
      { icon: "bot-chat", label: "Plain language search" },
      { icon: "clock-check", label: "Answers in seconds" },
    ],
  },
  {
    art: "home-search",
    stage: "paper",
    alt: "A magnifier over the Vallo house mark with a verification check",
    overline: "Smart search",
    title: "Find the exact place, not a page of noise",
    body: "Filter by city, budget and bedrooms, and by the things that actually matter here: prepaid meter, borehole, estate security, real photos.",
    href: gatedHref("/search"),
    action: "Start searching",
    points: [
      { icon: "home-search", label: "Every state covered" },
      { icon: "listing-search", label: "Real listings only" },
    ],
  },
  {
    art: "map-spot",
    stage: "paper",
    alt: "A glowing map pin over a neon city map",
    overline: "Explore nearby",
    title: "See what is around you, live on the map",
    body: "Pan the map and watch prices light up city by city. Tap a pin and the whole area opens, from Lekki to Maitama to Old GRA.",
    href: gatedHref("/search?view=map"),
    action: "Open the map",
    points: [
      { icon: "map-route", label: "Live map view" },
      { icon: "pin-map", label: "Prices per city" },
    ],
  },
  {
    art: "shield-check",
    stage: "paper",
    alt: "A neon shield holding a house, with a verification check",
    overline: "Trust and safety",
    title: "Inspect first. Pay only when you are sure",
    body: "Every listing and agent is checked before it goes live. Chats stay inside the platform, and our bot flags anyone asking for money outside it.",
    href: "/help",
    action: "How we protect you",
    points: [
      { icon: "shield-check", label: "Verified listings" },
      { icon: "user-verified", label: "Checked agents" },
    ],
  },
  {
    art: "wallet-secure",
    stage: "paper",
    alt: "A neon wallet guarded by a shield and padlock",
    overline: "Secure payments",
    title: "One naira wallet, recorded to the kobo",
    body: "Fund it, book with it, get refunded into it. Every movement is written to a ledger you can read, and we charge you nothing to use it.",
    href: gatedHref("/wallet"),
    action: "See the wallet",
    points: [
      { icon: "wallet-secure", label: "Naira wallet" },
      { icon: "card-lock", label: "Protected payments" },
    ],
  },
  {
    art: "calendar-check",
    stage: "paper",
    alt: "A neon booking calendar with a house key and a confirmation check",
    overline: "Easy booking",
    title: "From the first tap to the keys in your hand",
    body: "Pick your dates, reserve in seconds, and keep every trip, message and receipt together. Your whole move lives in one account.",
    href: gatedHref("/bookings"),
    action: "View bookings",
    points: [
      { icon: "calendar-check", label: "Instant confirmation" },
      { icon: "keys-home", label: "Trips in one place" },
    ],
  },
  {
    art: "globe-pin",
    stage: "paper",
    alt: "The Vallo world: the house mark surrounded by map, keys, calendar, wallet and shield",
    overline: "One platform",
    title: "Search, book, message and pay in one place",
    body: "Your account, your wallet, your bookings and your conversations all live together, so nothing about a move is scattered across five apps.",
    href: gatedHref("/home"),
    action: "Explore the platform",
    points: [
      { icon: "homes-sparkle", label: "Homes, hotels, more" },
      { icon: "chat-duo", label: "Message the agent" },
    ],
  },
  {
    art: "shield-home",
    stage: "paper",
    alt: "The Vallo shield mark with a verification check",
    overline: "The rent market",
    title: "Real homes, real yearly rent, real agents",
    body: "The serious side of Vallo: annual tenancies priced per year. Message the agent, inspect the property, then pay. No shortcuts, no pressure.",
    href: gatedHref("/rent"),
    action: "Browse rentals",
    points: [
      { icon: "keys-tag", label: "Annual tenancies" },
      { icon: "support-shield", label: "Protected end to end" },
    ],
  },
];

export function StoryRail() {
  return (
    <section className="pt-16 sm:pt-20" aria-labelledby="nf-story-title">
      <div className="nf-shell">
        <Reveal>
          <div className="max-w-2xl">
            <span className="nf-overline inline-flex items-center gap-2">
              <UiIcon name="sparkle" size={16} />
              The Vallo way
            </span>
            <h2 id="nf-story-title" className="nf-h2 mt-2">
              Everything a move needs, <span className="nf-gradient-text">in one place</span>
            </h2>
            <p className="mt-2.5 text-[var(--nf-content-secondary)]">
              Swipe through what Vallo does for you, from the first search to the keys in
              your hand.
            </p>
          </div>
        </Reveal>
      </div>

      <Reveal className="mt-6 sm:mt-8" delay={60}>
        <CarouselRail
          ariaLabel="What Vallo does for you"
          prevLabel="Previous promise"
          nextLabel="Next promise"
        >
          {STORIES.map((s) => (
            <li
              key={s.title}
              className="w-[85vw] max-w-[420px] shrink-0 snap-start sm:w-[62vw] lg:w-[30rem]"
            >
              <Link
                href={s.href}
                className="nf-card nf-card--interactive group flex h-full flex-col overflow-hidden p-0"
              >
                {/* Studio stage: the artwork on its own lit ground. */}
                <div
                  className={`nf-story-stage--${s.stage} relative flex aspect-[4/3] items-center justify-center overflow-hidden p-4 sm:p-6`}
                >
                  {s.photo ? (
                    <Image
                      src={s.photo}
                      alt={s.alt}
                      width={1254}
                      height={1254}
                      sizes="(max-width: 640px) 85vw, (max-width: 1024px) 62vw, 480px"
                      className="nf-story-art h-full w-auto max-w-full object-contain transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                  ) : (
                    <BrandIcon
                      name={s.art}
                      label={s.alt}
                      fill
                      className="nf-story-art h-full w-auto max-w-full object-contain transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                  )}
                </div>

                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <span className="nf-overline">{s.overline}</span>
                  <h3 className="nf-h3 mt-2 text-[1.0625rem] leading-snug sm:text-[1.1875rem]">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
                    {s.body}
                  </p>

                  <ul className="mt-4 flex flex-wrap gap-2">
                    {s.points.map((p) => (
                      <li
                        key={p.label}
                        className="nf-chip gap-2 px-2.5 py-1.5 text-[0.75rem]"
                      >
                        <span className="block h-10 w-10 shrink-0">
                          <BrandIcon name={p.icon} fill />
                        </span>
                        {p.label}
                      </li>
                    ))}
                  </ul>

                  <span className="mt-5 inline-flex items-center gap-1.5 text-[0.875rem] font-semibold text-[var(--nf-electric-300)]">
                    {s.action}
                    <UiIcon
                      name="arrow-right"
                      size={16}
                      className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                    />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </CarouselRail>
      </Reveal>
    </section>
  );
}
