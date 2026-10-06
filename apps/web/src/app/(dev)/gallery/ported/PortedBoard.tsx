"use client";

import { useEffect, useRef, useState } from "react";

import { ActionSheetIllustrated } from "@/components/ui/ActionSheetIllustrated";
import { AIResponse, type AIResponseStatus } from "@/components/ui/AIResponse";
import { BatchTray } from "@/components/ui/BatchTray";
import { BookCallButton } from "@/components/ui/BookCallButton";
import { Button } from "@/components/ui/Button";
import { DragToConfirm } from "@/components/ui/DragToConfirm";
import { InnerNav } from "@/components/ui/InnerNav";
import { LiveIsland, type LiveStep } from "@/components/ui/LiveIsland";
import { ParticleDelete } from "@/components/ui/ParticleDelete";
import { SlidePagination } from "@/components/ui/SlidePagination";
import { Unfold } from "@/components/ui/Unfold";
import "./PortedBoard.css";

/**
 * The fixtures are structural on purpose: labels that say which slot a thing is
 * ("Row one", "First step"), never a name, an amount, a reference or a count of
 * anything real. A board full of plausible-looking data is one where nobody
 * notices the data is not real; this one cannot be mistaken for the product.
 */

function Section({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <section className="mt-section">
      <h2 className="nf-h3">{title}</h2>
      <p className="mt-xs max-w-measure-body text-[length:var(--nf-text-body-sm)] text-[var(--nf-content-secondary)]">
        {note}
      </p>
      <div className="mt-heading grid gap-group">{children}</div>
    </section>
  );
}

/** A host that settles after a beat, standing in for a server answering. */
function settleAfter(ms: number, ok = true): () => Promise<boolean> {
  return () => new Promise((resolve) => window.setTimeout(() => resolve(ok), ms));
}

function DragSection() {
  return (
    <Section
      title="Drag to confirm"
      note="For genuinely irreversible actions only. The money one never resets; the other does, once, after a beat. Press Enter on the handle for the keyboard path: once for the non-money one, twice for money."
    >
      <div className="grid gap-group md:grid-cols-2">
        <div className="grid gap-inline">
          <p className="nf-overline">Money action (never resets)</p>
          <DragToConfirm
            money
            armedLabel="Press again to confirm"
            label="Slide to confirm"
            confirmingLabel="Confirming"
            confirmedLabel="Confirmed"
            keyboardLabel="Confirm the action"
            errorLabel="Not confirmed"
            onConfirm={settleAfter(900)}
          />
        </div>
        <div className="grid gap-inline">
          <p className="nf-overline">Non-money, resets after 2 seconds</p>
          <DragToConfirm
            autoResetDelay={2000}
            label="Slide to confirm"
            confirmingLabel="Confirming"
            confirmedLabel="Confirmed"
            keyboardLabel="Confirm the action"
            onConfirm={settleAfter(400)}
          />
        </div>
        <div className="grid gap-inline">
          <p className="nf-overline">Danger tone</p>
          <DragToConfirm
            money
            armedLabel="Press again to confirm"
            tone="danger"
            label="Slide to confirm"
            confirmingLabel="Confirming"
            confirmedLabel="Confirmed"
            keyboardLabel="Confirm the action"
            onConfirm={settleAfter(600)}
          />
        </div>
        <div className="grid gap-inline">
          <p className="nf-overline">The action does not go through</p>
          <DragToConfirm
            label="Slide to confirm"
            confirmingLabel="Confirming"
            confirmedLabel="Confirmed"
            keyboardLabel="Confirm the action"
            errorLabel="Not confirmed"
            onConfirm={settleAfter(600, false)}
          />
        </div>
        <div className="grid gap-inline">
          <p className="nf-overline">Disabled</p>
          <DragToConfirm
            disabled
            label="Slide to confirm"
            confirmingLabel="Confirming"
            confirmedLabel="Confirmed"
            onConfirm={() => undefined}
          />
        </div>
      </div>
    </Section>
  );
}

function UnfoldSection() {
  const items = [
    { id: "one", title: "Row one", hint: "A quiet hint", icon: "info" as const, content: <p>Content for the first row.</p> },
    { id: "two", title: "Row two", content: <p>Content for the second row.</p> },
    { id: "three", title: "Row three", content: <p>Content for the third row.</p> },
  ];
  return (
    <Section
      title="Unfold"
      note="Never price, fees, trust facts or money state behind it. One open at a time by default; the second list lets several stay open."
    >
      <div className="grid gap-group md:grid-cols-2">
        <Unfold items={items} defaultValue={["one"]} />
        <Unfold items={items} multiple defaultValue={["one", "two"]} />
      </div>
    </Section>
  );
}

function PaginationSection() {
  const [page, setPage] = useState(1);
  return (
    <Section
      title="Slide pagination"
      note="Desktop tables only. It is not drawn below 768px wide, so on a phone this section is empty by design."
    >
      <SlidePagination
        page={page}
        pageCount={12}
        onChange={setPage}
        label="Table pages"
        previousLabel="Previous page"
        nextLabel="Next page"
        pageLabel={(n) => `Page ${n}`}
      />
      <p className="nf-gal-note">Widen the window to 768px or more to see it.</p>
    </Section>
  );
}

function IslandSection() {
  const [done, setDone] = useState(0);
  const [value, setValue] = useState(0);
  const labels = ["First step", "Second step", "Third step"];
  const steps: LiveStep[] = labels.map((label, i) => ({
    id: `step-${i}`,
    label,
    state: i < done ? "done" : i === done ? "current" : "todo",
  }));
  return (
    <Section
      title="Live island"
      note="A status surface, not a profile card. Steps tick only when the host says the thing completed; the buttons below stand in for that. It sits clear of the dock."
    >
      <div className="nf-gal-row">
        <Button variant="glass" size="sm" disabled={done >= labels.length} onClick={() => setDone((d) => d + 1)}>
          Mark the next step done
        </Button>
        <Button variant="quiet" size="sm" onClick={() => setDone(0)}>
          Start again
        </Button>
        <label className="nf-gal-note" htmlFor="gal-progress">
          Progress
        </label>
        <input
          id="gal-progress"
          className="nf-gal-range"
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
        />
      </div>
      <div className="nf-gal-frame">
        <LiveIsland
          label="Live status"
          title="Title line"
          detail="One line of detail"
          icon="clock"
          steps={steps}
          stepStateLabels={{ done: "Done", current: "In progress", todo: "Waiting" }}
          progress={{ value: value / 100, label: "Progress" }}
          action={{ label: "Cancel", onClick: () => setDone(0) }}
          expandLabel="Show details"
          collapseLabel="Hide details"
          defaultExpanded
        />
      </div>
    </Section>
  );
}

function InnerNavSection() {
  const [active, setActive] = useState("one");
  const sections = [
    { id: "one", label: "Section one", icon: "home" as const },
    { id: "two", label: "Section two", icon: "wallet" as const },
    { id: "three", label: "Section three", icon: "settings-gear" as const },
  ];
  return (
    <Section
      title="Inner navigation"
      note="Second-level navigation for inner areas, never the dock or the side nav. Drag the toggle down: it follows the finger and settles on the spring. A tap, Enter or Space also work; Escape closes."
    >
      <div className="nf-gal-frame p-md">
        <InnerNav
          label="Section navigation"
          toggleLabel="Sections"
          currentLabel={sections.find((s) => s.id === active)?.label}
          activeId={active}
          items={sections.map((s) => ({ ...s, onSelect: () => setActive(s.id) }))}
        />
      </div>
    </Section>
  );
}

function BatchSection() {
  const [count, setCount] = useState(2);
  return (
    <Section
      title="Batch tray"
      note="Rises when something is selected. Drag the grip down to clear, or use Clear or Escape. The count and the sentence are the host's."
    >
      <div className="nf-gal-row">
        <Button variant="glass" size="sm" onClick={() => setCount((c) => c + 1)}>
          Select one more
        </Button>
        <Button variant="quiet" size="sm" onClick={() => setCount(0)}>
          Select none
        </Button>
      </div>
      <div className="nf-gal-frame">
        <BatchTray
          count={count}
          countLabel={`${count} selected`}
          label="Bulk actions"
          clearLabel="Clear selection"
          onClear={() => setCount(0)}
          actions={[
            { id: "one", label: "Action one", icon: "archive", onSelect: () => undefined },
            { id: "two", label: "Action two", icon: "share", onSelect: () => undefined },
            { id: "three", label: "Action three", icon: "trash", tone: "danger", onSelect: () => undefined },
          ]}
        />
      </div>
    </Section>
  );
}

function SheetSection() {
  const [open, setOpen] = useState(false);
  return (
    <Section
      title="Illustrated action sheet"
      note="North star 15.2: a clay object on a soft radial ground, a title, one line, hairline rows with a round tinted plate, a label and a chevron, and one quiet dismiss. It composes Sheet, so the rise, scrim, drag and focus are Sheet's."
    >
      <div className="nf-gal-row">
        <Button variant="primary" onClick={() => setOpen(true)}>
          Open the sheet
        </Button>
      </div>
      <ActionSheetIllustrated
        open={open}
        onOpenChange={setOpen}
        title="Sheet title"
        body="One line of body copy."
        object="gift"
        rows={[
          { id: "one", label: "Row one", hint: "A quiet hint", icon: "users", onSelect: () => undefined },
          { id: "two", label: "Row two", icon: "share", tone: "info", onSelect: () => undefined },
          { id: "three", label: "Row three", icon: "trash", danger: true, onSelect: () => undefined },
        ]}
        dismissLabel="Not now"
      />
    </Section>
  );
}

function ParticleSection() {
  const initial = ["Item one", "Item two", "Item three"];
  const [items, setItems] = useState(initial);
  return (
    <Section
      title="Particle delete"
      note="Never on money, a payout method, a transaction record or an account. It deletes first and dissolves only if that worked; the item leaves the list when the dissolve ends. Reduced motion and data saver get a fade."
    >
      <div className="nf-gal-row">
        <Button variant="quiet" size="sm" disabled={items.length === initial.length} onClick={() => setItems(initial)}>
          Restore the items
        </Button>
      </div>
      <ul className="grid gap-inline md:max-w-md">
        {items.map((name) => (
          <li key={name}>
            <ParticleDelete options={{ seed: name.length }} onGone={() => setItems((all) => all.filter((n) => n !== name))}>
              {({ isDeleting, remove }) => (
                <div className="nf-gal-row nf-gal-item">
                  <span>{name}</span>
                  <Button variant="quiet" size="sm" leadingIcon="trash" disabled={isDeleting} onClick={remove}>
                    Remove {name}
                  </Button>
                </div>
              )}
            </ParticleDelete>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function CallSection() {
  return (
    <Section
      title="Book a call capsule"
      note="Marketing surfaces only, never inside the product. Hover, focus or press it."
    >
      <BookCallButton onClick={() => undefined}>Call label</BookCallButton>
    </Section>
  );
}

const STREAM = "Answer text arrives here one word at a time.".split(" ");

function AIResponseSection() {
  const [status, setStatus] = useState<AIResponseStatus>("done");
  const [shown, setShown] = useState(STREAM.length);
  const timer = useRef<number | null>(null);
  const clear = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clear, []);

  const start = () => {
    clear();
    setShown(0);
    setStatus("thinking");
    let n = 0;
    const tick = () => {
      n += 1;
      setShown(n);
      setStatus(n >= STREAM.length ? "done" : "streaming");
      if (n < STREAM.length) timer.current = window.setTimeout(tick, 260);
    };
    timer.current = window.setTimeout(tick, 1400);
  };
  const stop = () => {
    clear();
    setStatus("stopped");
  };

  return (
    <Section
      title="AI response"
      note="The shape of a streamed answer. The caller supplies the words; this board stands in with a timer. Thinking is the one permitted loop and is a shaped skeleton, never a spinner."
    >
      <div className="nf-gal-row">
        <Button variant="glass" size="sm" onClick={start}>
          Play a stream
        </Button>
        <Button variant="quiet" size="sm" onClick={() => { clear(); setStatus("error"); }}>
          Show the error state
        </Button>
      </div>
      <div className="md:max-w-md">
        <AIResponse
          status={status}
          label="Assistant"
          thinkingLabel="Thinking"
          statusLabels={{ done: "Answer complete", stopped: "Stopped", error: "The answer failed" }}
          stopLabel="Stop"
          onStop={stop}
          errorMessage="The reason, in the words of the caller."
          actions={[{ id: "copy", label: "Copy", icon: "document", onSelect: () => undefined }]}
        >
          <p>{STREAM.slice(0, shown).join(" ")}</p>
        </AIResponse>
      </div>
    </Section>
  );
}

export function PortedBoard() {
  return (
    <main className="mx-auto max-w-content px-gutter pb-section pt-lg">
      <h1 className="nf-h2">The ported components</h1>
      <p className="mt-xs max-w-measure-body text-[length:var(--nf-text-body-sm)] text-[var(--nf-content-secondary)]">
        Ten components from the founder&apos;s library, rebuilt Vallo-native. Switch the theme and the width to check
        them at 390, 768 and 1440.
      </p>
      <DragSection />
      <UnfoldSection />
      <PaginationSection />
      <IslandSection />
      <InnerNavSection />
      <BatchSection />
      <SheetSection />
      <ParticleSection />
      <CallSection />
      <AIResponseSection />
    </main>
  );
}
