"use client";

import { getDictionary } from "@vallo/i18n";
import { AppRail } from "@/components/app/AppRail";
import { SideFlip } from "@/components/app/flip/SideFlip";
import { PERSON } from "../../_fixtures/people";

/** The drawer render (BCD39CA8): the designed surface, open, at 390px. */
export default function DrawerPreview() {
  const t = getDictionary("en");
  return (
    <SideFlip side="property" t={t}>
      <div className="relative min-h-dvh bg-[var(--nf-surface-canvas)]">
        <div className="absolute inset-0 bg-[var(--nf-overlay-backdrop)]" />
        <div className="nf-drawer nf-drawer--left absolute inset-y-0 left-0 overflow-y-auto" data-theme="dark">
          <AppRail
            t={t}
            side="property"
            active="/home"
            userName={PERSON.name}
            userHandle={PERSON.handle}
            unreadNotifications={5}
            isAgent
            signedIn
            variant="drawer"
            onClose={() => undefined}
          />
        </div>
      </div>
    </SideFlip>
  );
}
