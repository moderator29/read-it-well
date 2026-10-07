"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { Skeleton, SkeletonCard, SkeletonSwap, SkeletonText } from "@/components/ui/Skeleton";
import { Section, Specimen, SystemFrame } from "../_system/SystemFrame";

/**
 * SKELETONS AND SKELETONSWAP (no spinners, ever).
 *
 * A skeleton is the SHAPE of what is about to arrive, so the page does not
 * shift when it does: 131 shaped `loading.tsx` screens already stand on these.
 * The sweep is the one shimmer the product has and it stops under reduced
 * motion, Calm and Off. `SkeletonSwap` is the hand-off: while not ready it
 * draws the stand-in, and when ready the real content fades in over 160ms.
 *
 * "Ready" here is a button, because on this board nothing is loading. In the
 * product it is the moment the data exists, never a timer.
 */

function Content() {
  return (
    <Panel variant="card">
      <p className="nf-sg-label">Real content</p>
      <p>A heading slot</p>
      <p className="nf-sg-note">A line of detail, in the same box the stand-in held.</p>
    </Panel>
  );
}

function SwapDemo() {
  const [ready, setReady] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );
  const reload = () => {
    setReady(false);
    if (timer.current !== null) window.clearTimeout(timer.current);
    /* A beat of skeleton so the swap can be watched; a stand-in for data. */
    timer.current = window.setTimeout(() => setReady(true), 1200);
  };
  return (
    <Specimen label="SkeletonSwap">
      <div className="nf-sg-row">
        <Button variant="glass" size="sm" onClick={() => setReady((r) => !r)}>
          {ready ? "Show the skeleton" : "Show the content"}
        </Button>
        <Button variant="quiet" size="sm" onClick={reload}>
          Skeleton, then content
        </Button>
      </div>
      <SkeletonSwap
        ready={ready}
        skeleton={
          <Panel variant="card" aria-hidden="true">
            <SkeletonText lines={2} />
          </Panel>
        }
      >
        <Content />
      </SkeletonSwap>
    </Specimen>
  );
}

export function SkeletonBoard() {
  return (
    <SystemFrame
      slug="skeleton"
      title="Skeleton"
      lede="Shaped stand-ins, never a spinner. The shape is the shape of the thing that is coming."
    >
      <Section title="The pieces" note="A bar, a circle, a glass plate for a loading state on the dark canvas, a paragraph with a ragged last line, and a whole card.">
        <div className="nf-sg-grid">
          <Specimen label="Skeleton, bar">
            <Skeleton height="1rem" radius="sm" />
          </Specimen>
          <Specimen label="Skeleton, circle">
            <Skeleton circle width="3rem" />
          </Specimen>
          <Specimen label="Skeleton, glass">
            <Skeleton glass height="3rem" radius="lg" />
          </Specimen>
          <Specimen label="SkeletonText, three lines">
            <SkeletonText lines={3} />
          </Specimen>
          <Specimen label="SkeletonCard">
            <SkeletonCard />
          </Specimen>
        </div>
      </Section>

      <Section title="SkeletonSwap" note="Not ready draws the stand-in; ready fades the content in on the glide curve over 160ms. Calm and Off swap with no fade.">
        <div className="nf-sg-grid nf-sg-grid--wide">
          <SwapDemo />
        </div>
      </Section>
    </SystemFrame>
  );
}
