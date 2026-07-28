"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Dictionary } from "@naijafinds/i18n";
import { MODE_COOKIE, type Mode } from "@/lib/mode.constants";
import { Icon } from "@/design-system/icons/Icon";

/**
 * Mode switch control, matching the "Choose your mode" sheet in the reference.
 *
 * Writes the mode cookie and refreshes the server tree so the correct workspace
 * renders. Presented as a two-option picker rather than a silent toggle so the
 * difference between Personal and Agent is explicit every time, which the design
 * direction calls for.
 */
export function ModeSwitcher({
  t,
  current,
  variant = "menu",
}: {
  t: Dictionary;
  current: Mode;
  variant?: "menu" | "picker";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function choose(next: Mode) {
    document.cookie = `${MODE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => {
      router.push(next === "agent" ? "/agent/dashboard" : "/home");
      router.refresh();
    });
  }

  const other: Mode = current === "agent" ? "personal" : "agent";

  // Compact control used inside a rail: a single row that flips to the other mode.
  if (variant === "menu") {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => choose(other)}
        className="flex w-full items-center gap-2.5 rounded-[var(--nf-radius-md)] px-3 py-2.5 text-[0.875rem] font-semibold text-[var(--nf-content-secondary)] transition-colors hover:bg-[var(--nf-glass-fill)] hover:text-[var(--nf-content-primary)] disabled:opacity-60"
      >
        <Icon name={other === "agent" ? "apartment" : "profile"} size={26} />
        <span className="flex-1 text-left leading-tight">
          {other === "agent" ? t.agent.mode.switchToAgent : t.agent.mode.switchToPersonal}
          <span className="block text-[0.75rem] font-normal text-[var(--nf-content-muted)]">
            {t.agent.mode.manageSub}
          </span>
        </span>
      </button>
    );
  }

  // Full picker: the "Choose your mode" card.
  const options: { mode: Mode; icon: "profile" | "apartment"; label: string; desc: string }[] = [
    { mode: "personal", icon: "profile", label: t.agent.mode.personal, desc: t.agent.mode.personalDesc },
    { mode: "agent", icon: "apartment", label: t.agent.mode.agent, desc: t.agent.mode.agentDesc },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="nf-chip"
      >
        <Icon name={current === "agent" ? "apartment" : "profile"} size={18} />
        {current === "agent" ? t.agent.mode.agent : t.agent.mode.personal}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[19rem] rounded-[var(--nf-radius-xl)] border border-[var(--nf-border-default)] bg-[var(--nf-surface-elevated)] p-3 shadow-[var(--nf-shadow-float)]">
          <p className="px-1 pb-2 pt-1">
            <span className="block text-[0.9375rem] font-semibold">{t.agent.mode.chooseTitle}</span>
            <span className="block text-[0.75rem] text-[var(--nf-content-muted)]">
              {t.agent.mode.chooseSub}
            </span>
          </p>
          <ul className="space-y-2">
            {options.map((o) => (
              <li key={o.mode}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => choose(o.mode)}
                  aria-current={o.mode === current ? "true" : undefined}
                  className={[
                    "flex w-full items-center gap-3 rounded-[var(--nf-radius-lg)] border p-3 text-left transition-colors disabled:opacity-60",
                    o.mode === current
                      ? "border-[var(--nf-border-brand)] bg-[color-mix(in_oklab,var(--nf-brand-primary)_16%,transparent)]"
                      : "border-[var(--nf-border-subtle)] hover:border-[var(--nf-border-default)]",
                  ].join(" ")}
                >
                  <Icon name={o.icon} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.875rem] font-semibold">{o.label}</span>
                    <span className="block text-[0.75rem] text-[var(--nf-content-muted)]">
                      {o.desc}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
