/**
 * THE NAIRA SIGN ARRIVES WITH THE PAGE ON A MONEY SCREEN (W2, round 5).
 *
 * `₦` (U+20A6) has its own 1,076-byte face, `inter-naira.woff2` (fonts.css,
 * V-78), and the root layout deliberately does not preload it: most first
 * screens draw no price, and OPS-10 preloads only what the first screen
 * paints. So the stylesheet discovered it the first time a figure drew, and
 * on a money screen the hero figure's sign painted in a fallback face and
 * then changed when the face landed: the one glyph that names the currency,
 * on the one number the screen is about.
 *
 * A money route renders this in its layout or its `loading.tsx`. React hoists
 * a `<link rel="preload">` into the document head wherever it is rendered and
 * sends one per href, so the face is fetched beside the stylesheet. (The
 * `preload()` call from react-dom was tried first: from a server layout it
 * reached only the RSC payload, never the HTML head, measured on this Next.)
 * The bytes are the bytes the page fetched anyway; only the moment changes.
 * `crossOrigin` is required: a font is always fetched in CORS mode, and a
 * preload without it is a second request.
 */
export const NAIRA_FACE = "/fonts/v2/inter-naira.woff2";

export function NairaFacePreload() {
  return <link rel="preload" as="font" type="font/woff2" href={NAIRA_FACE} crossOrigin="anonymous" />;
}
