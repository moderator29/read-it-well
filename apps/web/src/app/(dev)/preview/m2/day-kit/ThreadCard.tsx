"use client";

import type { ComponentProps } from "react";
import { ThreadContextBanner } from "@/components/app/threads/ThreadContextBanner";

/** The banner with a no-op accept, so the server preview can pass plain props. */
export function ThreadCard(props: Omit<ComponentProps<typeof ThreadContextBanner>, "onAccepted">) {
  return <ThreadContextBanner {...props} onAccepted={() => undefined} />;
}
