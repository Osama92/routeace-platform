import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Records anonymous pageviews for the public marketing pages.
 *
 * Only the routes listed below are tracked — authenticated app routes are
 * deliberately excluded, both because they are not marketing traffic and
 * because we do not want to build a picture of what a logged-in user is
 * doing inside the product.
 *
 * No cookie or persistent id is set here. The edge function derives an
 * anonymous, daily-rotating hash server-side; the browser never sees or
 * stores an identifier.
 */
const TRACKED_PATHS = new Set([
  "/",
  "/ng",
  "/global",
  "/about",
  "/welcome",
  "/access-hub",
  "/contact",
  "/careers",
]);

export function usePageviewTracking() {
  const location = useLocation();
  // Guards against double-firing in React StrictMode (dev) and on
  // re-renders that do not change the path.
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    const path = location.pathname;
    if (!TRACKED_PATHS.has(path)) return;
    if (lastTracked.current === path) return;
    lastTracked.current = path;

    // Fire and forget: analytics must never delay or break the page.
    void supabase.functions
      .invoke("track-pageview", {
        body: { path, referrer: document.referrer || "" },
      })
      .catch(() => {
        /* deliberately silent — a failed beacon is not a user-facing problem */
      });
  }, [location.pathname]);
}
