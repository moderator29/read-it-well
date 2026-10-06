"use client";

import { RowSelect, RowSwitch, SettingsGroup } from "@/components/app/account/rows";
import { useApplyDeviceSettings, useNfSettings, type TextSize } from "@/components/app/account/settings-store";
import {
  A11Y_CONTRAST,
  A11Y_CONTRAST_SUB,
  A11Y_OFF,
  A11Y_ON,
  A11Y_SEEING,
  A11Y_TEXT,
  A11Y_TEXT_SIZE,
  A11Y_TRANSPARENCY,
  A11Y_TRANSPARENCY_SUB,
} from "@/lib/settings/accessibility-copy";

/**
 * Contrast, transparency and text size in one group (R3-15), on the same
 * device store the Appearance screen writes, so the two screens can never
 * hold different answers. Each applies to the root at once.
 */
export function AccessibilitySettings() {
  const { settings, set } = useNfSettings();
  useApplyDeviceSettings();
  const sizes: { value: TextSize; label: string }[] = [
    { value: "s", label: A11Y_TEXT.s },
    { value: "m", label: A11Y_TEXT.m },
    { value: "l", label: A11Y_TEXT.l },
  ];
  return (
    <SettingsGroup label={A11Y_SEEING}>
      <RowSwitch
        icon="contrast"
        label={A11Y_CONTRAST}
        sub={A11Y_CONTRAST_SUB}
        value={settings.increaseContrast ? A11Y_ON : A11Y_OFF}
        checked={settings.increaseContrast}
        onChange={(next) => set("increaseContrast", next)}
        testId="a11y-contrast"
      />
      <RowSwitch
        icon="eye"
        label={A11Y_TRANSPARENCY}
        sub={A11Y_TRANSPARENCY_SUB}
        value={settings.reduceTransparency ? A11Y_ON : A11Y_OFF}
        checked={settings.reduceTransparency}
        onChange={(next) => set("reduceTransparency", next)}
        testId="a11y-transparency"
      />
      <RowSelect icon="grid" label={A11Y_TEXT_SIZE} value={settings.textSize} options={sizes} onChange={(next) => set("textSize", next)} testId="a11y-text-size" />
    </SettingsGroup>
  );
}
