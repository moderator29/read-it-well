/* C6's member CSS move (6 October): the member-only sheets that left
   `globals.css`, the ones this tree draws, in their old globals order. They
   are the first imports so they keep their old place in the cascade: after
   every global partial, before any sheet this tree's components import. */
import "@/app/social.css";
import "@/app/social-feed.css";
import "@/app/css/motion.css";
import "@/app/css/passcode.css";
import "@/app/css/threads.css";
import "@/app/css/member-kit.css";
import "@/app/css/money-history.css";
import "@/app/css/flow-m.css";
import "@/app/css/detail-m.css";
import "@/app/css/member-loop.css";
import type { ReactNode } from "react";
import { PasscodeLayer } from "@/components/passcode/PasscodeLayer";
import { CallLayerMount } from "@/components/calls/CallLayerMount";
import { DeskKeys } from "@/components/app/desk/DeskKeys";
import { AGENT_JUMPS, AGENT_JUMP_WORDS } from "@/components/app/desk/desk-keys";
/* C12: the workspace sheet, out of `globals.css`. */
import "@/app/css/agent.css";

/**
 * The agent workspace's layout. Its only job is the passcode lock
 * (docs/PASSCODE.md): every agent screen is drawn only when this session is
 * unlocked, the lock or the setup screen otherwise. Each page still draws its
 * own frame and checks its own access.
 */
export default function AgentLayout({ children }: { children: ReactNode }) {
  return (
    <PasscodeLayer>
      {children}
      {/* C6: the desks' shared keys (j/k, a/x, g-jumps, ?). */}
      <DeskKeys jumps={AGENT_JUMPS} jumpWords={AGENT_JUMP_WORDS} />
      {/* VC1: incoming calls and the call surface, while video_calls is on. */}
      <CallLayerMount />
    </PasscodeLayer>
  );
}
