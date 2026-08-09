/**
 * The listing detail surfaces' name for the platform's one photographic frame.
 *
 * This file used to hold its own copy of the six-pair gradient array and the
 * skyline SVG, and five other files held the same copy. All of it now lives in
 * `components/app/MediaFrame`; this re-export stays so the hero, the photo
 * grid and the lightbox keep the local name they read well with, and so the
 * next surface that needs a frame finds one rather than pasting a seventh copy.
 */
export { MediaFrame as PhotoFrame, mediaGround, mediaAngle, MediaSkyline } from "../MediaFrame";
