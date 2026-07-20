/**
 * Reverse geocoding with localStorage cache.
 * Cache key = "geo:${lat.toFixed(4)},${lng.toFixed(4)}" — same 4 d.p. precision
 * used in the UI, so coordinates within ~11 m share a cache entry.
 * TTL = 30 days. Never costs more than one API call per unique location.
 */

const CACHE_PREFIX = "geo:";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CacheEntry {
  address: string;
  ts: number;
}

function cacheKey(lat: number, lng: number) {
  return `${CACHE_PREFIX}${lat.toFixed(4)},${lng.toFixed(4)}`;
}

function readCache(lat: number, lng: number): string | null {
  try {
    const raw = localStorage.getItem(cacheKey(lat, lng));
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.ts > TTL_MS) {
      localStorage.removeItem(cacheKey(lat, lng));
      return null;
    }
    return entry.address;
  } catch {
    return null;
  }
}

function writeCache(lat: number, lng: number, address: string) {
  try {
    const entry: CacheEntry = { address, ts: Date.now() };
    localStorage.setItem(cacheKey(lat, lng), JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

/**
 * Returns a human-readable address for the given coordinates.
 * Hits Google Maps Geocoding API on first call; returns cached result thereafter.
 * Falls back to "lat, lng" string if the API is unavailable or returns no results.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

  const cached = readCache(lat, lng);
  if (cached !== null) return cached;

  const apiKey = ((import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ?? "").replace(/^"|"$/g, "").trim();
  if (!apiKey) return fallback;

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&result_type=street_address|route|sublocality|locality`;
    const res = await fetch(url);
    if (!res.ok) return fallback;

    const json = await res.json();
    if (json.status !== "OK" || !json.results?.length) return fallback;

    // Prefer the most specific result; strip country from the end for brevity
    const raw: string = json.results[0].formatted_address ?? fallback;
    // Remove trailing country segment (e.g. ", Nigeria") to save space
    const address = raw.replace(/,\s*[^,]+$/, "").trim() || raw;

    writeCache(lat, lng, address);
    return address;
  } catch {
    return fallback;
  }
}

/**
 * Batch reverse geocoding — deduplicated and cached.
 * Returns a map from "lat,lng" key to address string.
 */
export async function batchReverseGeocode(
  coords: Array<{ lat: number; lng: number }>,
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const unique = Array.from(
    new Map(coords.map((c) => [cacheKey(c.lat, c.lng), c])).values(),
  );
  await Promise.all(
    unique.map(async ({ lat, lng }) => {
      const addr = await reverseGeocode(lat, lng);
      result.set(cacheKey(lat, lng), addr);
    }),
  );
  return result;
}

/** Convenience: look up the result map for a specific coordinate pair */
export function lookupAddress(
  map: Map<string, string>,
  lat: number | null,
  lng: number | null,
): string | null {
  if (lat == null || lng == null) return null;
  return map.get(cacheKey(lat, lng)) ?? null;
}
