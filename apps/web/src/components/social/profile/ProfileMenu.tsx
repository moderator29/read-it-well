"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PostGlyph } from "@/components/social/feed/PostGlyph";
import { ReportSheet } from "@/components/social/ReportSheet";
import { useOverlay } from "@/lib/ui/use-overlay";
import {
  blockUser,
  muteTarget,
  reportProfile,
  unblockUser,
  unmuteTarget,
} from "@/lib/social/posts-actions";
import { POST_COPY, PROFILE_REPORT_REASONS } from "@/lib/social/posts-schema";

/**
 * The `…` on a person's page. The sibling of the one on every card.
 *
 * Copy link, mute, report, block. Share is its own round control beside this
 * one on the cover, because sending somebody a person's page is a thing people
 * do often enough to deserve a tap rather than two. The rest are the same
 * actions the card menu calls, and that is the point: blocking somebody from
 * their page and blocking them from something they wrote must be the same
 * block, or one of the two quietly becomes a different feature.
 *
 * Every one of these takes a USER id. The post menu learned this the hard way,
 * where passing a post id would have blocked a uuid that is nobody, reported
 * success, and changed nothing at all.
 *
 * **Blocking from here needs somewhere to land, and that is the whole reason
 * this component is more than a popover.** `social_profiles_select` carries
 * `not private.blocked_with(user_id)` bidirectionally, so the instant the block
 * row is written this page stops existing for the person who wrote it: a
 * refresh would drop them onto the "nothing to show here" screen with no
 * explanation, which reads as the app having lost the person they just acted
 * on. So the block is confirmed first, and then the page is replaced by a
 * designed answer that says what happened, what it means, and offers to undo
 * it. No navigation, no 404, and the undo is real: `unblockUser` deletes the
 * row and the page comes back.
 */
export function ProfileMenu({
  handle,
  userId,
  displayLabel,
  isOwner,
  signedIn,
  initialMuted = false,
  onCover = false,
}: {
  handle: string;
  userId: string;
  displayLabel: string;
  isOwner: boolean;
  signedIn: boolean;
  initialMuted?: boolean;
  /** Floating on a cover photograph rather than sitting on the canvas. */
  onCover?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(initialMuted);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);
  const blockedRef = useRef<HTMLDivElement>(null);

  const who = displayLabel || `@${handle}`;

  const cancelBlock = useCallback(() => setConfirmBlock(false), []);
  /* The blocked result has no dismiss. See the note on its hook below. */
  const noop = useCallback(() => {}, []);

  /*
   * Three overlays live in this component and they are not the same kind of
   * thing, so they do not get the same treatment.
   *
   * The MENU is a `role="menu"` popover. It never claimed `aria-modal` and it
   * must not start: a menu is not a modal, nothing behind it is inert, and
   * trapping Tab in a four-row popover strands the keyboard. It keeps Escape
   * and its focus return, which it already had, and that is the whole
   * contract for a popover.
   *
   * The BLOCK CONFIRM and the BLOCKED RESULT are both `aria-modal` and both
   * cover the page, so both go on the shared hook and own focus while up.
   * They cannot appear together: `blocked` returns early below, so the
   * confirm is unmounted by the time the result renders.
   */
  useOverlay({ open: confirmBlock, onClose: cancelBlock, panelRef: confirmRef });
  /* No `onClose`: this is a terminal state, not a dismissable overlay. The
     way out is "Back to Around" or "Undo the block", both inside it. Escape
     resolving to nothing is correct; what matters is that Tab cannot reach
     the profile behind, which is the page that just stopped existing for
     this reader. */
  useOverlay({ open: blocked, onClose: noop, panelRef: blockedRef });

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        openerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  /**
   * Copy, not share. Share is its own control beside this one now, and two
   * menu rows that open the same sheet is one row too many. Copying is a
   * genuinely different act: it puts the address in a message somebody is
   * already writing, with no sheet in the way.
   */
  const copyLink = () => {
    setOpen(false);
    const url = `${window.location.origin}/u/${handle}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(url);
      setNotice(POST_COPY.copied);
      return;
    }
    setNotice(`The address is rentme.ng/u/${handle}`);
  };

  const requireSignIn = () => {
    if (signedIn) return false;
    router.push("/sign-in");
    return true;
  };

  const onMute = () => {
    setOpen(false);
    if (requireSignIn()) return;
    const next = !muted;
    startTransition(async () => {
      const result = next
        ? await muteTarget({ targetKind: "USER", targetId: userId })
        : await unmuteTarget({ targetKind: "USER", targetId: userId });
      if (!result.ok) {
        setNotice(result.error);
        return;
      }
      setMuted(next);
      setNotice(
        next
          ? POST_COPY.mutedDone
          : `Unmuted. ${who} will show up in your feeds again.`,
      );
      router.refresh();
    });
  };

  const doBlock = () => {
    startTransition(async () => {
      const result = await blockUser({ userId });
      if (!result.ok) {
        setConfirmBlock(false);
        setNotice(result.error);
        return;
      }
      setConfirmBlock(false);
      setBlocked(true);
    });
  };

  const undoBlock = () => {
    startTransition(async () => {
      const result = await unblockUser({ userId });
      if (!result.ok) {
        setNotice(result.error);
        return;
      }
      setBlocked(false);
      router.refresh();
    });
  };

  /* ------------------------------------------------- after the block lands */
  if (blocked) {
    return (
      <div
        className="nf-social-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`You blocked ${who}`}
      >
        <div ref={blockedRef} className="nf-social-sheet__panel">
          <h2 className="nf-h3 text-[1.15rem]">You blocked {who}</h2>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
            {POST_COPY.blockedDone}
          </p>
          <p className="mt-3 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
            That is why this page is covered: from now on it is not there for
            you, and yours is not there for them. Nothing you already wrote is
            deleted.
          </p>

          <div className="mt-6 flex flex-col gap-2">
            <Link href="/around" className="nf-btn nf-btn--primary w-full">
              Back to Around
            </Link>
            <button
              type="button"
              onClick={undoBlock}
              disabled={pending}
              className="nf-btn nf-btn--glass w-full"
            >
              {pending ? "Undoing" : "Undo the block"}
            </button>
          </div>

          {notice ? (
            <p
              role="alert"
              className="mt-3 text-[0.8125rem] leading-relaxed text-[var(--nf-state-error)]"
            >
              {notice}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative">
        <button
          ref={openerRef}
          type="button"
          className={onCover ? "nf-social-round" : "nf-social-more"}
          aria-label={`More actions for ${who}`}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <PostGlyph name="more" size={20} />
        </button>

        {open ? (
          <>
            <button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-20 cursor-default"
              onClick={() => setOpen(false)}
            />
            <div
              ref={menuRef}
              role="menu"
              aria-label={`Actions for ${who}`}
              className="nf-post__menu nf-social-more__menu"
            >
              <button
                type="button"
                role="menuitem"
                className="nf-post__menu-item"
                onClick={copyLink}
              >
                Copy link to this page
              </button>

              {isOwner ? (
                <Link
                  role="menuitem"
                  href={`/u/${handle}/edit`}
                  className="nf-post__menu-item"
                  onClick={() => setOpen(false)}
                >
                  Edit your profile
                </Link>
              ) : (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    className="nf-post__menu-item"
                    onClick={onMute}
                  >
                    {muted ? `Unmute ${who}` : `Mute ${who}`}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="nf-post__menu-item nf-post__menu-item--danger"
                    onClick={() => {
                      setOpen(false);
                      if (requireSignIn()) return;
                      setReporting(true);
                    }}
                  >
                    Report {who}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="nf-post__menu-item nf-post__menu-item--danger"
                    onClick={() => {
                      setOpen(false);
                      if (requireSignIn()) return;
                      setConfirmBlock(true);
                    }}
                  >
                    Block {who}
                  </button>
                </>
              )}
            </div>
          </>
        ) : null}
      </div>

      {notice ? (
        <p role="status" className="nf-social-toast">
          {notice}
        </p>
      ) : null}

      {/* ------------------------------------------------ before the block */}
      {confirmBlock ? (
        <div
          className="nf-social-sheet"
          role="dialog"
          aria-modal="true"
          aria-label={`Block ${who}?`}
        >
          <div ref={confirmRef} className="nf-social-sheet__panel">
            <h2 className="nf-h3 text-[1.15rem]">Block {who}?</h2>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
              You will not see each other anywhere on Vallo. Their page stops
              existing for you and yours stops existing for them, including in
              places you are both in.
            </p>
            <p className="mt-3 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
              They are not told. Undo is offered on the next screen if you
              change your mind.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
              <button
                type="button"
                onClick={doBlock}
                disabled={pending}
                className="nf-btn nf-social-danger flex-1"
              >
                {pending ? "Blocking" : `Block ${who}`}
              </button>
              <button
                type="button"
                onClick={cancelBlock}
                disabled={pending}
                className="nf-btn nf-btn--ghost flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {reporting ? (
        <ReportSheet
          title={`Report ${who}`}
          subject={`The account at @${handle}, not one thing they wrote. To report a single post, use the menu on that post.`}
          reasons={PROFILE_REPORT_REASONS}
          submit={({ reason, detail }) => reportProfile({ userId, reason, detail })}
          onClose={() => setReporting(false)}
        />
      ) : null}
    </>
  );
}
