import type { ReactNode } from "react";
import { PasscodeLayer } from "@/components/passcode/PasscodeLayer";
/* C12: the workspace sheets, out of `globals.css`. stays.css inherits
   agent.css's `nf-host-*` register, so it comes second. */
import "@/app/css/agent.css";
/* catalogue before stays, as when catalogue was global: stays overrides its tiles. */
import "@/app/css/catalogue.css";
import "@/app/css/stays.css";

/**
 * The host workspace's layout. Its only job is the passcode lock
 * (docs/PASSCODE.md): every host screen is drawn only when this session is
 * unlocked, the lock or the setup screen otherwise. Each page still draws its
 * own frame and checks its own access.
 */
export default function HostLayout({ children }: { children: ReactNode }) {
  return <PasscodeLayer>{children}</PasscodeLayer>;
}
