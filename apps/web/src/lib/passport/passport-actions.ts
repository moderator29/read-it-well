"use server";

import { revalidatePath } from "next/cache";
import { getDictionary } from "@vallo/i18n";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, resolveSession } from "../actions/session";
import { getLocale } from "../locale";
import { PASSPORT_LINES, type PassportLineKey } from "./model";

/**
 * THE OWNER'S SWITCHES: the whole passport on or off, and each line shown or
 * hidden. One write of the member's own row in `passport_settings`; the table's
 * row level security lets a member write only their own, and its check
 * constraint refuses a line name it does not know, so a crafted request can do
 * neither more nor less than this does.
 */

type Upserter = {
  from(table: string): {
    upsert(
      row: Record<string, unknown>,
      options: { onConflict: string },
    ): Promise<{ error: unknown }>;
  };
};

const schema = z.object({
  enabled: z.boolean(),
  hidden: z.array(z.enum(PASSPORT_LINES)).max(PASSPORT_LINES.length),
});

export async function savePassportSettings(
  input: unknown,
): Promise<ActionResult<{ enabled: boolean; hidden: PassportLineKey[] }>> {
  const copy = getDictionary(await getLocale()).passportV2;
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(copy.signedOut);
  const parsed = validate(schema, input);
  if (!parsed.ok) return fail(copy.saveFailed);
  /* In the order they are drawn, once each. */
  const hidden = PASSPORT_LINES.filter((line) => parsed.data.hidden.includes(line));
  const { error } = await (session.supabase as unknown as Upserter).from("passport_settings").upsert(
    {
      user_id: session.user.id,
      enabled: parsed.data.enabled,
      hidden_lines: hidden,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return fail(copy.saveFailed);
  revalidatePath("/settings/passport");
  return ok({ enabled: parsed.data.enabled, hidden });
}
