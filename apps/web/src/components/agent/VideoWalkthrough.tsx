"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { addVideo, removeVideo } from "@/lib/agent/listings-actions";
import {
  MAX_UPLOAD_LABEL,
  MAX_VIDEOS,
  VIDEO_MIME_TYPES,
  rejectUpload,
} from "@/lib/agent/listings-schema";
import { resumableUpload, type UploadProgress } from "@/lib/agent/resumable-upload";
import { loadBrowserClient } from "@/lib/supabase/load-client";
import { SUPABASE_URL } from "@/lib/supabase/env";
import { Icon3D } from "@/components/ui/Icon3D";

/**
 * THE WALKTHROUGH, WHICH NOBODY HAS EVER BEEN ABLE TO UPLOAD.
 *
 * This is the strangest gap in the repository and this component is one half
 * of closing it. Every layer behind it was finished: a private
 * `listing-videos` bucket at 50MB with three mime types, a `listing_videos`
 * table with a three-per-listing ceiling enforced under a lock, `addVideoSchema`
 * and `removeVideoSchema`, `addVideo` and `removeVideo` reading the object's
 * real size and type back from storage, the repository join, signed URL
 * batching for a whole page, the CSP entry, and `Listing.videos` on the public
 * model. There were ZERO `.tsx` callers of any of it and zero `<video>`
 * elements in the product, while the approval email already advertised
 * walkthroughs as the single best thing a lister can add.
 *
 * `rejectUpload` in the schema had no caller either, for the same reason. It
 * has one now: it is the browser's half of the three-layer limit the schema
 * describes, and the other two are the bucket and `addVideo`.
 *
 * GOVERNING-07 screen four draws this: the section heading, a calm explanatory
 * line with a small glyph, and then the clip with a play badge, a progress bar
 * and a way to remove it.
 *
 * THE UPLOAD IS RESUMABLE AND THAT IS THE POINT. `lib/agent/resumable-upload.ts`
 * has the arithmetic: 50MB on a Nigerian mobile uplink is about seven minutes,
 * which is longer than a lift. A single POST loses all of it. This keeps the
 * bytes the server already has, across a dropped connection AND across a tab
 * reload, and says so on the screen rather than leaving somebody guessing.
 */

export type WalkthroughVideo = {
  id: string;
  url: string;
  posterUrl: string | null;
  durationSeconds: number | null;
};

type State =
  | { phase: "idle" }
  | { phase: "uploading"; progress: UploadProgress }
  | { phase: "attaching" };

export function VideoWalkthrough({
  listingId,
  userId,
  videos,
  onChange,
  /** False when the platform has no keys, which the wizard already knows. */
  canUpload,
  /** Creates the listing row if there is not one yet, and returns its id. */
  ensureListing,
}: {
  listingId: string | null;
  userId: string | null;
  videos: WalkthroughVideo[];
  onChange: (videos: WalkthroughVideo[]) => void;
  canUpload: boolean;
  ensureListing: () => Promise<string | null>;
}) {
  const [state, setState] = useState<State>({ phase: "idle" });
  const [notice, setNotice] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement | null>(null);

  const busy = state.phase !== "idle";
  const full = videos.length >= MAX_VIDEOS;

  const onFile = async (file: File) => {
    setNotice(null);

    /* The browser's layer of the three the schema promises. The bucket and
       `addVideo` hold the other two, and `addVideo` reads the real size and
       mime back from storage rather than believing anything said here. */
    const refusal = rejectUpload(file, VIDEO_MIME_TYPES);
    if (refusal) {
      setNotice(refusal);
      return;
    }

    if (!canUpload || !userId) {
      setNotice("Walkthroughs need a signed-in account on a configured platform.");
      return;
    }

    /* A video can never be orphaned: the listing row is created first, the
       same rule the photo path already follows. */
    const id = listingId ?? (await ensureListing());
    if (!id) {
      setNotice("We could not save this listing, so the walkthrough was not uploaded.");
      return;
    }

    /* The browser client loads now, when a video is chosen, not with the
       page (lib/supabase/load-client.ts). A chunk that cannot be fetched is
       an upload that could not start, said in the resumable upload's own
       words for that. */
    const supabase = await loadBrowserClient();
    if (!supabase) {
      setNotice("The upload could not be started. Try again in a moment.");
      return;
    }
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) {
      setNotice("Your session has expired. Sign in again and the upload will carry on.");
      return;
    }

    const extension = extensionFor(file);
    const path = `${userId}/${id}/${crypto.randomUUID()}.${extension}`;

    const controller = new AbortController();
    abort.current = controller;
    setState({ phase: "uploading", progress: { uploaded: 0, total: file.size } });

    const result = await resumableUpload({
      file,
      bucket: "listing-videos",
      path,
      supabaseUrl: SUPABASE_URL,
      accessToken: token,
      onProgress: (progress) => setState({ phase: "uploading", progress }),
      signal: controller.signal,
    });
    abort.current = null;

    if (!result.ok) {
      setState({ phase: "idle" });
      /* A cancellation is not a failure and does not get an error sentence. */
      if (result.reason !== "cancelled") setNotice(result.message);
      return;
    }

    setState({ phase: "attaching" });
    const duration = await durationOf(file);
    const attached = await addVideo({
      listingId: id,
      storagePath: result.path,
      ...(duration === null ? {} : { durationSeconds: duration }),
    });
    setState({ phase: "idle" });

    if (!attached.ok) {
      setNotice(attached.error);
      return;
    }

    /* The signed URL for playback comes from the server on the next read. The
       local object URL stands in until then so the lister sees what they just
       sent rather than a grey box. */
    onChange([
      ...videos,
      {
        id: attached.data.videoId,
        url: URL.createObjectURL(file),
        posterUrl: null,
        durationSeconds: duration,
      },
    ]);
  };

  const drop = async (video: WalkthroughVideo) => {
    if (!listingId) return;
    setNotice(null);
    const removed = await removeVideo({ listingId, videoId: video.id });
    if (!removed.ok) {
      setNotice(removed.error);
      return;
    }
    onChange(videos.filter((held) => held.id !== video.id));
  };

  const percent =
    state.phase === "uploading" && state.progress.total > 0
      ? Math.min(100, Math.round((state.progress.uploaded / state.progress.total) * 100))
      : 0;

  return (
    <section className="mt-lg" data-testid="video-walkthrough">
      <div className="flex items-center gap-sm">
        <span className="grid size-12 shrink-0 place-items-center" aria-hidden="true" data-art="video">
          <Icon3D name="video" size={48} />
        </span>
        <h3 className="nf-h4">Video walkthrough</h3>
      </div>

      {/* The calm explanatory panel with its small round glyph, which appears
          on almost every screen in the governing set. */}
      <div className="nf-panel nf-panel--card mt-inline flex flex-row items-start gap-inline p-card-sm">
        <span
          className="mt-3xs flex size-8 shrink-0 items-center justify-center rounded-[var(--nf-radius-control)] bg-[var(--nf-surface-elevated)]"
          aria-hidden
        >
          <UiIcon name="views" size={16} className="text-[var(--nf-brand-secondary)]" />
        </span>
        <p className="nf-body-sm text-[var(--nf-content-secondary)]">
          A walk through of about a minute, up to {MAX_UPLOAD_LABEL}. It is the single
          strongest thing you can add: it shows the rooms are real. If your connection drops
          the upload carries on from where it stopped rather than starting again.
        </p>
      </div>

      {videos.length > 0 && (
        <ul className="mt-inline space-y-inline">
          {videos.map((video) => (
            <li key={video.id} className="nf-panel nf-panel--card block overflow-hidden p-card-sm">
              {/* A walkthrough of an empty flat carries no speech, so there is
                  no track to caption. */}
              <video
                src={video.url}
                poster={video.posterUrl ?? undefined}
                controls
                preload="metadata"
                playsInline
                className="h-44 w-full rounded-[var(--nf-radius-md)] bg-[var(--nf-surface-inset)] object-cover"
              />
              <div className="mt-inline-tight flex items-center justify-between gap-inline">
                <span className="nf-caption text-[var(--nf-content-muted)]">
                  {video.durationSeconds === null
                    ? "Walkthrough"
                    : `Walkthrough, ${formatClock(video.durationSeconds)}`}
                </span>
                <Button variant="quiet" size="sm" onClick={() => void drop(video)}>
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {state.phase === "uploading" && (
        <div className="nf-panel nf-panel--card block mt-inline p-card-sm" data-testid="video-progress">
          <div className="flex items-center justify-between gap-inline">
            <span className="nf-body-sm text-[var(--nf-content-secondary)]">Uploading</span>
            <span className="nf-numeric nf-body-sm font-semibold">{percent}%</span>
          </div>
          {/* A progress bar is a SHAPE and not a control, so the shape law does
              not reach its track. */}
          <div
            className="mt-inline-tight h-1.5 w-full overflow-hidden rounded-full bg-[var(--nf-surface-inset)]"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Walkthrough upload"
          >
            <div
              className="h-full rounded-full bg-[var(--nf-brand-primary)] transition-[width] duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-inline-tight"
            onClick={() => abort.current?.abort()}
          >
            Stop
          </Button>
        </div>
      )}

      {state.phase === "attaching" && (
        <p className="nf-body-sm mt-inline text-[var(--nf-content-secondary)]">
          Uploaded. Attaching it to the listing.
        </p>
      )}

      {notice && (
        <p role="alert" className="nf-body-sm mt-inline font-medium text-[var(--nf-state-error)]">
          {notice}
        </p>
      )}

      <input
        ref={input}
        type="file"
        accept={VIDEO_MIME_TYPES.join(",")}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void onFile(file);
        }}
      />

      {!full && (
        <Button
          type="button"
          variant="secondary"
          className="mt-inline"
          leadingIcon="picture"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          {videos.length === 0 ? "Add a walkthrough" : "Add another walkthrough"}
        </Button>
      )}

      {full && (
        <p className="nf-caption mt-inline text-[var(--nf-content-muted)]">
          A listing holds up to {MAX_VIDEOS} walkthroughs. Remove one to add another.
        </p>
      )}
    </section>
  );
}

/** mp4, mov or webm, from the mime type rather than from the file name. */
function extensionFor(file: File): string {
  if (file.type === "video/quicktime") return "mov";
  if (file.type === "video/webm") return "webm";
  return "mp4";
}

/**
 * How long the clip is, measured in the browser.
 *
 * Best effort: a codec the browser cannot decode metadata for resolves to null
 * rather than to a guess, and `addVideo` treats the field as optional for
 * exactly that reason. An invented duration would be a number the database
 * cannot produce, which rule 15 forbids.
 */
function durationOf(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: number | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(element.src);
      resolve(value);
    };
    const element = document.createElement("video");
    element.preload = "metadata";
    element.onloadedmetadata = () => {
      const seconds = Math.round(element.duration);
      finish(Number.isFinite(seconds) && seconds > 0 ? seconds : null);
    };
    element.onerror = () => finish(null);
    window.setTimeout(() => finish(null), 5_000);
    element.src = URL.createObjectURL(file);
  });
}

/** "1:04". Seconds alone read as a number rather than as a length. */
function formatClock(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}
