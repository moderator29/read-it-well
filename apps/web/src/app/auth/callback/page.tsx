import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { completeEmailVerification } from "@/lib/auth/actions";
import { Verifying } from "@/components/auth/Verifying";

export const metadata: Metadata = {
  title: "Verifying your email",
  robots: { index: false, follow: false },
};

/**
 * Where every route out of Supabase Auth lands.
 *
 * A confirmation link from a sign-up email, a magic link, a recovery link, an
 * OAuth handshake. This was a route handler that exchanged the code and
 * answered with a 307, which meant the browser sat on a blank document for the
 * length of a round trip and then jumped. It also could not see the implicit
 * flow at all, because that one carries the session in the URL fragment and a
 * fragment never reaches a server, so those people were told their link had
 * expired.
 *
 * It is a screen now. It says what is happening while it happens, and the work
 * runs in a server action, which is the only thing that can both write the
 * session cookies and be called from a page that is already on screen.
 *
 * Supabase can also come back with an error in the query rather than a token,
 * when the link has already been spent or the project refused it. That is
 * answered here rather than being handed to the client to discover.
 */
export const dynamic = "force-dynamic";

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const one = (key: string): string | undefined => {
    const value = params[key];
    return typeof value === "string" && value.length > 0 ? value : undefined;
  };

  /* Supabase's own refusal, passed straight through in the query. */
  if (one("error") ?? one("error_code")) {
    redirect("/sign-in?notice=link-expired");
  }

  return (
    <main
      id="main"
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 py-10"
    >
      <div className="nf-aurora" aria-hidden="true" />
      <Verifying
        code={one("code")}
        tokenHash={one("token_hash") ?? one("token")}
        type={one("type")}
        next={one("next")}
        complete={completeEmailVerification}
      />
    </main>
  );
}
