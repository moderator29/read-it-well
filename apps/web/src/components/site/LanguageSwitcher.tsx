"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LOCALES, localeMeta, type Locale } from "@vallo/i18n";
import { LOCALE_COOKIE } from "@/lib/locale.constants";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * Language switcher.
 *
 * Writes the choice to a cookie and refreshes the server tree so every string,
 * number and date re-renders in the new locale. Deliberately a real `<select>`
 * so it is keyboard operable and announces correctly, rather than a bespoke
 * dropdown that would need a pile of ARIA to match.
 */
export function LanguageSwitcher({
  current,
  label,
  compact = false,
}: {
  current: Locale;
  label: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState<Locale>(current);

  function change(next: Locale) {
    setValue(next);
    // One year, lax. No personal data, so no consent gate needed for this one.
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => change(e.target.value as Locale)}
        disabled={pending}
        className="nf-btn nf-btn--primary min-h-11 appearance-none cursor-pointer px-row py-inline pr-block text-[0.8125rem] disabled:opacity-60"
        style={{ paddingBlock: compact ? "0.35rem" : undefined }}
      >
        {LOCALES.map((l) => (
          <option key={l} value={l} style={{ background: "var(--nf-surface-elevated)" }}>
            {compact ? localeMeta[l].short : localeMeta[l].native}
          </option>
        ))}
      </select>
      <UiIcon
        name="chevron-down"
        size="xs"
        className="pointer-events-none absolute right-2.5 opacity-60"
      />
    </label>
  );
}
