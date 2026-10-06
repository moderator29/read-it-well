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

/*
 * SCOPED TO THE VIEWER (auditor A2). One phone, two accounts: a single key
 * meant account B saw rings already quiet from what A had opened. The key
 * carries the viewer's id (passed from the server); a signed-out reader has
 * the "anon" scope, which is what they always had.
 */
const scope = (viewerId: string | null) => `${KEY}:${viewerId ?? "anon"}`;

const caches = new Map<string, readonly string[]>();

function read(viewerId: string | null): readonly string[] {
  const key = scope(viewerId);
  const hit = caches.get(key);
  if (hit) return hit;
  let list: readonly string[];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    list = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    list = [];
  }
  caches.set(key, list);
  return list;
}

export function markStorySeen(id: string, viewerId: string | null): void {
  try {
    const current = read(viewerId);
    if (current.includes(id)) return;
    const next = [...current, id].slice(-CAP);
    caches.set(scope(viewerId), next);
    try {
      window.localStorage.setItem(scope(viewerId), JSON.stringify(next));
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
    caches.clear();
    onChange();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", reset);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", reset);
  };
}

/** The ids opened on this device by this viewer. The server snapshot is "none", so the first paint is every ring lit. */
export function useSeenStories(viewerId: string | null): readonly string[] {
  return useSyncExternalStore(
    subscribe,
    () => read(viewerId),
    () => EMPTY,
  );
}
