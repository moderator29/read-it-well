import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { boardFor } from "@/lib/listings/board";
import { listingBoardIsOn, ownedBoardSubject } from "@/lib/listings/board-queries";
import { boardImage, type BoardFormat } from "../board-image";

/**
 * `/agent/listings/<id>/board/image?format=square|a3` (V-08): the board as a
 * PNG, for the listing's own agent only, and only while
 * `feature_flags.listing_board` is on. Everything else is a 404, which says
 * nothing about whether the listing exists.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ listingId: string }> }) {
  const notFound = () => new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });
  if (!(await listingBoardIsOn())) return notFound();
  const { listingId } = await params;
  const owned = await ownedBoardSubject(listingId);
  if (owned.state !== "ready") return notFound();
  const copy = getDictionary(await getLocale()).frontDoor.board;
  const verdict = boardFor(owned.subject, copy);
  if (verdict.state !== "ready") return notFound();
  const format: BoardFormat = new URL(request.url).searchParams.get("format") === "a3" ? "a3" : "square";
  const image = await boardImage(verdict.lines, copy.typeCode, format);
  image.headers.set("cache-control", "private, no-store");
  image.headers.set("content-disposition", `inline; filename="vallo-board-${verdict.lines.code}-${format}.png"`);
  return image;
}
