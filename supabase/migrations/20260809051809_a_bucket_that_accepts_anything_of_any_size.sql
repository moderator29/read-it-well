-- Every storage bucket accepted anything, of any size.
--
-- Measured before writing this: all six buckets carried file_size_limit null
-- and allowed_mime_types null. Null means no ceiling and no allowlist, so any
-- account holding an upload grant could push a five gigabyte file of any type
-- into a bucket meant for a photograph of a room. Three of the six are public.
--
-- A browser check is not a limit. It is a courtesy to an honest user, and it is
-- removed by anybody who opens the network tab. The limit has to live where the
-- upload actually lands, which is here.
--
-- The numbers are matched to what each bucket is FOR, and to what the interface
-- already promises. agent-documents is 8MB because the KYC uploader states 8MB
-- on screen (components/verification/kyc.ts MAX_FILE_LABEL), and a server that
-- silently allows more than the screen promises is how a limit stops meaning
-- anything.
--
-- HEIC and HEIF are in every image list on purpose. An iPhone shoots HEIC by
-- default, so leaving it out rejects a large share of Nigerian uploads with a
-- message about file types that the person cannot act on without going into
-- their camera settings. QuickTime is in the video lists for the same reason:
-- an iPhone records .mov.

begin;

-- The walkthrough video bucket, which did not exist. public.listing_videos was
-- created with nowhere to put a file.
--
-- 50MB per upload, set by the owner. That is roughly a minute of phone video at
-- 1080p, which is what a walkthrough actually is: a continuous walk through the
-- flat, past a window, out to the gate. Long enough to prove the place is real,
-- short enough that somebody on a Nigerian mobile connection will watch it.
--
-- Private, unlike listing-photos. A video is the strongest evidence a listing
-- is real and therefore the most valuable thing on the platform to steal for a
-- fake listing elsewhere, so it is served through signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-videos',
  'listing-videos',
  false,
  52428800,
  array['video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do update
  set file_size_limit   = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Property photography. Generous, because a listing photograph taken on a good
-- phone in daylight is several megabytes before anybody resizes it, and a
-- rejected photograph is a listing that never gets published.
update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
where id = 'listing-photos';

-- Identity and business documents. 8MB, matching MAX_FILE_LABEL exactly.
-- PDF is here because a bank statement almost always arrives as one.
update storage.buckets
set file_size_limit = 8388608,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
where id = 'agent-documents';

-- A face at display size. Tight on purpose: nothing here needs ten megabytes,
-- and this bucket is public.
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
where id = 'avatars';

update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
where id = 'social-covers';

-- Social posts and stories carry video as well as stills, at the same 50MB
-- ceiling as a walkthrough so there is one number to remember.
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'video/mp4', 'video/quicktime', 'video/webm']
where id = 'social-media';

-- What somebody sends in a chat: a photograph of a meter, a tenancy agreement,
-- a receipt. No video, because a chat is not where a walkthrough belongs and an
-- unbounded video in a private bucket is a storage bill with no ceiling.
update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
where id = 'message-attachments';

commit;
