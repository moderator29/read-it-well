import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { forMotion } from "@/components/app/account/settings-copy";
import { PageHeader } from "@/components/app/PageHeader";
import { MotionSettings } from "@/components/app/account/MotionSettings";
import { A11Y_LEDE, A11Y_SUB, A11Y_TITLE } from "@/lib/settings/accessibility-copy";
import { AccessibilitySettings } from "./AccessibilitySettings";

export const metadata: Metadata = { title: A11Y_TITLE };

/**
 * /settings/accessibility (R3-15): contrast, reduced transparency, text size
 * and motion in one place, where they were scattered across Appearance. Every
 * control is the existing device setting (or, for transparency, a new one on
 * the same store), so this screen and Appearance read and write one answer.
 */
export default async function AccessibilitySettingsPage() {
  const t = getDictionary(await getLocale());
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={A11Y_TITLE} subtitle={A11Y_SUB} fallback="/settings" />
      <p className="nf-body-sm mb-block text-[var(--nf-content-secondary)]">{A11Y_LEDE}</p>
      <section id="settings-seeing" className="mb-block scroll-mt-28">
        <AccessibilitySettings />
      </section>
      <section id="settings-motion" className="scroll-mt-28">
        <MotionSettings t={forMotion(t)} />
      </section>
    </div>
  );
}
