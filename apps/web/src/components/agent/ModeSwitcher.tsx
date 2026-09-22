"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Dictionary } from "@vallo/i18n";
import { writeModeCookie, type Mode } from "@/lib/mode.constants";
import { BrandIcon } from "@/design-system/icons/BrandIcon";

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
    writeModeCookie(next);
    startTransition(() => {
      router.push(next === "working" ? "/agent/dashboard" : "/home");
      router.refresh();
    });
  }

  const other: Mode = current === "working" ? "personal" : "working";

  // Compact control used inside a rail: a single row that flips to the other mode.
  if (variant === "menu") {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => choose(other)}
        className="flex w-full items-center gap-sm rounded-[var(--nf-radius-md)] px-sm py-sm text-[var(--nf-text-body-sm)] font-semibold text-[var(--nf-content-secondary)] transition-colors hover:bg-[var(--nf-glass-fill)] hover:text-[var(--nf-content-primary)] disabled:opacity-60"
      >
        <BrandIcon name={other === "working" ? "homes-sparkle" : "user-check"} size={24} />
        <span className="flex-1 text-left leading-tight">
          {other === "working" ? t.agent.mode.switchToAgent : t.agent.mode.switchToPersonal}
          <span className="block text-[var(--nf-text-overline)] font-normal text-[var(--nf-content-muted)]">
            {t.agent.mode.manageSub}
          </span>
        </span>
      </button>
    );
  }

  // Full picker: the "Choose your mode" card.
  const options: { mode: Mode; icon: "user-check" | "homes-sparkle"; label: string; desc: string }[] = [
    { mode: "personal", icon: "user-check", label: t.agent.mode.personal, desc: t.agent.mode.personalDesc },
    { mode: "working", icon: "homes-sparkle", label: t.agent.mode.agent, desc: t.agent.mode.agentDesc },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="nf-chip"
      >
        <BrandIcon name={current === "working" ? "homes-sparkle" : "user-check"} size={24} />
        {current === "working" ? t.agent.mode.agent : t.agent.mode.personal}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-xs w-[19rem] rounded-[var(--nf-radius-xl)] border border-[var(--nf-border-default)] bg-[var(--nf-surface-elevated)] p-sm shadow-[var(--nf-elev-4)]">
          <p className="px-2xs pb-xs pt-2xs">
            <span className="block text-[var(--nf-text-body-sm)] font-semibold">{t.agent.mode.chooseTitle}</span>
            <span className="block text-[var(--nf-text-overline)] text-[var(--nf-content-muted)]">
              {t.agent.mode.chooseSub}
            </span>
          </p>
          <ul className="space-y-xs">
            {options.map((o) => (
              <li key={o.mode}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => choose(o.mode)}
                  aria-current={o.mode === current ? "true" : undefined}
                  className={[
                    "flex w-full items-center gap-sm rounded-[var(--nf-radius-lg)] border p-sm text-left transition-colors disabled:opacity-60",
                    o.mode === current
                      ? "border-[var(--nf-border-brand)] bg-[color-mix(in_oklab,var(--nf-brand-primary)_16%,transparent)]"
                      : "border-[var(--nf-border-subtle)] hover:border-[var(--nf-border-default)]",
                  ].join(" ")}
                >
                  <BrandIcon name={o.icon} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[var(--nf-text-body-sm)] font-semibold">{o.label}</span>
                    <span className="block text-[var(--nf-text-overline)] text-[var(--nf-content-muted)]">
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
