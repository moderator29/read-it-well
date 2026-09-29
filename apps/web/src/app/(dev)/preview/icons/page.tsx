import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import {
  UI_ICON_NAMES,
  UiIcon,
  uiIconHasFill,
  type UiIconName,
} from "@/design-system/icons/UiIcon";

/**
 * THE UiIcon GALLERY.
 *
 * Every name in the stroked set at 16, 20 and 24, regular and (where the glyph
 * has one) filled, each row on a raised card over the canvas, so a redraw can be
 * judged at the sizes it ships at rather than at the 24 grid it is drawn on. The theme is the
 * page's own: take the shot once with `data-theme="light"` on the root and once
 * with `data-theme="dark"`.
 *
 * `?grid=1` draws a dashed outline round every cell at its exact size, so a
 * glyph that clips or sits off centre in its box shows against the edge. The strip at the top draws
 * the glyphs inside the real primitives that carry them most (Button
 * `leadingIcon`, Chip `icon`) and a dock-shaped row of the five tab glyphs.
 */

const SIZES = [16, 20, 24] as const;
const DOCK: UiIconName[] = ["home", "search", "feed", "switch-profile", "user"];

export default async function IconGallery({
  searchParams,
}: {
  searchParams: Promise<{ grid?: string }>;
}) {
  const { grid } = await searchParams;
  const showGrid = grid === "1";
  const fillable = UI_ICON_NAMES.filter(uiIconHasFill);

  return (
    <main className="min-h-dvh bg-[var(--nf-surface-canvas)] px-4 py-6 text-[var(--nf-content-primary)]">
      <h1 className="text-lg font-semibold">UiIcon gallery</h1>
      <p className="mt-1 text-sm text-[var(--nf-content-secondary)]">
        {UI_ICON_NAMES.length} glyphs, {fillable.length} with a filled twin. 16 / 20 / 24, regular then filled.
      </p>

      <section aria-label="In context" className="mt-4 flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" leadingIcon="plus">
            New listing
          </Button>
          <Button variant="secondary" leadingIcon="share">
            Share
          </Button>
          <Button variant="ghost" trailingIcon="arrow-right">
            Continue
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip icon="location">Lagos</Chip>
          <Chip icon="bed" selected>
            2 Bed
          </Chip>
          <Chip icon="sliders" chevron>
            Filters
          </Chip>
          <Chip icon="star" selected>
            4+
          </Chip>
        </div>
        <div className="flex items-center justify-around rounded-full border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-raised)] px-2 py-2">
          {DOCK.map((n, i) => (
            <span
              key={n}
              className={
                i === 0
                  ? "flex h-11 w-14 items-center justify-center rounded-full bg-[var(--nf-brand-primary)] text-[var(--nf-content-on-brand)]"
                  : "flex h-11 w-14 items-center justify-center text-[var(--nf-content-secondary)]"
              }
            >
              <UiIcon name={n} size="md" filled={i === 0} />
            </span>
          ))}
        </div>
      </section>

      <ul className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3" data-testid="icon-grid">
        {UI_ICON_NAMES.map((name) => {
          const hasFill = uiIconHasFill(name);
          return (
            <li
              key={name}
              className="flex items-center gap-3 rounded-xl border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-raised)] px-3 py-2"
            >
              <span className="w-28 shrink-0 truncate font-mono text-[11px] text-[var(--nf-content-secondary)]">
                {name}
              </span>
              <span className="flex items-center gap-3">
                {SIZES.map((s) => (
                  <Cell key={s} size={s} grid={showGrid}>
                    <UiIcon name={name} size={s} />
                  </Cell>
                ))}
              </span>
              <span className="ml-auto flex items-center gap-3" role="group" aria-label={hasFill ? "filled" : "no filled twin"}>
                {hasFill ? (
                  SIZES.map((s) => (
                    <Cell key={s} size={s} grid={showGrid}>
                      <UiIcon name={name} size={s} filled />
                    </Cell>
                  ))
                ) : (
                  <span className="w-[84px] text-center text-[11px] text-[var(--nf-content-muted)]">-</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

function Cell({ size, grid, children }: { size: number; grid: boolean; children: React.ReactNode }) {
  return (
    <span
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size, outline: grid ? "1px dashed var(--nf-border-subtle)" : undefined }}
    >
      {children}
    </span>
  );
}
