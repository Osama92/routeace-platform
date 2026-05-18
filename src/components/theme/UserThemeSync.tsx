import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";
import {
  loadInitialTheme,
  themeStorageKey,
} from "@/lib/themePersistence";

/**
 * Scopes theme preference per visitor on the same browser.
 *
 * - Unauthenticated visitors → `theme:guest` (defaults to "dark")
 * - Authenticated users     → `theme:<userId>`
 *
 * Without this, next-themes uses a single global "theme" key, so one user's
 * choice would leak to others sharing the browser. Nothing is persisted
 * server-side, so there is zero cross-user data exposure.
 */
const UserThemeSync = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const lastUserId = useRef<string | null | undefined>(undefined);
  const hydrated = useRef(false);

  // Load preference whenever the active identity changes (login/logout/switch).
  useEffect(() => {
    const uid = user?.id ?? null;
    if (uid === lastUserId.current) return;
    lastUserId.current = uid;
    hydrated.current = false;

    const storage = typeof window !== "undefined" ? window.localStorage : null;
    setTheme(loadInitialTheme(uid, storage));

    queueMicrotask(() => {
      hydrated.current = true;
    });
  }, [user?.id, setTheme]);

  // Persist subsequent changes to the active identity's key only.
  useEffect(() => {
    if (!hydrated.current || !theme) return;
    try {
      localStorage.setItem(themeStorageKey(lastUserId.current ?? null), theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  return null;
};

export default UserThemeSync;
