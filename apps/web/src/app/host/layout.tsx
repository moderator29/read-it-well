import type { ReactNode } from "react";
import { PasscodeLayer } from "@/components/passcode/PasscodeLayer";

/**
 * The host workspace's layout. Its only job is the passcode lock
 * (docs/PASSCODE.md): every host screen is drawn only when this session is
 * unlocked, the lock or the setup screen otherwise. Each page still draws its
 * own frame and checks its own access.
 */
export default function HostLayout({ children }: { children: ReactNode }) {
  return <PasscodeLayer>{children}</PasscodeLayer>;
}
