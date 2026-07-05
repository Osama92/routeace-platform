import { useEffect, useRef } from "react";
import { loadGoogleMaps } from "@/lib/googleMaps";

export interface TrackingPin {
  id: string;
  lat: number;
  lng: number;
  label: string;
  vehicleType: string;
  source: "driver_gps" | "status_update" | "pickup" | "delivery" | "waypoint" | "current_location";
  location: string | null;
  updatedAt: string;
  driverName?: string | null;
  /** waypoint sequence number (1-based) — used when source === "waypoint" */
  sequence?: number;
}

/** A route to draw as a polyline, ordered pickup → waypoints → delivery */
export interface DispatchRoute {
  dispatchId: string;
  label: string;
  pins: TrackingPin[];
}

interface Props {
  pins: TrackingPin[];
  apiKey: string;
  /** When provided, draws route polylines and focuses the map on the selected dispatch */
  routes?: DispatchRoute[];
  selectedDispatchId?: string | null;
}

declare global {
  interface Window { google: any; _raMapReady?: boolean; }
}

const SOURCE_STYLE: Record<
  TrackingPin["source"],
  { color: string; scale: number; zIndex: number }
> = {
  current_location: { color: "#FF3B30", scale: 14, zIndex: 10 },
  driver_gps:       { color: "#00C9A7", scale: 11, zIndex: 9  },
  pickup:           { color: "#34C759", scale: 10, zIndex: 8  },
  delivery:         { color: "#FF9500", scale: 10, zIndex: 8  },
  waypoint:         { color: "#007AFF", scale:  8, zIndex: 7  },
  status_update:    { color: "#F5A623", scale:  8, zIndex: 6  },
};

const SOURCE_LABEL: Record<TrackingPin["source"], string> = {
  current_location: "📍 Current location (latest update)",
  driver_gps:       "📱 Live GPS — Driver App",
  pickup:           "🟢 Pickup point",
  delivery:         "🟠 Delivery point",
  waypoint:         "🔵 En-route waypoint",
  status_update:    "📧 Last status update",
};

function buildMarkerIcon(source: TrackingPin["source"], seq?: number) {
  const { color, scale } = SOURCE_STYLE[source];
  const G = window.google.maps;

  if (source === "current_location") {
    // Pulsing star-shaped icon using SVG path
    return {
      path: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
      fillColor: color,
      fillOpacity: 1,
      strokeColor: "#FFFFFF",
      strokeWeight: 2,
      scale: 1.6,
      anchor: new G.Point(12, 12),
    };
  }

  if (source === "pickup") {
    return {
      path: G.SymbolPath.CIRCLE,
      scale,
      fillColor: color,
      fillOpacity: 1,
      strokeColor: "#FFFFFF",
      strokeWeight: 3,
    };
  }

  if (source === "delivery") {
    // Slightly different shape — downward-pointing marker
    return {
      path: G.SymbolPath.CIRCLE,
      scale,
      fillColor: color,
      fillOpacity: 1,
      strokeColor: "#FFFFFF",
      strokeWeight: 3,
    };
  }

  // waypoint, driver_gps, status_update
  return {
    path: G.SymbolPath.CIRCLE,
    scale,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#FFFFFF",
    strokeWeight: 2,
  };
}

export function GoogleTrackingMap({ pins, apiKey, routes = [], selectedDispatchId }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then(() => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const centre = pins.length > 0
        ? { lat: pins[0].lat, lng: pins[0].lng }
        : { lat: 9.082, lng: 8.6753 };
      mapRef.current = new window.google.maps.Map(containerRef.current, {
        zoom: 6,
        center: centre,
        mapTypeId: "roadmap",
        streetViewControl: false,
        styles: [
          { elementType: "geometry", stylers: [{ color: "#0A1628" }] },
          { featureType: "road", elementType: "geometry", stylers: [{ color: "#162F58" }] },
          { featureType: "water", elementType: "geometry", stylers: [{ color: "#0F2040" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#B8D4F0" }] },
        ],
      });
      console.log("[GoogleTrackingMap] Map initialised, drawing", pins.length, "pins,", routes.length, "routes");
      drawAll(pins, routes, selectedDispatchId ?? null);
    }).catch((err) => {
      console.error("[GoogleTrackingMap] Could not load Google Maps:", err.message);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return;
    drawAll(pins, routes, selectedDispatchId ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins, routes, selectedDispatchId]);

  function clearOverlays() {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
  }

  function drawAll(
    data: TrackingPin[],
    routeList: DispatchRoute[],
    focusDispatchId: string | null,
  ) {
    clearOverlays();
    const bounds = new window.google.maps.LatLngBounds();
    let hasPoints = false;

    // Draw routes first (polylines + their specific pins)
    const drawnPinIds = new Set<string>();
    routeList.forEach((route) => {
      if (route.pins.length < 2) return;
      const path = route.pins.map((p) => ({ lat: p.lat, lng: p.lng }));
      const isSelected = focusDispatchId === route.dispatchId;
      const line = new window.google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: isSelected ? "#00C9A7" : "#4A6FA5",
        strokeOpacity: isSelected ? 0.9 : 0.5,
        strokeWeight: isSelected ? 3 : 2,
        map: mapRef.current,
        zIndex: isSelected ? 5 : 1,
      });
      polylinesRef.current.push(line);

      route.pins.forEach((pin) => {
        drawPin(pin, bounds);
        drawnPinIds.add(pin.id);
        hasPoints = true;
      });
    });

    // Draw remaining fleet pins that aren't part of a drawn route
    data.forEach((pin) => {
      if (drawnPinIds.has(pin.id)) return;
      drawPin(pin, bounds);
      hasPoints = true;
    });

    if (!hasPoints) return;

    if (focusDispatchId) {
      // Focus on the selected dispatch route
      const route = routeList.find((r) => r.dispatchId === focusDispatchId);
      if (route && route.pins.length > 0) {
        const fb = new window.google.maps.LatLngBounds();
        route.pins.forEach((p) => fb.extend({ lat: p.lat, lng: p.lng }));
        mapRef.current.fitBounds(fb, { padding: 60 });
        return;
      }
    }

    const allPins = [...data, ...routeList.flatMap((r) => r.pins)];
    if (allPins.length === 1) {
      mapRef.current.setCenter({ lat: allPins[0].lat, lng: allPins[0].lng });
      mapRef.current.setZoom(12);
    } else if (!bounds.isEmpty()) {
      mapRef.current.fitBounds(bounds, { padding: 40 });
    }
  }

  function drawPin(pin: TrackingPin, bounds: any) {
    const icon = buildMarkerIcon(pin.source, pin.sequence);
    const style = SOURCE_STYLE[pin.source];

    const markerOptions: any = {
      position: { lat: pin.lat, lng: pin.lng },
      map: mapRef.current,
      title: pin.label,
      icon,
      zIndex: style.zIndex,
    };

    // Add sequence label for waypoints
    if (pin.source === "waypoint" && pin.sequence != null) {
      markerOptions.label = {
        text: String(pin.sequence),
        color: "#FFFFFF",
        fontSize: "10px",
        fontWeight: "bold",
      };
    }

    // Bold "P" label for pickup, "D" for delivery
    if (pin.source === "pickup") {
      markerOptions.label = { text: "P", color: "#FFFFFF", fontSize: "10px", fontWeight: "bold" };
    }
    if (pin.source === "delivery") {
      markerOptions.label = { text: "D", color: "#FFFFFF", fontSize: "10px", fontWeight: "bold" };
    }

    const marker = new window.google.maps.Marker(markerOptions);

    const sourceLabel = SOURCE_LABEL[pin.source];
    const infoContent = `
      <div style="font-family: system-ui; padding: 6px 4px; min-width: 190px;">
        <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${pin.label}</div>
        ${pin.driverName ? `<div style="font-size: 12px; color: #555;">👤 ${pin.driverName}</div>` : ""}
        ${pin.location ? `<div style="font-size: 12px; color: #555; margin-top:2px;">📍 ${pin.location}</div>` : ""}
        <div style="font-size: 11px; color: ${SOURCE_STYLE[pin.source].color}; margin-top: 6px;">${sourceLabel}</div>
        <div style="font-size: 11px; color: #888; margin-top: 2px;">
          🕐 ${new Date(pin.updatedAt).toLocaleString("en-NG", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>`;

    const info = new window.google.maps.InfoWindow({ content: infoContent });
    marker.addListener("click", () => info.open(mapRef.current, marker));

    bounds.extend({ lat: pin.lat, lng: pin.lng });
    markersRef.current.push(marker);
  }

  // Visible legend entries — only show what's actually present
  const presentSources = new Set(pins.map((p) => p.source));
  routes.forEach((r) => r.pins.forEach((p) => presentSources.add(p.source)));
  const legendEntries: Array<{ color: string; label: string; source: TrackingPin["source"] }> = [
    { source: "current_location", color: "#FF3B30", label: "Current location" },
    { source: "driver_gps",       color: "#00C9A7", label: "Live GPS" },
    { source: "pickup",           color: "#34C759", label: "Pickup" },
    { source: "delivery",         color: "#FF9500", label: "Delivery" },
    { source: "waypoint",         color: "#007AFF", label: "Waypoint" },
    { source: "status_update",    color: "#F5A623", label: "Status update" },
  ].filter((e) => presentSources.has(e.source));

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full rounded-lg overflow-hidden" />

      {legendEntries.length > 0 && (
        <div className="absolute top-3 left-3 bg-background/90 backdrop-blur rounded-lg px-3 py-2 text-xs space-y-1 border shadow-md">
          {legendEntries.map((e) => (
            <div key={e.source} className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-full border border-white shrink-0"
                style={{ backgroundColor: e.color }}
              />
              <span>{e.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="absolute bottom-3 right-3 bg-background/90 backdrop-blur rounded px-2 py-1 text-[10px] text-muted-foreground border">
        Auto-refreshes every 30s
      </div>
    </div>
  );
}
