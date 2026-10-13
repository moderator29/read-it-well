import type { ReactNode } from "react";
import { isValidElement } from "react";
import { CHAPTERS } from "@/app/(site)/docs/chapters";
import { GUIDES, blockText } from "@/lib/guides/articles";
import { TERMS_SECTIONS } from "@/lib/legal/terms";
import { PRIVACY_SECTIONS } from "@/lib/legal/privacy";
import { FAQS } from "./help-articles";
import { topicId } from "@/app/(site)/help/topics";
import type { SearchEntry } from "./search";

/**
 * Every searchable thing on Vallo's public help surfaces, as plain entries.
 *
 * Built on the server (the docs chapters are React elements, and the browser
 * must not carry the whole document), handed to the search as plain data.
 * Nothing here is written twice: each entry is read from the list the page
 * itself renders, so a corrected answer is corrected in search too.
 */

/**
 * The text a node prints. Walks elements and their children only; a custom
 * component (a diagram, say) is not called, so it contributes nothing, which is
 * right for search: only words a person reads belong in it.
 */
export function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join(" ");
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode };
    return textOf(props.children);
  }
  return "";
}

const squash = (value: string) => value.replace(/\s+/g, " ").trim();

/** A cap per entry keeps the index small enough to fetch on a phone. */
const TEXT_CAP = 900;

/** The static policy pages, one entry each: what they are and where they live. */
const POLICY_PAGES: { href: string; title: string; text: string }[] = [
  {
    href: "/safety",
    title: "Safety centre",
    text: "How paying works, how inspections work, and what Vallo will never ask you for. Never pay outside Vallo. Never share account numbers in chat. Report a suspicious listing or person.",
  },
  {
    href: "/standards",
    title: "Trust and safety standards",
    text: "What is not allowed on Vallo, how it is enforced, and how quickly a report is answered.",
  },
  {
    href: "/cancellations",
    title: "Cancellations and refunds",
    text: "The refund schedule for a paid stay, with the windows written out. How to cancel a booking and what comes back to you.",
  },
  {
    href: "/disclaimer",
    title: "Disclaimer",
    text: "What Vallo is not responsible for, and what a listing or a badge does not promise.",
  },
  {
    href: "/delete-account",
    title: "Delete your account",
    text: "How to ask for your account to be deleted, what is destroyed and what is kept, and for how long.",
  },
];

export function buildSupportEntries(): SearchEntry[] {
  const entries: SearchEntry[] = [];

  FAQS.forEach((faq, index) => {
    entries.push({
      id: `help-${index}`,
      section: "help",
      title: faq.q,
      trail: faq.category,
      text: squash(faq.a),
      href: `/help#${topicId(faq.category)}`,
    });
  });

  for (const chapter of CHAPTERS) {
    entries.push({
      id: `docs-${chapter.slug}`,
      section: "docs",
      title: chapter.title,
      trail: `Docs, chapter ${chapter.number}`,
      text: squash(chapter.summary),
      href: `/docs/${chapter.slug}`,
    });
    for (const section of chapter.sections) {
      entries.push({
        id: `docs-${chapter.slug}-${section.id}`,
        section: "docs",
        title: section.heading,
        trail: `Docs, ${chapter.title}`,
        text: squash(textOf(section.body)).slice(0, TEXT_CAP),
        href: `/docs/${chapter.slug}#${section.id}`,
      });
    }
  }

  for (const guide of GUIDES) {
    entries.push({
      id: `guides-${guide.slug}`,
      section: "guides",
      title: guide.title,
      trail: "Guides",
      text: squash(guide.description),
      href: `/guides/${guide.slug}`,
    });
    for (const section of guide.sections) {
      entries.push({
        id: `guides-${guide.slug}-${section.id}`,
        section: "guides",
        title: section.title,
        trail: `Guides, ${guide.title}`,
        text: squash(section.blocks.flatMap(blockText).join(" ")).slice(0, TEXT_CAP),
        href: `/guides/${guide.slug}#${section.id}`,
      });
    }
  }

  for (const page of POLICY_PAGES) {
    entries.push({ id: `legal-${page.href.slice(1)}`, section: "legal", trail: "Legal and safety", ...page });
  }
  TERMS_SECTIONS.forEach((section, index) => {
    entries.push({
      id: `legal-terms-${index}`,
      section: "legal",
      title: section.title.replace(/^\d+\.\s*/, ""),
      trail: "Terms of service",
      text: squash(textOf(section.body)).slice(0, TEXT_CAP),
      href: "/terms",
    });
  });
  PRIVACY_SECTIONS.forEach((section, index) => {
    entries.push({
      id: `legal-privacy-${index}`,
      section: "legal",
      title: section.title.replace(/^\d+\.\s*/, ""),
      trail: "Privacy policy",
      text: squash(textOf(section.body)).slice(0, TEXT_CAP),
      href: section.id ? `/privacy#${section.id}` : "/privacy",
    });
  });

  return entries;
}
