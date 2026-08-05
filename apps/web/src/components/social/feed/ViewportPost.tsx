"use client";

import { useEffect, useRef } from "react";
import { recordView } from "@/lib/social/posts-actions";

/**
 * Records a view once, when the card has genuinely been on screen.
 *
 * Half the card and half a second, so a fast scroll past does not count as
 * having been read. The database counts one person once a day regardless, so
 * this only decides whether to make the call at all: `post_views` has a primary
 * key of post, salted daily bucket and date, the collision IS the success, and
 * `private.fill_view_bucket` computes the bucket from `auth.uid()` so no
 * identifier ever travels through the call.
 *
 * **It lived inside `Feed.tsx` and so did the whole view loop.** Every card
 * carries a view count and renders it, `recordView` was a validated action with
 * a trigger behind it, and a post opened on its own page counted nothing:
 * `/post/[id]` renders `PostCard` directly and never wrapped it. Opening a post
 * is the most deliberate act of reading one there is, so the surface where a
 * view was surest was the one surface that never recorded it. It is its own
 * module now precisely so a third surface rendering a card cannot quietly be a
 * fourth place that forgets.
 */
export function ViewportPost({
  postId,
  children,
}: {
  postId: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const done = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || done.current) return;
    if (typeof IntersectionObserver === "undefined") return;

    let timer = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          timer = window.setTimeout(() => {
            if (done.current) return;
            done.current = true;
            void recordView({ postId });
            observer.disconnect();
          }, 500);
        } else {
          window.clearTimeout(timer);
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(node);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [postId]);

  return <div ref={ref}>{children}</div>;
}
