-- PENDING: not applied. For the founder to apply (track listing, round 2).
--
-- WHAT: the `listing-videos` bucket's size ceiling goes from 50MB to 100MB.
-- WHY: the founder's rule for listing videos (12 October 2026) is up to
--   100MB and 60 seconds each, at most three per listing. The app already
--   checks 100MB in the browser and in `addVideo`
--   (apps/web/src/lib/agent/listings-model.ts, MAX_UPLOAD_BYTES), so until
--   this is applied a video between 50MB and 100MB is refused by storage at
--   the end of its upload, with the "too large for the bucket" sentence.
-- WHAT IS UNCHANGED: the bucket stays private; the allowed types stay MP4,
--   QuickTime and WebM; the object policies (owner folder `<uid>/...`, admin
--   read) are untouched; `listing_videos_duration_sane` (up to 1800 seconds)
--   is untouched, the 60 second rule is the app's. No table changes.
-- ROLLBACK: set file_size_limit back to 52428800.
-- CHECK AFTER: select file_size_limit from storage.buckets
--   where id = 'listing-videos';  -- expect 104857600

update storage.buckets
   set file_size_limit = 104857600
 where id = 'listing-videos';
