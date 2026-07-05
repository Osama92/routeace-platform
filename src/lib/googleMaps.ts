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
  if (state === "ready") return Promise.resolve();
  if (state === "error") return Promise.reject(new Error("Google Maps failed to load"));

  return new Promise((resolve, reject) => {
    // Already loaded externally (e.g. hot reload)
    if (window.google?.maps?.places) {
      state = "ready";
      resolve();
      return;
    }

    pendingCallbacks.push(() => {
      if (state === "ready") resolve();
      else reject(new Error("Google Maps failed to load"));
    });

    if (state === "loading") return; // script already in flight

    const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ?? "";
    if (!apiKey) {
      console.warn("[GoogleMaps] VITE_GOOGLE_MAPS_API_KEY is not set — map and Places will not work");
      state = "error";
      pendingCallbacks.forEach((cb) => cb());
      pendingCallbacks.length = 0;
      return;
    }

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      // Script tag exists from a previous component mount — check if already done
      if (window.google?.maps?.places) {
        state = "ready";
        pendingCallbacks.forEach((cb) => cb());
        pendingCallbacks.length = 0;
        return;
      }
      // Still loading — attach to its events
      state = "loading";
      existing.addEventListener("load", onLoad, { once: true });
      existing.addEventListener("error", onError, { once: true });
      return;
    }

    state = "loading";
    console.log("[GoogleMaps] Loading Maps + Places script…");
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.async = true;
    s.defer = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    s.addEventListener("load", onLoad, { once: true });
    s.addEventListener("error", onError, { once: true });
    document.head.appendChild(s);
  });
}

function onLoad() {
  console.log("[GoogleMaps] Script loaded successfully");
  state = "ready";
  (window as any)._raMapReady = true;
  pendingCallbacks.forEach((cb) => cb());
  pendingCallbacks.length = 0;
}

function onError(e: Event) {
  console.error("[GoogleMaps] Script failed to load — check your API key and billing", e);
  state = "error";
  pendingCallbacks.forEach((cb) => cb());
  pendingCallbacks.length = 0;
}
