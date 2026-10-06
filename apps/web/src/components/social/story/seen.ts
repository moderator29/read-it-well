"use client";

import { useSyncExternalStore } from "react";

/**
 * WHICH STORIES THIS READER HAS OPENED, kept on this device only.
 *
 * The platform deliberately does not store who saw a story (`story_views`
 * holds a salted daily bucket and nothing that names anybody), so a seen ring
 * cannot come from the server and must not be made to. It is a per-viewer
 * convenience, which is exactly what browser storage is for: it survives a
 * reload, never reaches another device, and an empty or blocked store simply
 * means every ring is lit, which is the honest reading of "I have not told you
 * I saw it".
 *
 * Every read and write is wrapped, because storage can throw in a private
 * window, with site data blocked, and during preview capture. The list is
 * capped so it cannot grow for ever; the oldest ids fall off first.
 */
const KEY = "nf_seen_stories";
const CAP = 200;
const EVENT = "nf-seen-stories";

let cache: readonly string[] | null = null;

function read(): readonly string[] {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    cache = [];
  }
  return cache;
}

export function markStorySeen(id: string): void {
  try {
    const current = read();
    if (current.includes(id)) return;
    const next = [...current, id].slice(-CAP);
    cache = next;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* Kept in memory for this page at least. */
    }
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* Nothing to remember, and nothing broken. */
  }
}

const EMPTY: readonly string[] = [];

function subscribe(onChange: () => void): () => void {
  const reset = () => {
    cache = null;
    onChange();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", reset);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", reset);
  };
}

/** The ids opened on this device. The server snapshot is "none", so the first paint is every ring lit. */
export function useSeenStories(): readonly string[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
