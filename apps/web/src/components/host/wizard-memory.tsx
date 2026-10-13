"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/**
 * THE WIZARD'S MEMORY OF WHAT IS TYPED BUT NOT SAVED.
 *
 * Every drawn step used to keep its form in its own `useState`, so pressing
 * Back, jumping along the progress path or following a row's chevron unmounted
 * the step and threw away whatever had been typed on it. Two things replace
 * that:
 *
 *  - `useHeld` is `useState` whose value lives in the wizard, keyed by step,
 *    so a step that unmounts and mounts again comes back exactly as it was
 *    left.
 *  - `useGuard` is how a step (or a part of one, such as one room's rate
 *    editor) tells the wizard it has unsaved changes and how to save them.
 *    The wizard asks before Back, a jump, a link or leaving the page, and
 *    offers Save and go back, Discard, or Stay.
 *
 * Outside a wizard (the preview harness draws steps on their own) both hooks
 * fall back to plain local state and guard nothing.
 */

type Part = { dirty: boolean; save: () => Promise<boolean> };

type Memory = {
  step: string;
  values: Record<string, unknown>;
  hold: (id: string, next: unknown, fallback: unknown) => void;
  parts: React.MutableRefObject<Map<string, Part>>;
  bump: () => void;
};

const MemoryContext = createContext<Memory | null>(null);

/** The wizard's half: the store, the parts registry, and what the wizard asks of them. */
export function useWizardMemory(step: string) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const parts = useRef(new Map<string, Part>());
  /* Parts report in effects; a counter re-renders the wizard when one
     changes, so the beforeunload guard and the prompt see the current answer. */
  const [, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);
  const hold = useCallback((id: string, next: unknown, fallback: unknown) => {
    setValues((current) => {
      const base = id in current ? current[id] : fallback;
      const value = typeof next === "function" ? (next as (value: unknown) => unknown)(base) : next;
      return { ...current, [id]: value };
    });
  }, []);

  /** Forget what this step held, after a save or a discard. */
  const forget = useCallback((which: string) => {
    setValues((current) =>
      Object.fromEntries(Object.entries(current).filter(([id]) => !id.startsWith(`${which}:`))),
    );
  }, []);

  const dirty = () => [...parts.current.values()].some((part) => part.dirty);

  /** Save every part with unsaved changes, in order; false at the first that fails. */
  const saveAll = useCallback(async () => {
    for (const part of [...parts.current.values()]) {
      if (part.dirty && !(await part.save())) return false;
    }
    return true;
  }, []);

  const value = useMemo<Memory>(() => ({ step, values, hold, parts, bump }), [step, values, hold, bump]);

  return { value, dirty, saveAll, forget };
}

/** Puts the wizard's memory around its steps. */
export function HeldProvider({ value, children }: { value: Memory; children: ReactNode }) {
  return <MemoryContext.Provider value={value}>{children}</MemoryContext.Provider>;
}

/**
 * `useState` that survives the step unmounting. `initial` is used only until
 * the first change; after a save or a discard the wizard forgets the held
 * value and the step reads `initial` (the saved answer) again.
 */
export function useHeld<T>(key: string, initial: T | (() => T)): [T, (next: T | ((current: T) => T)) => void] {
  const memory = useContext(MemoryContext);
  const [local, setLocal] = useState<T>(initial);
  const id = memory ? `${memory.step}:${key}` : key;
  const held = memory && id in memory.values ? (memory.values[id] as T) : undefined;
  const fallback = typeof initial === "function" ? (initial as () => T)() : initial;
  const value = memory ? (held !== undefined ? held : fallback) : local;

  const set = useCallback(
    (next: T | ((current: T) => T)) => {
      if (memory) memory.hold(id, next, fallback);
      else setLocal(next);
    },
    // `fallback` is the saved answer this render; an updater applies to the
    // held value when there is one, and to the saved answer when there is not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [memory, id, JSON.stringify(fallback)],
  );
  return [value, set];
}

/**
 * Tell the wizard this part has unsaved changes and how to save them. The
 * save resolves true when it saved and false when it was refused (the refusal
 * is shown by the step's own `run`).
 */
export function useGuard(key: string, dirty: boolean, save: () => Promise<boolean>) {
  const memory = useContext(MemoryContext);
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  const id = memory ? `${memory.step}:${key}` : key;
  useEffect(() => {
    if (!memory) return;
    const before = memory.parts.current.get(id)?.dirty;
    memory.parts.current.set(id, { dirty, save: () => saveRef.current() });
    if (before !== dirty) memory.bump();
  }, [memory, id, dirty]);
  useEffect(() => {
    if (!memory) return;
    const parts = memory.parts;
    const bump = memory.bump;
    return () => {
      const had = parts.current.get(id)?.dirty;
      parts.current.delete(id);
      if (had) bump();
    };
  }, [memory, id]);
}

/** Whether two answers differ, by value. Forms hold plain data. */
export function differs(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
}
