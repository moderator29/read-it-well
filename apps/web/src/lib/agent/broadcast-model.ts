import "server-only";

import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";
import { parseBroadcast, type BroadcastKey, type BroadcastParse } from "./broadcast";
import { koboToNairaInput } from "./listings-schema";

/**
 * THE OPTIONAL SECOND READER FOR A PASTED BROADCAST (V-09), AND ITS FENCE.
 *
 * The deterministic reader in `broadcast.ts` is the product. This may only
 * help it, and only inside four walls:
 *
 *   1. IT RUNS ONLY WHEN THREE THINGS ARE TRUE: `ANTHROPIC_API_KEY` is set,
 *      `ASSISTANT_MODEL` names the model (no model name is written in this
 *      repository), and `feature_flags.broadcast_model` exists and says true.
 *      The flag fails closed like `lib/escrow/flag.ts`: a missing row, an
 *      error or no configuration is off. Locally none of the three holds, so
 *      the deterministic answer is the whole answer.
 *   2. IT RETURNS TEXT SPANS, NEVER VALUES. The tool the model is given takes
 *      short strings copied from the message ("1.5m", "10%", "Yaba"). It is
 *      not asked for a number and could not return kobo if it tried.
 *   3. A SPAN MUST APPEAR IN THE MESSAGE, verbatim, or it is thrown away. The
 *      model can point at what the agent wrote; it cannot add to it.
 *   4. SPANS GO BACK THROUGH THE SAME DETERMINISTIC READER, as a synthetic
 *      "Rent 1.5m. Agency 10%." line, and only fields the first pass left
 *      EMPTY are taken from the result. Money is still worked out in integer
 *      kobo by `amountToKobo` and `shareOf`, and the area still has to be on
 *      the closed list.
 *
 * Eight seconds, one call, no retries. Any failure returns the first pass.
 */

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const FLAG_KEY = "broadcast_model";

/** The spans the model may point at, and the label each is re-read under. */
const SPANS: Readonly<Record<string, string>> = {
  rent: "Rent",
  agency: "Agency",
  legal: "Legal",
  agreement: "Agreement",
  caution: "Caution",
  service_charge: "Service charge",
  total: "Total package",
  area: "",
  bedrooms: "",
};

async function flagIsOn(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("feature_flags")
      .select("enabled")
      .eq("key", FLAG_KEY)
      .maybeSingle();
    if (error) return false;
    return data?.enabled === true;
  } catch {
    return false;
  }
}

/** Keep only spans that are short strings found verbatim in the message. */
export function verbatimSpans(message: string, raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== "object") return out;
  const haystack = message.toLowerCase();
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!(key in SPANS) || typeof value !== "string") continue;
    const span = value.trim();
    if (span.length === 0 || span.length > 40) continue;
    if (!haystack.includes(span.toLowerCase())) continue;
    out[key] = span;
  }
  return out;
}

/** Merge a second reading into the first, filling only what the first left empty. */
export function mergeSpans(base: BroadcastParse, spans: Record<string, string>): BroadcastParse {
  const lines: string[] = [];
  for (const [key, span] of Object.entries(spans)) {
    const label = SPANS[key];
    if (key === "bedrooms") lines.push(`${span} bedroom`);
    else if (key === "area") lines.push(span);
    else if (label) lines.push(`${label} ${span}`);
  }
  if (lines.length === 0) return base;
  /* The rent the first pass found is the base any percentage is a share of,
     so it is carried into the synthetic message rather than re-guessed. */
  const rentKobo = base.kobo.rentNaira ?? base.kobo.salePriceNaira;
  if (rentKobo !== undefined && !spans.rent) lines.unshift(`Rent ${koboToNairaInput(rentKobo)}`);
  const second = parseBroadcast(lines.join(". "));

  const values = { ...base.values };
  const kobo = { ...base.kobo };
  const filled = [...base.filled];
  const allowed: readonly BroadcastKey[] = [
    "rentNaira",
    "agencyFeeNaira",
    "legalFeeNaira",
    "agreementFeeNaira",
    "cautionDepositNaira",
    "serviceChargeNaira",
    "totalMoveInNaira",
    "area",
    "city",
    "stateCode",
    "bedrooms",
  ];
  for (const key of allowed) {
    if (values[key] !== undefined || second.values[key] === undefined) continue;
    values[key] = second.values[key];
    if (second.kobo[key] !== undefined) kobo[key] = second.kobo[key];
    filled.push(key);
  }
  return { ...base, values, kobo, filled };
}

export async function refineWithModel(message: string, base: BroadcastParse): Promise<BroadcastParse> {
  const apiKey = (process.env.ANTHROPIC_API_KEY ?? "").trim();
  const model = (process.env.ASSISTANT_MODEL ?? "").trim();
  if (!apiKey || !model) return base;
  if (!(await flagIsOn())) return base;

  const response = await fetch(ANTHROPIC_URL, {
    method: "POST",
    signal: AbortSignal.timeout(8000),
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model,
      max_tokens: 400,
      system:
        "You read a Nigerian property broadcast and point at text in it. Copy short spans exactly as written. Never compute, convert or invent anything. Leave out any field the message does not state.",
      tools: [
        {
          name: "point_at_spans",
          description: "Short spans copied verbatim from the message, one per field it states.",
          input_schema: {
            type: "object",
            additionalProperties: false,
            properties: Object.fromEntries(
              Object.keys(SPANS).map((key) => [key, { type: "string", maxLength: 40 }]),
            ),
          },
        },
      ],
      tool_choice: { type: "tool", name: "point_at_spans" },
      messages: [{ role: "user", content: message.slice(0, 4000) }],
    }),
  });
  if (!response.ok) return base;
  const body = (await response.json()) as { content?: { type: string; input?: unknown }[] };
  const use = body.content?.find((block) => block.type === "tool_use");
  return mergeSpans(base, verbatimSpans(message, use?.input));
}
