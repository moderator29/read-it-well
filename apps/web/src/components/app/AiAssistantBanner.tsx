import Image from "next/image";
import Link from "next/link";
import type { Dictionary } from "@naijafinds/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * AI Assistant banner.
 *
 * The supplied neon card artwork is the surface: frame, headline and robot are
 * one lit render. A quick-ask bar rides its lower edge, a compact input that
 * carries the question into the assistant via ?q=, beside the white pill from
 * the classic banner. The artwork itself is also a link into the assistant.
 */
export function AiAssistantBanner({ t }: { t: Dictionary }) {
  return (
    <section
      aria-labelledby="nf-ai-banner-title"
      className="nf-ai-banner nf-card--interactive relative overflow-hidden rounded-[var(--nf-radius-2xl)]"
    >
      <h2 id="nf-ai-banner-title" className="sr-only">
        {t.home.aiCard.title}
      </h2>

      <Link
        href="/assistant"
        aria-label={`${t.home.aiCard.title}. ${t.home.aiCard.body}`}
        className="absolute inset-0"
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

      {/* Quick ask. GET into the assistant, which seeds the composer from ?q=. */}
      <form
        action="/assistant"
        method="get"
        className="absolute inset-x-3 bottom-3 z-10 flex items-center gap-2 sm:inset-x-auto sm:left-6 sm:bottom-5 sm:w-[62%] sm:max-w-[420px]"
      >
        <label htmlFor="nf-ai-quick-ask" className="sr-only">
          {t.home.aiCard.samplePrompt}
        </label>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[var(--nf-radius-pill)] border border-white/25 bg-[rgb(1_1_24_/_0.55)] px-3 py-2 backdrop-blur-md">
          <UiIcon name="search" size={14} className="shrink-0 text-white/70" />
          <input
            id="nf-ai-quick-ask"
            name="q"
            type="text"
            autoComplete="off"
            placeholder={t.home.aiCard.samplePrompt}
            className="w-full min-w-0 bg-transparent text-[0.8125rem] text-white outline-none placeholder:text-white/55"
          />
        </div>
        <button
          type="submit"
          className="nf-btn shrink-0 whitespace-nowrap bg-white px-3.5 py-2 text-[0.8125rem] font-semibold text-[var(--nf-electric-700)] shadow-[0_10px_30px_-8px_rgba(0,0,0,0.5)] hover:brightness-105"
        >
          {t.home.aiCard.action}
        </button>
      </form>
    </section>
  );
}
