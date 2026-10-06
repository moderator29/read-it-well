"use client";

import { useRouter } from "next/navigation";
import { BackControl } from "@/components/ui/BackControl";

/**
 * THE PAUSED SCREEN'S BACK, WHICH GOES STRAIGHT TO THE HOME OF THE SIDE.
 *
 * Every paused social route declares `/around` as its parent
 * (`lib/nav/route-parents.ts`), and `/around` is itself paused, so the declared
 * back from a paused post showed "Around is paused" a second time. This screen
 * has nothing above it that is not also switched off, so its back leaves the
 * social area altogether: to the home of the side the member is on, decided on
 * the server (`SocialPaused`) and passed in. `onBack` takes the place of the
 * declared parent.
 */
export function PausedBack({ href, label }: { href: string; label: string }) {
  const router = useRouter();
  return <BackControl surface="round" label={label} onBack={() => router.replace(href)} />;
}
