import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { withoutComments } from "@/lib/copy/source-scan";

/**
 * The browser Supabase client (supabase-js, about 65KB gzipped) must stay out
 * of first load. These screens only need it after an event (a file chosen, a
 * check-in handed over, a channel opened after mount), so they go through
 * `loadBrowserClient`, which imports it at that moment. A static import of
 * `@/lib/supabase/client` in any of them would put it back in the route's
 * first load.
 */
const LATE = [
  "components/verification/DocumentUploader.tsx",
  "components/social/profile/ProfilePhotos.tsx",
  "components/social/story/StoryComposer.tsx",
  "components/social/feed/Composer.tsx",
  "components/app/inspections/InspectionSheet.tsx",
  "components/app/inspections/GateHandshake.tsx",
  "components/app/inspections/InspectionsLive.tsx",
  "components/support/photo.ts",
  "components/host/PhotoManager.tsx",
  "components/host/HostDocumentUploader.tsx",
  "components/supply/UploadCard.tsx",
  "app/(app)/profile/AccountHero.tsx",
  "lib/messages/unread-live.ts",
  "components/app/agreements/AgreementControls.tsx",
  "components/app/tenancy/TenancyReportCard.tsx",
  "components/agent/ApplyWizard.tsx",
  "components/agent/VideoWalkthrough.tsx",
  "app/agent/list/ListingWizard.tsx",
] as const;

const read = (path: string) => withoutComments(readFileSync(join(process.cwd(), "src", path), "utf8"));

describe("the browser Supabase client is loaded at the moment of use", () => {
  it.each(LATE)("%s has no static import of the client", (path) => {
    expect(read(path)).not.toMatch(/^import\s+(?!type\b)[^;]*from\s+["'](?:@\/lib\/supabase|\.\.?\/supabase)\/client["']/m);
  });

  it("the helper imports it dynamically and nothing else does so statically", () => {
    const helper = read("lib/supabase/load-client.ts");
    expect(helper).toContain('import("@/lib/supabase/client")');
    expect(helper).not.toMatch(/^import\s+(?!type\b)[^;]*from\s+["']@\/lib\/supabase\/client["']/m);
  });

  /* R3-18: the sign-in and sign-up screens drew PasskeySignIn, whose static
     import of the passkey client put supabase-js (65KB gzipped) on both
     routes' first load while passkeys were switched off. */
  it("keeps the passkey client off the sign-in screen's first load", () => {
    const door = read("components/auth/PasskeySignIn.tsx");
    expect(door).not.toMatch(/^import\s+(?!type\b)[^;]*from\s+["']@\/lib\/auth\/passkey-client["']/m);
    expect(door).not.toMatch(/^import\s+(?!type\b)[^;]*from\s+["']@supabase\//m);
    expect(door).toContain('import("@/lib/auth/passkey-client")');
  });

  it("resolves to null when the chunk cannot be fetched, so the caller shows its own upload error", async () => {
    vi.resetModules();
    vi.doMock("@/lib/supabase/client", () => {
      throw new Error("chunk failed");
    });
    const { loadBrowserClient } = await import("./load-client");
    await expect(loadBrowserClient()).resolves.toBeNull();
    vi.doUnmock("@/lib/supabase/client");
  });
});
