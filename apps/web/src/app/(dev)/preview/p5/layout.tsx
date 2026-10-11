import type { ReactNode } from "react";

/**
 * The P5 money deck's frame: the member shell's own content wrapper
 * (`AppShell`'s `nf-shell nf-page-stage`, on the soft top), so a screen is
 * judged with the gutter and the wash it has in the product. Development only:
 * the preview layout above 404s it everywhere else.
 */
export default function P5Layout({ children }: { children: ReactNode }) {
  return (
    <div className="nf-soft-top min-h-dvh">
      <p role="note" className="sr-only">
        Fixture data for design review. Every figure, name, reference and date on these pages is invented.
      </p>
      <div className="nf-shell nf-page-stage py-section-tight">{children}</div>
    </div>
  );
}
