"use client";

import { useCallback, useMemo, useRef, useState, type CSSProperties } from "react";
import { PHOTOS_PER_ROW, pageAt, photoLayout, ratioOf, type PhotoSize } from "./photo-layout";

/**
 * THE PHOTOS IN A BUBBLE (founder, 11 October 2026): one photo fills the
 * bubble; two or three sit in one row; more than three show three in a row and
 * the rest are reached by swiping the group, with a dot per three. Every photo
 * is drawn at its exact proportions: no crop, no padding, no letterbox. The
 * arithmetic is `photo-layout.ts`.
 *
 * A photo's size comes from the row (`message_attachments.width/height`) when
 * it was recorded; otherwise it is measured the moment the picture loads.
 * The strip is the group's own horizontal scroller, so a swipe that starts on
 * it scrolls the photos and never sets a reply (`data-swipe-own`, read by
 * `BubbleGestures`). The dots are buttons as well, for a mouse and a keyboard.
 */

export type GroupPhoto = { id: string; url: string; size?: PhotoSize | null };

export function PhotoGroup({ photos, alt }: { photos: readonly GroupPhoto[]; alt: string }) {
  /* Sizes measured in the browser, by photo id, for rows that carried none. */
  const [measured, setMeasured] = useState<Record<string, number>>({});
  const [page, setPage] = useState(0);
  const stripRef = useRef<HTMLDivElement | null>(null);

  const ratios = photos.map((p) => ratioOf(p.size) ?? measured[p.id] ?? null);
  const ratioKey = ratios.join(",");
  const layout = useMemo(() => photoLayout(ratioKey.split(",").map((r) => (r === "" ? null : Number(r)))), [ratioKey]);
  const paged = layout.pages > 1;

  const measure = useCallback((id: string, img: HTMLImageElement | null) => {
    if (!img || !img.complete || img.naturalWidth === 0) return;
    const ratio = ratioOf({ width: img.naturalWidth, height: img.naturalHeight });
    if (ratio === null) return;
    setMeasured((prev) => (prev[id] === ratio ? prev : { ...prev, [id]: ratio }));
  }, []);

  /* Where each page starts inside the strip, read from the cells themselves. */
  const pageStarts = () => {
    const strip = stripRef.current;
    if (!strip) return [];
    const cells = strip.querySelectorAll<HTMLElement>("[data-page-start]");
    return Array.from(cells, (cell) => cell.offsetLeft);
  };

  const onScroll = () => {
    const strip = stripRef.current;
    if (!strip) return;
    const next = pageAt(strip.scrollLeft, strip.scrollWidth - strip.clientWidth, pageStarts());
    setPage((current) => (current === next ? current : next));
  };

  const goTo = (target: number) => {
    const strip = stripRef.current;
    const left = pageStarts()[target];
    if (!strip || left === undefined) return;
    const quiet = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    strip.scrollTo({ left, behavior: quiet ? "auto" : "smooth" });
    setPage(target);
  };

  return (
    <div
      className="nf-photo-group"
      role={photos.length > 1 ? "group" : undefined}
      aria-label={photos.length > 1 ? `${photos.length} photos` : undefined}
      style={{ width: layout.width }}
      data-count={photos.length}
    >
      <div
        ref={stripRef}
        className="nf-photo-group__strip"
        onScroll={paged ? onScroll : undefined}
        /* A strip that scrolls takes the keyboard too: focused, the arrow
           keys move it, as a finger does. */
        tabIndex={paged ? 0 : undefined}
        data-swipe-own={paged || undefined}
        data-testid="photo-strip"
      >
        {photos.map((photo, i) => {
          const cell = layout.cells[i]!;
          const style: CSSProperties = { flexBasis: cell.basis, aspectRatio: String(cell.ratio) };
          return (
            <span
              key={photo.id}
              className="nf-photo-group__cell"
              style={style}
              data-page-start={paged && i % PHOTOS_PER_ROW === 0 ? "" : undefined}
            >
              {/* Signed and object URLs cannot go through the optimiser. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={alt}
                draggable={false}
                ref={(img) => measure(photo.id, img)}
                onLoad={(event) => measure(photo.id, event.currentTarget)}
              />
            </span>
          );
        })}
      </div>
      {paged ? (
        <div className="nf-photo-group__dots">
          {Array.from({ length: layout.pages }, (_, i) => {
            const from = i * PHOTOS_PER_ROW + 1;
            const to = Math.min(photos.length, from + PHOTOS_PER_ROW - 1);
            return (
              <button
                key={i}
                type="button"
                className="nf-photo-group__dot"
                aria-label={from === to ? `Photo ${from} of ${photos.length}` : `Photos ${from} to ${to} of ${photos.length}`}
                aria-current={page === i || undefined}
                onClick={() => goTo(i)}
                data-testid="photo-dot"
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
