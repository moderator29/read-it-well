"use client";

import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Chip, ChipRow } from "@/components/ui/Chip";
import { Segmented } from "@/components/ui/Segmented";
import { TextField } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import { StatusPill } from "@/components/ui/StatusPill";
import { UiIcon } from "@/design-system/icons/UiIcon";

/*
 * Fixture copy is the renders' own words where they carry no data, and
 * invented where they do (rule 15: no invented counts, so "More (3)" is the
 * number of filters this sheet would hold, not a claim about the catalogue).
 */
function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-group">
      <p className="nf-overline text-[var(--nf-content-muted)]">{title}</p>
      <div className="mt-xs flex flex-wrap items-center gap-inline">{children}</div>
    </section>
  );
}

export function ControlsPreview() {
  const [city, setCity] = useState("lagos");
  const [market, setMarket] = useState<"buy" | "rent" | "stay" | "invest">("buy");
  const [feed, setFeed] = useState<"for-you" | "following">("for-you");
  const [pool, setPool] = useState(true);
  const [furnished, setFurnished] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const [query, setQuery] = useState("Lekki, Lagos");

  return (
    <main className="nf-shell bg-[var(--nf-surface-canvas)] pb-2xl pt-md">
      <h1 className="nf-h3 text-[var(--nf-content-primary)]">G1 primitives</h1>

      <Block title="Button">
        <Button variant="primary" glow arrow>
          Explore Properties
        </Button>
        <Button variant="glass">Explore Stays</Button>
        <Button variant="primary" shape="pill" size="sm">
          Get Started
        </Button>
        <Button variant="glass" shape="pill" size="sm">
          Sign In
        </Button>
        <Button variant="secondary" size="sm">
          Secondary
        </Button>
        <Button variant="ghost" size="sm">
          Ghost
        </Button>
        <Button variant="danger" size="sm">
          Reject
        </Button>
        <Button variant="dangerQuiet" size="sm">
          Remove
        </Button>
        <Button variant="primary" size="sm" loading>
          Saving
        </Button>
        <Button variant="glass" size="sm" disabled>
          Disabled
        </Button>
        <ButtonLink href="/preview/g1" variant="glass" size="sm" iconOnly aria-label="Filters">
          <UiIcon name="sliders" size={16} />
        </ButtonLink>
      </Block>

      <Block title="Chip, pill">
        <ChipRow radiogroup label="City" bleed={false} fadeEdges={false}>
          {[
            ["lagos", "Lagos"],
            ["abuja", "Abuja"],
            ["lekki", "Lekki"],
            ["ikeja", "Ikeja"],
          ].map(([value, label]) => (
            <Chip
              key={value}
              behaviour="choice"
              shape="pill"
              size="sm"
              selected={city === value}
              onSelectedChange={() => setCity(value!)}
              glyph={<UiIcon name="location" size={16} />}
            >
              {label}
            </Chip>
          ))}
        </ChipRow>
      </Block>
      <Block title="Chip, pill with chevron and count">
        <Chip
          shape="pill"
          size="sm"
          selected={buyOpen}
          expanded={buyOpen}
          chevron
          glyph={<UiIcon name="home" size={16} />}
          onSelectedChange={setBuyOpen}
        >
          Buy
        </Chip>
        <Chip shape="pill" size="sm" chevron glyph={<UiIcon name="bed" size={16} />}>
          2 Bed
        </Chip>
        <Chip shape="pill" size="sm" chevron glyph={<UiIcon name="sliders" size={16} />} count={3}>
          More
        </Chip>
        <Chip size="sm" selected>
          Rectangle
        </Chip>
        <Chip size="sm" behaviour="static">
          Static
        </Chip>
      </Block>

      <Block title="Segmented, pill">
        <Segmented
          label="Market"
          shape="pill"
          semantics="radio"
          size="sm"
          value={market}
          onChange={setMarket}
          options={[
            { value: "buy", label: "Buy", icon: "home" },
            { value: "rent", label: "Rent", icon: "key" },
            { value: "stay", label: "Stay", icon: "bed" },
            { value: "invest", label: "Invest", icon: "bolt" },
          ]}
        />
        <Segmented
          label="Feed"
          shape="pill"
          full
          value={feed}
          onChange={setFeed}
          options={[
            { value: "for-you", label: "For You" },
            { value: "following", label: "Following" },
          ]}
        />
      </Block>

      <Block title="Field, glass well">
        <TextField
          label="Where"
          hideLabel
          material="glass"
          size="lg"
          glyph={<UiIcon name="search" size={20} />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          clearable="Clear"
          onClear={() => setQuery("")}
        />
        <TextField
          label="Where do you want to go?"
          hideLabel
          material="glass"
          shape="pill"
          placeholder="Where do you want to go?"
          glyph={<UiIcon name="search" size={20} />}
        />
      </Block>

      <Block title="Switch">
        <div className="w-full">
          <Switch label="Swimming Pool" checked={pool} onCheckedChange={setPool} />
          <Switch
            className="mt-xs"
            label="Furnished"
            description="Off, on the well"
            checked={furnished}
            onCheckedChange={setFurnished}
          />
          <Switch className="mt-xs" label="Disabled" checked disabled onCheckedChange={() => {}} />
        </div>
      </Block>

      <Block title="StatusPill, the on-palette vocabulary">
        <StatusPill tone="warning" outlined mark="dot" size="md" shape="pill">
          Pending
        </StatusPill>
        <StatusPill tone="info" outlined mark="dot" size="md" shape="pill">
          In Review
        </StatusPill>
        <StatusPill tone="success" outlined mark="dot" size="md" shape="pill">
          Approved
        </StatusPill>
        <StatusPill tone="success" outlined mark="dot" size="md" shape="pill">
          Completed
        </StatusPill>
        <StatusPill tone="danger" outlined mark="dot" size="md" shape="pill">
          Rejected
        </StatusPill>
        <StatusPill tone="brand" outlined mark="dot" size="md" shape="pill">
          Verified
        </StatusPill>
        <StatusPill tone="neutral" size="sm">
          Draft
        </StatusPill>
        <StatusPill tone="brand" size="xs">
          Default
        </StatusPill>
      </Block>
    </main>
  );
}
