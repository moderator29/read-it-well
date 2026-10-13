import { ImageResponse } from "next/og";
import type { OgCheck } from "@/components/share/og-share-card";
import { ogCentredCard } from "@/components/share/og-centred-card";
import { asJpeg, ogFonts } from "@/app/s/[token]/door-image";
import { BRAND_DOMAIN } from "@/lib/brand-domain";

/**
 * A13. ONE SHARE CARD PER PUBLIC PAGE FAMILY.
 *
 * Every public page used to unfurl as the same generic poster. Each family
 * (help, safety, standards, the two checks, about, the supply doors, the
 * calculator, the guides) now draws its own card through the share-card
 * frame (`components/share/og-share-card.tsx`, UIUX 23), which says what the
 * page is. The words are fixed per page and carry no query and no person, so
 * a card for `/check?q=0803...` is the same card as `/check`.
 *
 * English, because an unfurler has no cookie and so always reads the
 * default locale; the page itself follows the reader's choice.
 */
export const PAGE_CARD_SIZE = { width: 1200, height: 630 };
export const PAGE_CARD_TYPE = "image/jpeg";

export type PageCard = {
  title: string;
  chip: string;
  /** The big line in the well: what the page lets you do. */
  figure: string;
  checks?: readonly OgCheck[];
  honest?: string;
};

/**
 * W3 (round 5): CENTRED, FOR THE SQUARE WHATSAPP CUTS, AND ONE IDEA.
 *
 * The card was the share card frame, laid out from the left, with up to
 * three green ticks in its well. Cut to WhatsApp's centre square it kept the
 * middle of the headline and the ticks, which at 88pt read as "verified":
 * a trust mark beside a sentence such as "Paste a number or a VA- code",
 * which is a feature, not a state anybody earned (CRAFT-PRINCIPLES 1.5: a
 * semantic colour only on the element whose state it describes). Now: the
 * chip as the eyebrow, the page's question in the display face, and ONE
 * supporting line (the honest line, else the first point), centred. The
 * rest of the list is the page's job. The words are the same fixed words.
 */
export async function pageCardImage(card: PageCard): Promise<Response> {
  const image = new ImageResponse(
    ogCentredCard({
      eyebrow: card.chip,
      display: card.figure,
      sub: card.honest ?? card.checks?.[0]?.label ?? null,
      footRight: BRAND_DOMAIN,
    }),
    { ...PAGE_CARD_SIZE, fonts: await ogFonts() },
  );
  return asJpeg(image, false);
}

/** The fixed cards, by page family. */
export const PAGE_CARDS = {
  check: {
    title: "Check before you pay",
    chip: "Free, no account",
    figure: "Is this a Vallo agent?",
    checks: [
      { tone: "success", label: "Paste a number or a VA- code" },
      { tone: "success", label: "See the agent's public name, never their number" },
      { tone: "warning", label: "No match? Do not pay them" },
    ],
  },
  receipt: {
    title: "Check a Vallo receipt",
    chip: "Free, no account",
    figure: "Is this receipt genuine?",
    checks: [{ tone: "success", label: "Type the code printed on the receipt" }],
  },
  moveIn: {
    title: "Move-in cost",
    chip: "Calculator",
    figure: "What will it really cost to move in?",
    checks: [
      { tone: "success", label: "Rent, agency, legal, caution, service charge" },
      { tone: "success", label: "Every year asked up front, added in" },
    ],
    honest: "Only the figures you type. Nothing printed as typical.",
  },
  help: {
    title: "Vallo help centre",
    chip: "Help",
    figure: "Answers about renting, stays and paying",
    checks: [{ tone: "success", label: "Search the answers, or write to a person" }],
  },
  safety: {
    title: "Vallo safety centre",
    chip: "Safety",
    figure: "Never pay outside Vallo",
    checks: [
      { tone: "success", label: "How paying works on both sides" },
      { tone: "success", label: "What Vallo will never ask you for" },
      { tone: "warning", label: "How to report someone" },
    ],
  },
  standards: {
    title: "Vallo standards",
    chip: "Standards",
    figure: "What we look at, and how fast we answer",
    checks: [{ tone: "success", label: "The ladder, the response times, the rules" }],
  },
  about: {
    title: "About Vallo",
    chip: "About",
    /* D1: the slogan, which retired "Rent, buy or stay, without the runaround". */
    figure: "Space, without the runaround.",
    checks: [{ tone: "success", label: "The move-in cost written down before you call" }],
  },
  agents: {
    title: "For agents",
    chip: "List on Vallo",
    figure: "List on Vallo as an agent",
    checks: [
      { tone: "success", label: "The steps, the fees and how you are paid" },
      { tone: "success", label: "What Vallo looks at, and what it does not" },
    ],
  },
  hosts: {
    title: "For hosts",
    chip: "Host on Vallo",
    figure: "Host stays on Vallo",
    checks: [
      { tone: "success", label: "Hotels, shortlets and restaurants" },
      { tone: "success", label: "The steps, the fees and how you are paid" },
    ],
  },
  landlords: {
    title: "For landlords",
    chip: "Let on Vallo",
    figure: "Let your property on Vallo",
    checks: [
      { tone: "success", label: "With or without a title document" },
      { tone: "success", label: "The steps, the fees and how rent arrives" },
    ],
  },
  guides: {
    title: "Vallo guides",
    chip: "Guides",
    figure: "Renting and staying in Nigeria, explained",
    checks: [
      { tone: "success", label: "Avoiding rental scams" },
      { tone: "success", label: "What a move-in total includes" },
    ],
  },
} satisfies Record<string, PageCard>;
