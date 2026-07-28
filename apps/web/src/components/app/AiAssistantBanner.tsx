import Link from "next/link";
import type { Dictionary } from "@naijafinds/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * AI Assistant banner.
 *
 * The supplied card artwork, robot and all, used as the surface itself rather
 * than reproduced. The headline and sub that were baked into the render have
 * been reconstructed out of the gradient so the copy can come from the
 * dictionary and translate, which a flattened image could never do.
 *
 * The artwork is anchored right so the robot survives every aspect ratio, and
 * the text sits in the left half where the render is deliberately quiet.
 */
export function AiAssistantBanner({ t }: { t: Dictionary }) {
  return (
    <section
      aria-labelledby="nf-ai-banner-title"
      className="nf-ai-banner nf-card--interactive relative overflow-hidden rounded-[var(--nf-radius-2xl)]"
    >
      <div className="relative z-10 flex flex-col gap-5 p-5 sm:p-8 md:flex-row md:items-center">
        <div className="min-w-0 flex-1 md:max-w-[58%]">
          <h2
            id="nf-ai-banner-title"
            className="nf-h2 flex flex-wrap items-center gap-2.5 text-white"
          >
            {t.home.aiCard.title}
            <span className="nf-badge bg-white/20 text-white">Beta</span>
          </h2>

          <p className="mt-2 max-w-[42ch] text-[0.9375rem] leading-relaxed text-white/80">
            {t.home.aiCard.body}
          </p>

          <p className="mt-4">
            <span className="inline-flex max-w-full items-center gap-2 rounded-[var(--nf-radius-pill)] border border-white/25 bg-white/12 px-3.5 py-2 text-[0.8125rem] font-medium text-white/90 backdrop-blur-sm">
              <UiIcon name="search" size={14} className="shrink-0" />
              <span className="truncate">{t.home.aiCard.samplePrompt}</span>
            </span>
          </p>

          <Link
            href="/assistant"
            className="nf-btn mt-5 inline-flex bg-white text-[var(--nf-electric-700)] shadow-[0_10px_30px_-8px_rgba(0,0,0,0.5)] hover:brightness-105 sm:mt-6"
          >
            {t.home.aiCard.action}
            <UiIcon name="arrow-right" size={16} />
          </Link>
        </div>

        {/* Spacer so text never runs under the robot on wide screens. */}
        <div className="hidden md:block md:w-[38%]" aria-hidden="true" />
      </div>
    </section>
  );
}
