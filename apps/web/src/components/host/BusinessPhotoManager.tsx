"use client";

import { useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button } from "@/components/ui/Button";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { addBusinessPhoto, removeBusinessPhoto } from "@/lib/host/actions";
import {
  MAX_BUSINESS_PHOTOS,
  PHOTO_ACCEPTED_LABEL,
  PHOTO_ACCEPTED_MIME,
  PHOTO_MAX_LABEL,
  rejectPhoto,
} from "@/lib/host/photos";
import { createClient } from "@/lib/supabase/client";

/**
 * The owner's photographs of their venue.
 *
 * WHAT WAS TRUE BEFORE THIS. There was no photo table on the business spine at
 * all, so a restaurant's page drew a Vallo category plate under a plain "No
 * photographs yet" chip whatever the owner sent us, and the onboarding script
 * had to tell the founder, out loud across a table, not to promise otherwise.
 *
 * The upload is the same two-step the document uploader uses and for the same
 * reasons: the browser puts the object in the bucket under the person's own
 * uid prefix, which storage RLS enforces, and the server action records the
 * path only after checking that prefix again. A person who closes the tab
 * keeps every photograph that finished.
 *
 * THE FIRST PHOTOGRAPH IS THE COVER, and the screen says so rather than
 * offering a control that cannot be built honestly yet: position is unique per
 * venue, so a reorder is a swap through a free slot and there is no free slot
 * at ten photographs. Removing the cover promotes the next one, which is a
 * reorder anybody can perform and nobody has to be taught.
 */
export function BusinessPhotoManager({
  businessId,
  userId,
  photos,
}: {
  businessId: string;
  userId: string;
  /** What is on record, cover first. */
  photos: { id: string; url: string }[];
}) {
  const router = useRouter();
  const inputId = useId();
  const input = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, startRemoving] = useTransition();

  const full = photos.length >= MAX_BUSINESS_PHOTOS;

  async function pick(chosen: File | undefined) {
    if (!chosen) return;
    const refusal = rejectPhoto(chosen);
    if (refusal) {
      setError(refusal);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const ext = chosen.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      /* The bucket's own convention: the first folder is the uploader's uid,
         which is what its four policies check. `accommodation-photos` is the
         public photo bucket for the whole estate; the P3 migration's header
         sets out why the business spine shares it rather than inventing one. */
      const path = `${userId}/${businessId}/${crypto.randomUUID()}.${ext}`;
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("accommodation-photos")
        .upload(path, chosen, { contentType: chosen.type });
      if (uploadError) {
        setError("The upload did not finish. Check your connection and choose the photograph again.");
        return;
      }
      const result = await addBusinessPhoto({ businessId, storagePath: path });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  function remove(photoId: string) {
    setError(null);
    startRemoving(async () => {
      const result = await removeBusinessPhoto({ photoId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="nf-host-group">
      <h2 className="nf-host-group__title">Photographs of the venue</h2>
      <p className="nf-host-group__note">
        The room as a guest first sees it, a table laid, the frontage so somebody can recognise it
        from the street, and two or three plates you are known for. A phone camera in good light
        beats a bad professional shoot.
      </p>
      <p className="nf-caption mt-inline">
        The first photograph is the one guests see on your card and at the top of your page. Take
        it down and the next one takes its place. Up to {MAX_BUSINESS_PHOTOS}.
      </p>

      {photos.length > 0 && (
        <ul className="mt-group grid grid-cols-2 gap-row sm:grid-cols-3">
          {photos.map((photo, index) => (
            <li key={photo.id} className="min-w-0">
              <RemoteImage
                src={photo.url}
                alt={
                  index === 0
                    ? "The photograph guests see first"
                    : `Photograph ${index + 1} of your venue`
                }
                width={400}
                height={300}
                sizes="(min-width: 640px) 200px, 45vw"
                className="h-32 w-full rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] object-cover"
              />
              {/* STACKED, NOT A ROW. At 390 two of these sit side by side and
                  a label beside a control has about 80px to live in: the
                  control ran out past the card's edge and the word under it
                  broke in two. The name of the photograph and the way to
                  remove it are a stack at every width. */}
              <div className="mt-inline">
                <span className="nf-overline block">
                  {index === 0 ? "Cover" : `Photograph ${index + 1}`}
                </span>
                {/* GLASS, NOT GHOST. A ghost button is transparent and
                    borderless by design, so under a photograph and beside a
                    bold overline it read as a caption rather than a control:
                    at 390 in dark the words "Take down" sat under the picture
                    looking like its title. The quiet glass edge is the least
                    that makes it legible as something to press, and it is not
                    the rose destructive treatment, because three rose buttons
                    in a grid of three photographs shout at an owner tidying
                    their own pictures. */}
                <Button
                  variant="secondary"
                  size="sm"
                  full
                  disabled={removing || busy}
                  onClick={() => remove(photo.id)}
                >
                  Take down
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={input}
        id={inputId}
        type="file"
        accept={PHOTO_ACCEPTED_MIME.join(",")}
        className="sr-only"
        disabled={busy || full}
        onChange={(event) => void pick(event.target.files?.[0])}
      />
      {full ? (
        <p className="nf-caption mt-group">
          That is {MAX_BUSINESS_PHOTOS} photographs, which is as many as a venue carries. Take one
          down to add another.
        </p>
      ) : (
        <label htmlFor={inputId} className="nf-host-drop mt-group">
          <UiIcon name="picture" size={20} className="shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block nf-body-sm font-semibold">
              {busy ? "Uploading" : photos.length === 0 ? "Add the first photograph" : "Add another"}
            </span>
            <span className="block nf-caption">
              {PHOTO_ACCEPTED_LABEL}, up to {PHOTO_MAX_LABEL} each. One at a time.
            </span>
          </span>
        </label>
      )}

      {error && (
        <p role="alert" className="nf-caption mt-row text-[var(--nf-state-error)]">
          {error}
        </p>
      )}
    </section>
  );
}
