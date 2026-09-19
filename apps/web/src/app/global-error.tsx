"use client";

import { useEffect } from "react";

import { reportClientError } from "@/lib/observability/client";
import "./globals.css";

/**
 * The last boundary in the product, and the first one that had to exist.
 *
 * `app/error.tsx` catches a route that threw, but it renders INSIDE the root
 * layout, so it cannot catch the root layout itself failing. Until this file
 * existed that case, a throw in `layout.tsx` or in a provider above the
 * router, was the browser's own "Application error" page: white, in Times,
 * with our product's name nowhere on it, and with nothing reported. That is
 * the single worst screen a new user could meet on day one in a store.
 *
 * It replaces the root layout entirely, so it renders its own `<html>` and
 * `<body>` and imports the stylesheet itself. It deliberately does NOT reach
 * for the brand moment component: everything above it in the tree has
 * already failed once, and a boundary whose own imports can fail is not a
 * boundary. Plain elements, tokens from the stylesheet, and a link that is a
 * full page load rather than a router navigation.
 *
 * The theme is forced dark because the theme script lives in the layout that
 * just failed, and dark is the product's default (rule 7).
 *
 * The inline styles here read TOKENS AND ONLY TOKENS, with no literal
 * fallbacks: a hex fallback is a raw colour (rule 9) and it cannot follow
 * the theme, so a "safe" fallback would be the one thing guaranteed to look
 * wrong on paper. `./globals.css` is imported by this file itself, so if it
 * did not load neither did this component, and the browser default is a
 * legible page rather than a blank one.
 *
 * The raw error never reaches the screen. The digest is shown because it is
 * the id support needs to find the matching server log, and it is the same
 * id the crash report carries.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[vallo] global error", error);
    reportClientError(error, { kind: "client.global_boundary", digest: error.digest });
  }, [error]);

  return (
    <html lang="en" data-theme="dark">
      <body>
        <main
          style={{
            minHeight: "100svh",
            display: "grid",
            placeItems: "center",
            padding: "2rem 1rem",
            background: "var(--nf-surface-canvas)",
            color: "var(--nf-content-primary)",
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: "26rem" }}>
            <p
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                fontSize: "0.75rem",
                opacity: 0.7,
                margin: 0,
              }}
            >
              Something went wrong
            </p>
            <h1 style={{ fontSize: "1.75rem", lineHeight: 1.2, margin: "0.75rem 0 0" }}>
              Vallo did not load
            </h1>
            <p style={{ margin: "1rem 0 0", opacity: 0.8, lineHeight: 1.6 }}>
              Something on our side stopped before the app could start. Nothing
              you were doing was lost, and trying again usually settles it. If
              it keeps happening, tell support and quote the reference.
            </p>

            {error.digest && (
              <p style={{ margin: "1rem 0 0", fontSize: "0.8125rem", opacity: 0.6 }}>
                Reference {error.digest}
              </p>
            )}

            {/* Both of these were `borderRadius: "999px"`. They are controls
                carrying words, so they take the control radius like every other
                one in the product. The radius is read as a token even here: this
                boundary renders its own <html>, but the token sheet is a global
                stylesheet and the gradient and ink beside it already rely on it,
                so a raw 999px was the only value on this screen that had opted
                out of the system. */}
            <div style={{ marginTop: "1.5rem", display: "grid", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={reset}
                style={{
                  minHeight: "3rem",
                  borderRadius: "var(--nf-radius-control)",
                  border: 0,
                  padding: "0 1.5rem",
                  font: "inherit",
                  fontWeight: 600,
                  cursor: "pointer",
                  background: "var(--nf-gradient-cta)",
                  color: "var(--nf-content-on-brand)",
                }}
              >
                Try again
              </button>
              {/* A full page load on purpose: the router is above this and it
                  is what failed. `/home-or-landing` answers on the server
                  which home belongs to this reader, exactly as the route
                  boundary does. */}
              <a
                href="/home-or-landing"
                style={{
                  minHeight: "3rem",
                  display: "grid",
                  placeItems: "center",
                  borderRadius: "var(--nf-radius-control)",
                  padding: "0 1.5rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  color: "inherit",
                  border: "1px solid var(--nf-glass-border)",
                }}
              >
                Back to home
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
