/**
 * Singleton Google Maps + Places script loader.
 * Call loadGoogleMaps() from any component; it resolves once the API is ready.
 * Safe to call multiple times — only one script tag is ever created.
 */

const SCRIPT_ID = "gmaps-ra";
type Callback = () => void;
const pendingCallbacks: Callback[] = [];
let state: "idle" | "loading" | "ready" | "error" = "idle";

export function loadGoogleMaps(): Promise<void> {
  // Always check if Maps already loaded (handles HMR / external loaders)
  if (window.google?.maps) {
    state = "ready";
    return Promise.resolve();
  }

  if (state === "ready") return Promise.resolve();

  // Reset error state so a retry is possible after a dev server restart
  if (state === "error") {
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) existing.remove();
    state = "idle";
  }

  return new Promise((resolve, reject) => {
    // Re-check after potential reset above
    if (window.google?.maps) {
      state = "ready";
      resolve();
      return;
    }

    pendingCallbacks.push(() => {
      if (state === "ready") resolve();
      else reject(new Error("Google Maps failed to load"));
    });

    if (state === "loading") return; // script already in flight

    const apiKey = ((import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ?? "").replace(/^"|"$/g, "").trim();
    if (!apiKey) {
      console.warn("[GoogleMaps] VITE_GOOGLE_MAPS_API_KEY is not set — map and Places will not work");
      state = "error";
      pendingCallbacks.splice(0).forEach((cb) => cb());
      return;
    }

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      state = "loading";
      existing.addEventListener("load", onLoad, { once: true });
      existing.addEventListener("error", onError, { once: true });
      return;
    }

    state = "loading";
    const src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    console.log("[GoogleMaps] Loading Maps + Places script…", src.replace(apiKey, apiKey.slice(0, 8) + "…"));
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.async = true;
    s.defer = true;
    s.src = src;
    s.addEventListener("load", onLoad, { once: true });
    s.addEventListener("error", onError, { once: true });
    document.head.appendChild(s);
  });
}

function onLoad() {
  console.log("[GoogleMaps] Script loaded successfully");
  state = "ready";
  (window as any)._raMapReady = true;
  pendingCallbacks.splice(0).forEach((cb) => cb());
}

function onError(e: Event) {
  console.error("[GoogleMaps] Script failed to load — check your API key, billing, and allowed domains in Google Cloud Console", e);
  state = "error";
  const tag = document.getElementById(SCRIPT_ID);
  if (tag) tag.remove();
  pendingCallbacks.splice(0).forEach((cb) => cb());
}
