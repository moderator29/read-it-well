"use client";

import { useState } from "react";

import { Segmented, SegmentedPanel, type SegmentedOption } from "@/components/ui/Segmented";
import { Section, Specimen, SystemFrame } from "../_system/SystemFrame";

/**
 * SEGMENTED AND SEGMENTEDPANEL (north star motion 6, reference 7064).
 *
 * The thumb is one element measured against the real segment boxes and moved by
 * transform only, 240ms on the drift curve, released from where it was, so it
 * can be interrupted by choosing again mid-move. The view under it crossfades
 * 160ms (`SegmentedPanel`). Under Calm and Off the thumb jumps and the panel
 * is simply there: use the Motion switch above.
 *
 * Every option is a slot name ("Option one"), so a long label in another
 * locale is the only thing missing; the long-label specimen stands in for it.
 */

type Three = "one" | "two" | "three";

const THREE: readonly SegmentedOption<Three>[] = [
  { value: "one", label: "Option one" },
  { value: "two", label: "Option two" },
  { value: "three", label: "Option three" },
];

const LONG: readonly SegmentedOption<Three>[] = [
  { value: "one", label: "Short" },
  { value: "two", label: "A considerably longer option label" },
  { value: "three", label: "Mid length" },
];

const ICONS: readonly SegmentedOption<Three>[] = [
  { value: "one", label: "Option one", icon: "home" },
  { value: "two", label: "Option two", icon: "wallet" },
  { value: "three", label: "Option three", icon: "settings-gear" },
];

function Pick({
  label,
  options,
  ...rest
}: {
  label: string;
  options: readonly SegmentedOption<Three>[];
  size?: "sm" | "md";
  variant?: "quiet" | "solid";
  shape?: "control" | "pill";
  full?: boolean;
  iconOnly?: boolean;
  semantics?: "tabs" | "radio";
}) {
  const [value, setValue] = useState<Three>("one");
  return (
    <Specimen label={label}>
      <Segmented<Three> options={options} value={value} onChange={setValue} label={label} {...rest} />
    </Specimen>
  );
}

function PanelDemo() {
  const [value, setValue] = useState<Three>("one");
  return (
    <Specimen label="Segmented over a SegmentedPanel (tabs, wired to its panels)">
      <Segmented<Three>
        options={THREE}
        value={value}
        onChange={setValue}
        label="Panel switch"
        itemIdPrefix="sg-tab"
        panelIdPrefix="sg-panel"
        full
      />
      <SegmentedPanel value={value} panelIdPrefix="sg-panel" itemIdPrefix="sg-tab" className="nf-sg-plate">
        Panel for option {value}
      </SegmentedPanel>
    </Specimen>
  );
}

export function SegmentedBoard() {
  return (
    <SystemFrame
      slug="segmented"
      title="Segmented"
      lede="One control, two variants and two shapes. The thumb travels to the chosen segment so the eye follows the selection. Arrow keys move, Home and End jump."
    >
      <Section title="Variants and sizes" note="Quiet is the default (filters and views); solid is the one page-level mode switch.">
        <div className="nf-sg-grid">
          <Pick label="Quiet, medium" options={THREE} />
          <Pick label="Quiet, small" options={THREE} size="sm" />
          <Pick label="Solid" options={THREE} variant="solid" />
          <Pick label="Pill shape (the glass rail)" options={THREE} shape="pill" />
          <Pick label="Full width" options={THREE} full />
        </div>
      </Section>

      <Section
        title="Content and semantics"
        note="Icon-only takes each label as the accessible name. Radio semantics are for choosing a value inside a form; tabs are for views of one screen."
      >
        <div className="nf-sg-grid">
          <Pick label="Icon only" options={ICONS} iconOnly />
          <Pick label="Icon with label" options={ICONS} />
          <Pick label="Long labels (the thumb is measured, not assumed)" options={LONG} />
          <Pick label="Radio semantics" options={THREE} semantics="radio" />
        </div>
      </Section>

      <Section title="SegmentedPanel" note="The view under the control is keyed on the choice, so each one mounts fresh and fades in for 160ms.">
        <div className="nf-sg-grid">
          <PanelDemo />
        </div>
      </Section>
    </SystemFrame>
  );
}
