import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { forMotion } from "@/components/app/account/settings-copy";
import { PageHeader } from "@/components/app/PageHeader";
import { MotionSettings } from "@/components/app/account/MotionSettings";
import { AccessibilitySettings } from "./AccessibilitySettings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await getLocale()).experienceSettings.accessibility.title };
}

/**
 * /settings/accessibility (R3-15): contrast, reduced transparency, text size
 * and motion in one place, where they were scattered across Appearance. Every
 * control is the existing device setting (or, for transparency, a new one on
 * the same store), so this screen and Appearance read and write one answer.
 */
export default async function AccessibilitySettingsPage() {
  const t = getDictionary(await getLocale());
  const copy = t.experienceSettings.accessibility;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={copy.title} subtitle={copy.sub} fallback="/settings" />
      <p className="nf-body-sm mb-block text-[var(--nf-content-secondary)]">{copy.lede}</p>
      <section id="settings-seeing" className="mb-block scroll-mt-28">
        <AccessibilitySettings copy={copy} />
      </section>
      <section id="settings-motion" className="scroll-mt-28">
        <MotionSettings t={forMotion(t)} />
      </section>
    </div>
  );
}
