"use client";

import { useSyncExternalStore } from "react";

/**
 * WHETHER THIS DEVICE WILL KEEP A DRAFT, ASKED ONCE.
 *
 * The listing wizard writes its draft to `localStorage` on every change, and
 * the progress path says so. It may only say so when it is true: a private
 * window, blocked site data or a full quota refuses the write, and a sentence
 * promising a copy that is not there is the kind of claim this product does
 * not make. So the answer is a real write and read, made once per page, read
 * through `useSyncExternalStore` so the server render (which cannot know)
 * says nothing and the client settles it without an effect.
 */
let answer: boolean | null = null;

function probe(): boolean {
  if (answer !== null) return answer;
  try {
    const key = "vallo_storage_probe";
    window.localStorage.setItem(key, "1");
    answer = window.localStorage.getItem(key) === "1";
    window.localStorage.removeItem(key);
  } catch {
    answer = false;
  }
  return answer;
}

const subscribe = () => () => {};

export function useDeviceStorage(): boolean {
  return useSyncExternalStore(subscribe, probe, () => false);
}
