import Image from "next/image";
import Link from "next/link";
import type { Dictionary } from "@naijafinds/i18n";

/**
 * AI Assistant banner.
 *
 * The supplied neon card artwork is the banner: frame, headline and robot are
 * one lit render, so nothing is reconstructed over it. The whole card is a
 * single link into the assistant, with the dictionary copy carried on the
 * accessible name so screen readers still get a translated announcement.
 */
export function AiAssistantBanner({ t }: { t: Dictionary }) {
  return (
    <Link
      href="/assistant"
      aria-label={`${t.home.aiCard.title}. ${t.home.aiCard.body} ${t.home.aiCard.action}.`}
      className="nf-ai-banner nf-card--interactive relative block overflow-hidden rounded-[var(--nf-radius-2xl)]"
    >
      <Image
        src="/brand/ai-banner.png"
        alt=""
        width={1536}
        height={1024}
        sizes="(max-width: 768px) 100vw, 900px"
        className="h-full w-full object-cover"
      />
    </Link>
  );
}
