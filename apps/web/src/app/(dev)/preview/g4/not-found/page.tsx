import NotFound from "@/app/not-found";

/**
 * The missing page, rendered as itself. `not-found.tsx` is a server page and
 * can be mounted directly; it resolves the session (signed out here) and
 * offers the landing as home.
 */
export default function PreviewNotFound() {
  return <NotFound />;
}
