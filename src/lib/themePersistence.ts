/**
 * Per-user theme persistence helpers.
 *
 * Storage layout (localStorage):
 *   - theme:guest        → preference for unauthenticated visitors
 *   - theme:<userId>     → preference for that signed-in user
 *
 * Defaults to "dark" so the public landing page always loads in dark mode
 * before a visitor has expressed a preference.
 */
export type ThemeChoice = "light" | "dark" | "system";

export const GUEST_THEME_KEY = "theme:guest";
export const DEFAULT_GUEST_THEME: ThemeChoice = "dark";

export const themeStorageKey = (userId: string | null | undefined): string =>
  userId ? `theme:${userId}` : GUEST_THEME_KEY;

const isThemeChoice = (v: unknown): v is ThemeChoice =>
  v === "light" || v === "dark" || v === "system";

/**
 * Resolve the theme to apply on mount / on auth change.
 * Unauthenticated visitors default to dark; signed-in users default to system.
 */
export const loadInitialTheme = (
  userId: string | null | undefined,
  storage: Pick<Storage, "getItem"> | null,
): ThemeChoice => {
  try {
    const raw = storage?.getItem(themeStorageKey(userId));
    if (isThemeChoice(raw)) return raw;
  } catch {
    /* storage unavailable */
  }
  return userId ? "system" : DEFAULT_GUEST_THEME;
};
