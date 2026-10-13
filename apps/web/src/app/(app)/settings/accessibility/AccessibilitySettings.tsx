"use client";

import { RowSelect, RowSwitch, SettingsGroup } from "@/components/app/account/rows";
import { useApplyDeviceSettings, useNfSettings, type TextSize } from "@/components/app/account/settings-store";
import type { Dictionary } from "@vallo/i18n/core";

export type AccessibilityCopy = Dictionary["experienceSettings"]["accessibility"];

/**
 * Contrast, transparency and text size in one group (R3-15), on the same
 * device store the Appearance screen writes, so the two screens can never
 * hold different answers. Each applies to the root at once. Its words are
 * `experienceSettings.accessibility`, handed down by the page.
 */
export function AccessibilitySettings({ copy }: { copy: AccessibilityCopy }) {
  const { settings, set } = useNfSettings();
  useApplyDeviceSettings();
  const sizes: { value: TextSize; label: string }[] = [
    { value: "s", label: copy.textSizes.s },
    { value: "m", label: copy.textSizes.m },
    { value: "l", label: copy.textSizes.l },
  ];
  return (
    <SettingsGroup label={copy.seeing}>
      <RowSwitch
        icon="contrast"
        label={copy.contrast}
        sub={copy.contrastSub}
        value={settings.increaseContrast ? copy.on : copy.off}
        checked={settings.increaseContrast}
        onChange={(next) => set("increaseContrast", next)}
        testId="a11y-contrast"
      />
      <RowSwitch
        icon="eye"
        label={copy.transparency}
        sub={copy.transparencySub}
        value={settings.reduceTransparency ? copy.on : copy.off}
        checked={settings.reduceTransparency}
        onChange={(next) => set("reduceTransparency", next)}
        testId="a11y-transparency"
      />
      <RowSelect icon="grid" label={copy.textSize} value={settings.textSize} options={sizes} onChange={(next) => set("textSize", next)} testId="a11y-text-size" />
    </SettingsGroup>
  );
}
