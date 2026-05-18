import { describe, it, expect, beforeEach } from "vitest";
import {
  DEFAULT_GUEST_THEME,
  GUEST_THEME_KEY,
  loadInitialTheme,
  themeStorageKey,
} from "@/lib/themePersistence";

class MemStorage {
  private map = new Map<string, string>();
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
  clear() { this.map.clear(); }
  key() { return null; }
  get length() { return this.map.size; }
}

describe("themePersistence", () => {
  let storage: MemStorage;
  beforeEach(() => { storage = new MemStorage(); });

  it("uses theme:guest for unauthenticated visitors", () => {
    expect(themeStorageKey(null)).toBe(GUEST_THEME_KEY);
    expect(themeStorageKey(undefined)).toBe(GUEST_THEME_KEY);
  });

  it("namespaces signed-in users by id", () => {
    expect(themeStorageKey("user-a")).toBe("theme:user-a");
    expect(themeStorageKey("user-b")).toBe("theme:user-b");
  });

  it("defaults unauthenticated visitors to dark", () => {
    expect(DEFAULT_GUEST_THEME).toBe("dark");
    expect(loadInitialTheme(null, storage)).toBe("dark");
    expect(loadInitialTheme(undefined, storage)).toBe("dark");
  });

  it("returns the guest's saved choice when present", () => {
    storage.setItem(GUEST_THEME_KEY, "light");
    expect(loadInitialTheme(null, storage)).toBe("light");
  });

  it("ignores invalid stored values and falls back to default", () => {
    storage.setItem(GUEST_THEME_KEY, "neon");
    expect(loadInitialTheme(null, storage)).toBe("dark");
  });

  it("keeps user themes isolated from each other and from guest", () => {
    storage.setItem(themeStorageKey("user-a"), "light");
    storage.setItem(themeStorageKey("user-b"), "dark");
    storage.setItem(GUEST_THEME_KEY, "light");

    expect(loadInitialTheme("user-a", storage)).toBe("light");
    expect(loadInitialTheme("user-b", storage)).toBe("dark");
    expect(loadInitialTheme(null, storage)).toBe("light");

    storage.setItem(themeStorageKey("user-a"), "dark");
    expect(loadInitialTheme("user-a", storage)).toBe("dark");
    expect(loadInitialTheme("user-b", storage)).toBe("dark");
    expect(loadInitialTheme(null, storage)).toBe("light");
  });

  it("defaults signed-in users with no saved choice to system", () => {
    expect(loadInitialTheme("user-x", storage)).toBe("system");
  });

  it("survives storage being unavailable", () => {
    expect(loadInitialTheme(null, null)).toBe("dark");
    expect(loadInitialTheme("user-y", null)).toBe("system");
  });
});
