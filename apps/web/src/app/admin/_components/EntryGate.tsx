"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ENTRY_COOKIE, enterHref, entryRedirect } from "./entry";

/**
 * Enforces the landing rule (R-E) inside `app/admin`, without the proxy.
 *
 * The layout cannot see the path it is rendering, so it hands this gate the
 * one fact it can read (does this browser session carry the entry cookie for
 * this operator) and the gate, which can see the path, decides. On a desk
 * with no entry it renders NOTHING of the desk, on the server as well as in
 * the browser, and replaces the address with `/admin?next=<desk>`. On the
 * overview it writes the entry cookie, so every later desk opens directly.
 */
export function EntryGate({
  entered,
  userId,
  opening = "Opening the overview first.",
  children,
}: {
  entered: boolean;
  userId: string;
  opening?: string;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "/admin";
  const search = useSearchParams();
  const router = useRouter();
  /* The layout is not re-rendered on a client navigation, so its `entered`
     is stale after the overview wrote the cookie; the browser's own cookie
     is read too. On the server there is no document and the prop decides. */
  const target = entryRedirect(pathname, search?.toString() ?? "", entered || cookieEntered(userId));
  const onOverview = pathname === "/admin" || pathname === "/admin/";

  useEffect(() => {
    if (onOverview) {
      // A session cookie: no Max-Age, so it ends when the browser does.
      document.cookie = `${ENTRY_COOKIE}=${encodeURIComponent(userId)}; Path=/admin; SameSite=Lax`;
    }
  }, [onOverview, userId]);

  useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);

  if (target) {
    return (
      <p className="nf-admin-entry" role="status">
        {/* A plain anchor through the server-side entry, so the hop works with
            JavaScript off: `/admin/enter` sets the cookie and lands on the
            overview carrying the desk. */}
        <a href={enterHref(target)} className="nf-admin-entry__link">
          {opening}
        </a>
      </p>
    );
  }
  return <>{children}</>;
}

function cookieEntered(userId: string): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .some((part) => part === `${ENTRY_COOKIE}=${encodeURIComponent(userId)}`);
}
