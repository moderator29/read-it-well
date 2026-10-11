"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { ActionBar } from "@/components/ui/ActionBar";
import "@/app/css/catalogue.css";
import "./anchor-foot.css";

/**
 * AN ANCHORED ACTION THAT TAKES YOU TO THE FORM (the detail anatomy's one
 * anchored primary, for a page whose real action is a form further down:
 * a restaurant's table). The same foot as a listing's and a stay's
 * (`nf-detail-foot`): the figure, what it is, and one lit control.
 *
 * It steps aside while the form itself is on screen, so there is never a
 * second primary beside the form's own submit; it returns when the form
 * scrolls away. The foot's height is measured into `--nf-detail-foot-h` and
 * the page ends on a spacer of that height, so nothing is painted under it.
 */
export function AnchorFoot({
  targetId,
  label,
  figure,
  caption,
}: {
  /** The form's element id; the control links to `#targetId`. */
  targetId: string;
  label: string;
  figure?: ReactNode;
  caption: string;
}) {
  const footRef = useRef<HTMLDivElement>(null);
  const [formInView, setFormInView] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setFormInView(Boolean(entry?.isIntersecting)), {
      threshold: 0.25,
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  useEffect(() => {
    const bar = footRef.current?.closest(".nf-action-bar-pinned");
    if (!(bar instanceof HTMLElement)) return;
    const root = document.documentElement;
    const apply = () => root.style.setProperty("--nf-detail-foot-h", `${bar.offsetHeight}px`);
    apply();
    if (typeof ResizeObserver === "undefined") return () => root.style.removeProperty("--nf-detail-foot-h");
    const observer = new ResizeObserver(apply);
    observer.observe(bar);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--nf-detail-foot-h");
    };
  }, []);

  return (
    <>
      <div aria-hidden="true" className="nf-detail-foot-spacer" />
      <ActionBar glow className={`nf-anchorfoot${formInView ? " nf-anchorfoot--away" : ""}`}>
        <div ref={footRef} className="nf-detail-foot" data-testid="anchor-foot">
          <p className="nf-detail-foot__lead">
            {figure ? <span className="nf-detail-foot__figure min-w-0 nf-numeric">{figure}</span> : null}
            <span className="nf-detail-foot__caption leading-snug">{caption}</span>
          </p>
          <ButtonLink
            href={`#${targetId}`}
            variant="primary"
            size="md"
            className="nf-detail-foot__action"
            tabIndex={formInView ? -1 : undefined}
            aria-hidden={formInView || undefined}
          >
            {label}
          </ButtonLink>
        </div>
      </ActionBar>
    </>
  );
}
