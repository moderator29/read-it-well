import type { ReactNode } from "react";
import { PasscodeLayer } from "@/components/passcode/PasscodeLayer";
import { DeskKeys } from "@/components/app/desk/DeskKeys";
import { AGENT_JUMPS, AGENT_JUMP_WORDS } from "@/components/app/desk/desk-keys";

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
    </PasscodeLayer>
  );
}
