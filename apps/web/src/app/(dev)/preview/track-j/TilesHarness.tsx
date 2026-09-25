"use client";

import { useState } from "react";
import { IconTiles } from "@/components/app/filters/IconTiles";

const SHAPES = [
  { value: "self_contain", label: "Self contain", icon: "door" },
  { value: "room_parlour", label: "Room and parlour", icon: "bed" },
  { value: "mini_flat", label: "Mini flat", icon: "key" },
  { value: "flat", label: "Flat", icon: "building-apartment" },
  { value: "duplex", label: "Duplex", icon: "house-duplex" },
  { value: "terrace", label: "Terrace", icon: "house-terrace" },
  { value: "bungalow", label: "Bungalow", icon: "house-bungalow" },
  { value: "penthouse", label: "Penthouse", icon: "tower-penthouse" },
  { value: "detached", label: "Detached", icon: "house" },
] as const;

type Shape = (typeof SHAPES)[number]["value"];

/** The space tiles with every shape present, which no live catalogue has yet. */
export function TilesHarness() {
  const [picked, setPicked] = useState<Shape[]>(["mini_flat"]);
  return (
    <section aria-labelledby="space" className="nf-filters__group">
      <h2 id="space" className="nf-filters__group-title">
        Space
      </h2>
      <IconTiles<Shape>
        label="Space"
        mode="multi"
        testPrefix="filter-shape"
        selected={picked}
        onToggle={(value) =>
          setPicked((current) => (current.includes(value) ? current.filter((v) => v !== value) : [...current, value]))
        }
        options={SHAPES}
      />
    </section>
  );
}
