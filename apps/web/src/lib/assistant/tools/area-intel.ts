import { z } from "zod";
import { listOpenAreas } from "@/lib/social/areas-queries";
import { getAreaFeed } from "@/lib/social/posts-queries";
import { defineTool, TOOL_FRAMES } from "./types";

/**
 * What people who actually live there have said about a place.
 *
 * This is the one thing on this platform that cannot be bought, scraped or
 * replicated: the social layer holds real posts written by real residents about
 * real Nigerian areas, and until now no AI on the platform could read a word of
 * it. The concierge could tell somebody a flat in Lekki Phase 1 costs a certain
 * amount and had four stars. It could not tell them that three people who live
 * on that road said it floods in July, which is the thing that actually decides
 * whether you move there.
 *
 * Every rule of the layer is inherited rather than re-implemented.
 * `getAreaFeed` reads through the caller's own RLS-bound client, so a held
 * post, a removed post, a post from somebody who blocked this viewer and an
 * area that is not open are all invisible here for the same reason they are
 * invisible on the feed. Nothing is special cased for the assistant.
 *
 * Bodies are truncated and capped. A model given forty posts will summarise
 * forty posts; a model given six is answering a question. What residents
 * wrote reaches the model inside the vallo_tool fence, as data.
 */
const AREA_POST_LIMIT = 6;
const AREA_POST_CHARS = 280;

const input = z.object({
  place: z.string(),
});

export async function runAreaIntel(raw: z.output<typeof input>): Promise<{
  forModel: Record<string, unknown>;
}> {
  const wanted = raw.place.trim().toLowerCase();
  if (wanted.length === 0) {
    return { forModel: { found: false, reason: "No place was named." } };
  }

  const areas = await listOpenAreas();
  if (areas.length === 0) {
    return {
      forModel: {
        found: false,
        /* An honest distinction the model must be able to make: nobody has
           opened a room for this place YET is a different sentence from
           nobody has anything to say about it. */
        reason: "No places are open on Vallo yet, so nobody has posted about anywhere.",
      },
    };
  }

  const hit =
    areas.find((a) => a.name.toLowerCase() === wanted || a.slug.toLowerCase() === wanted) ??
    areas.find((a) => a.name.toLowerCase().includes(wanted) || wanted.includes(a.name.toLowerCase())) ??
    areas.find((a) => a.city.toLowerCase() === wanted);

  if (!hit) {
    return {
      forModel: {
        found: false,
        reason: `Nobody has opened a place for "${wanted}" on Vallo yet. Anybody can open one by searching for it.`,
        openPlaces: areas.slice(0, 8).map((a) => `${a.name}, ${a.city}`),
      },
    };
  }

  const feed = await getAreaFeed(hit.id);
  const said = feed.posts
    .filter((post) => typeof post.body === "string" && post.body.trim().length > 0)
    .slice(0, AREA_POST_LIMIT)
    .map((post) => ({
      /* Who is speaking matters. A SYSTEM post is Vallo's own voice and must
         never be quoted back to somebody as though a neighbour said it. */
      who: post.authorKind === "USER" ? "a resident" : "Vallo",
      said: post.body!.slice(0, AREA_POST_CHARS),
    }));

  return {
    forModel: {
      found: true,
      place: hit.name,
      city: hit.city,
      state: hit.stateCode,
      memberCount: hit.memberCount,
      href: `/around/${hit.slug}`,
      /* Said explicitly, because an empty list and a quiet room are the same
         array and completely different answers. */
      ...(said.length > 0
        ? { recentlySaid: said }
        : { recentlySaid: [], note: "The place is open but nobody has posted in it yet." }),
    },
  };
}

/**
 * The tool that reads the neighbourhood, not the catalogue.
 *
 * Described plainly for the model, because a tool description is a prompt: it
 * has to make clear that this returns OPINIONS from residents rather than facts
 * from us, so the answer attributes them rather than asserting them.
 */
export const areaIntelTool = defineTool({
  name: "area_intel",
  description:
    "Read what people who live in a Nigerian area have actually posted about it on Vallo: what the roads, light, water and daily life are really like. Returns real posts by real residents, newest first, plus whether that place is open on Vallo at all. Use this whenever somebody asks what an area is LIKE to live in, or is choosing between areas. These are residents' own words and opinions, not facts Vallo has checked, so attribute them as such and never state them as our own.",
  input,
  inputSchema: {
    type: "object",
    properties: {
      place: {
        type: "string",
        description:
          "The area, neighbourhood or city to read about, e.g. Lekki Phase 1, Yaba, Wuse, Aba South.",
      },
    },
    required: ["place"],
    additionalProperties: false,
  },
  mode: "read",
  workspaces: TOOL_FRAMES,
  async run(_ctx, args) {
    const { forModel } = await runAreaIntel(args);
    return { data: forModel };
  },
});
