import Image from "next/image";

/**
 * The ground the first run stands on: the aurora plate behind a centred
 * column, the same ground as the auth family, so the door and the first
 * screen after it read as one place. Shared by the route and by the preview
 * harness so the look proven in the harness is the look that ships.
 */
export function WelcomeStage({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="nf-auth">
      <div className="nf-auth__plate" aria-hidden="true">
        <Image src="/brand/photos/bg-blue-wave.jpg" alt="" fill sizes="100vw" priority />
      </div>
      <div className="nf-aurora" aria-hidden="true" />
      <div className="nf-grid-veil" aria-hidden="true" />
      {children}
    </main>
  );
}
