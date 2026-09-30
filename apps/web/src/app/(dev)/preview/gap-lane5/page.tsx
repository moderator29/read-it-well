import type { ComponentType } from "react";
import L0 from "@/app/host/loading";
import L1 from "@/app/host/calendar/loading";
import L2 from "@/app/host/decide/loading";
import L3 from "@/app/host/reviews/loading";
import L4 from "@/app/host/earnings/loading";
import L5 from "@/app/host/reservations/loading";
import L6 from "@/app/host/rooms/loading";
import L7 from "@/app/agent/listings/[listingId]/board/loading";
import L8 from "@/app/agent/listings/[listingId]/arrival/loading";
import L9 from "@/app/agent/listings/[listingId]/mandate/loading";
import L10 from "@/app/agent/listings/[listingId]/status/loading";
import L11 from "@/app/(app)/settings/account/loading";
import L12 from "@/app/(app)/settings/appearance/loading";
import L13 from "@/app/(app)/settings/help/loading";
import L14 from "@/app/(app)/settings/invite/loading";
import L15 from "@/app/(app)/settings/notifications/loading";
import L16 from "@/app/(app)/settings/passcode/loading";
import L17 from "@/app/(app)/settings/phone/loading";
import L18 from "@/app/(app)/settings/privacy/loading";
import L19 from "@/app/(app)/settings/privacy/blocked/loading";
import L20 from "@/app/(app)/settings/devices/alert/loading";
import L21 from "@/app/(auth)/sign-in/loading";
import L22 from "@/app/(auth)/sign-in/code/loading";
import L23 from "@/app/(auth)/sign-in/phone/loading";
import L24 from "@/app/(auth)/sign-up/loading";
import L25 from "@/app/(auth)/sign-up/email/loading";
import L26 from "@/app/(auth)/sign-up/verify/loading";
import L27 from "@/app/(auth)/sign-up/finish/loading";
import L28 from "@/app/(auth)/forgot-password/loading";
import L29 from "@/app/(auth)/forgot-password/code/loading";
import L30 from "@/app/(auth)/reset-password/loading";
import L31 from "@/app/email/preferences/loading";
import L32 from "@/app/join/[code]/loading";

/**
 * Lane 5 (D-10): every shaped loading file from the gap audit, held still
 * so it can be screenshotted. `?s=<name>`; no `s` lists them. Auth screens
 * are drawn inside the auth column's classes, settings inside the app's
 * page padding, host and agent screens draw their own frame.
 */
const SCREENS: Record<string, { C: ComponentType; frame: "host" | "app" | "auth" }> = {
  "host": { C: L0, frame: "host" },
  "host-calendar": { C: L1, frame: "host" },
  "host-decide": { C: L2, frame: "host" },
  "host-reviews": { C: L3, frame: "host" },
  "host-earnings": { C: L4, frame: "host" },
  "host-reservations": { C: L5, frame: "host" },
  "host-rooms": { C: L6, frame: "host" },
  "agent-board": { C: L7, frame: "host" },
  "agent-arrival": { C: L8, frame: "host" },
  "agent-mandate": { C: L9, frame: "host" },
  "agent-status": { C: L10, frame: "host" },
  "settings-account": { C: L11, frame: "app" },
  "settings-appearance": { C: L12, frame: "app" },
  "settings-help": { C: L13, frame: "app" },
  "settings-invite": { C: L14, frame: "app" },
  "settings-notifications": { C: L15, frame: "app" },
  "settings-passcode": { C: L16, frame: "app" },
  "settings-phone": { C: L17, frame: "app" },
  "settings-privacy": { C: L18, frame: "app" },
  "settings-blocked": { C: L19, frame: "app" },
  "settings-alert": { C: L20, frame: "app" },
  "auth-sign-in": { C: L21, frame: "auth" },
  "auth-sign-in-code": { C: L22, frame: "auth" },
  "auth-sign-in-phone": { C: L23, frame: "auth" },
  "auth-sign-up": { C: L24, frame: "auth" },
  "auth-sign-up-email": { C: L25, frame: "auth" },
  "auth-sign-up-verify": { C: L26, frame: "auth" },
  "auth-sign-up-finish": { C: L27, frame: "auth" },
  "auth-forgot": { C: L28, frame: "auth" },
  "auth-forgot-code": { C: L29, frame: "auth" },
  "auth-reset": { C: L30, frame: "auth" },
  "email-preferences": { C: L31, frame: "host" },
  "join": { C: L32, frame: "host" },
};

export default async function PreviewLane5Loading({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = (await searchParams).s;
  const pick = SCREENS[Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "")];
  if (!pick) {
    return (
      <ul className="p-lg">
        {Object.keys(SCREENS).map((k) => (
          <li key={k}>
            <a href={`?s=${k}`}>{k}</a>
          </li>
        ))}
      </ul>
    );
  }
  const { C, frame } = pick;
  if (frame === "auth") {
    return (
      <main className="nf-auth nf-slate">
        <div className="nf-auth__body pt-[18rem]">
          <C />
        </div>
      </main>
    );
  }
  if (frame === "app") {
    return (
      <div className="min-h-dvh bg-[var(--nf-surface-canvas)] px-md pt-lg sm:px-lg">
        <C />
      </div>
    );
  }
  return <C />;
}
