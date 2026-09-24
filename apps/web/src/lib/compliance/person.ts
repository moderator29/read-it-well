import "server-only";

/**
 * SCUML items 20 and 15: find a person from what staff type, a handle (with
 * or without the @) or the account id from their person file.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Reader = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, value: string) => {
        maybeSingle: () => PromiseLike<{ data: Record<string, unknown> | null; error: unknown }>;
      };
    };
  };
};

export async function findPerson(client: object, typed: string): Promise<string | null> {
  const value = typed.trim().replace(/^@/, "");
  if (value.length < 2) return null;
  const db = client as Reader;
  if (UUID_RE.test(value)) {
    const { data } = await db.from("profiles").select("id").eq("id", value.toLowerCase()).maybeSingle();
    return typeof data?.id === "string" ? data.id : null;
  }
  const { data } = await db.from("social_profiles").select("user_id").eq("handle", value.toLowerCase()).maybeSingle();
  return typeof data?.user_id === "string" ? data.user_id : null;
}
