import Image from "next/image";
import Link from "next/link";
import type { Dictionary } from "@naijafinds/i18n";

/**
 * AI Assistant banner.
 *
 * The supplied neon card artwork is the surface: frame, headline and robot
 * are one lit render. The whole card is a single link into the assistant,
 * with the classic white pill sitting bottom left, clear of the robot.
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
      {/*
        The pill sits on artwork, so it is white with brand ink in both themes
        deliberately. It used to say so with `bg-white`, a raw layer-1 deep
        electric blue and a raw rgba shadow: three literals in one line, none of
        which any theme could reach. The ground is the media ink token, which is
        white in both themes because what is under it is a night render, and the
        type on it takes the strong brand primary.
      */}
      <span className="nf-btn absolute bottom-3 left-4 z-10 bg-[var(--nf-content-on-media)] px-3.5 py-2 text-[0.8125rem] font-semibold text-[var(--nf-brand-primary-strong)] shadow-[var(--nf-elev-2)] sm:bottom-5 sm:left-6">
        {t.home.aiCard.action}
      </span>
    </Link>
  );
}
