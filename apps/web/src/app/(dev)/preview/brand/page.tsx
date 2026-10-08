/* eslint-disable @next/next/no-img-element -- the icon files are shown as the files they are */
import { Logo, LogoMark, LogoWordmark, wordmarkWidth } from "@/design-system/brand/Logo";
import { LogoMarkLive } from "@/design-system/brand/LogoMarkLive";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * THE NEW LOGO AND THE WARM SPARK ON ONE PAGE (D81, 8 October 2026), for the
 * screenshot harness and for review: the lockup, the mark and the wordmark on
 * the page's own ground (night or day by the theme), the reverse artwork on
 * the brand blue, the live mark rising and orbiting, the app icons as shipped,
 * and the spark's placements beside a blue primary. Every figure is an example.
 */
export default function BrandPreview() {
  return (
    <main className="nf-shell flex flex-col gap-lg py-lg" data-testid="brand-preview">
      <section className="flex flex-col gap-md">
        <p className="nf-section-label">The lockup, the mark, the wordmark</p>
        <Logo size={56} wordSize={26} className="self-start" />
        <div className="flex flex-wrap items-end gap-lg">
          <LogoMark size={96} title="Vallo" />
          <LogoMark size={48} />
          <LogoMark size={24} />
          <LogoWordmark width={wordmarkWidth(28)} height={28} />
        </div>
      </section>

      <section className="flex flex-col gap-sm">
        <p className="nf-section-label">Reverse, on the brand blue</p>
        <div
          className="flex items-center gap-md rounded-[var(--nf-container-radius)] p-card"
          style={{ background: "var(--nf-brand-primary)" }}
        >
          <img src="/brand/vallo-mark-reverse.svg" alt="" width={64} height={55} />
          <img src="/brand/vallo-wordmark-reverse.svg" alt="Vallo" width={wordmarkWidth(26)} height={26} />
        </div>
      </section>

      <section className="flex flex-col gap-sm">
        <p className="nf-section-label">The live mark: reveal, and the orbit loader</p>
        <div className="flex items-center gap-xl">
          <LogoMarkLive size={120} motion="reveal" title="Vallo" />
          <LogoMarkLive size={120} motion="orbit" />
        </div>
      </section>

      <section className="flex flex-col gap-sm">
        <p className="nf-section-label">The app icons, as shipped</p>
        <div className="flex flex-wrap items-end gap-md">
          <img src="/pwa/icon-192.png" alt="" width={96} height={96} style={{ borderRadius: "22%" }} />
          <img src="/pwa/icon-maskable-512.png" alt="" width={96} height={96} style={{ borderRadius: "50%" }} />
          <img src="/pwa/apple-touch-icon.png" alt="" width={72} height={72} style={{ borderRadius: "22%" }} />
          <img src="/pwa/icon-48.png" alt="" width={48} height={48} />
          <img src="/pwa/icon-32.png" alt="" width={32} height={32} />
          <img src="/pwa/icon-16.png" alt="" width={16} height={16} />
          <img src="/brand/vallo-email-lockup.png" alt="" width={198} height={56} />
        </div>
      </section>

      <section className="flex flex-col gap-sm">
        <p className="nf-section-label">Blue leads, orange sparks</p>
        <div className="grid gap-row">
          <Button variant="primary" size="lg" full>
            Reserve
          </Button>
          <Button variant="spark" size="lg" full leadingIcon="share">
            Share link
          </Button>
        </div>
        <Progress value={64} label="Example progress" />
        <div className="flex items-center gap-sm">
          <span className="nf-count-badge">5</span>
          <span className="nf-badge nf-badge--spark">New</span>
          <span className="nf-stars" style={{ "--nf-stars-value": 4.5 } as React.CSSProperties} aria-label="4.5 of 5" />
        </div>
        <Skeleton width="100%" height="3rem" radius="md" />
      </section>
    </main>
  );
}
