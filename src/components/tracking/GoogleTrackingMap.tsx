import { useEffect, useRef, useState } from "react";
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
  sequence?: number;
}

export interface DispatchRoute {
  dispatchId: string;
  label: string;
  pins: TrackingPin[];
}

interface Props {
  pins: TrackingPin[];
  apiKey: string;
  routes?: DispatchRoute[];
  selectedDispatchId?: string | null;
}

declare global {
  interface Window { google: any; _raMapReady?: boolean; }
}

const SOURCE_STYLE: Record<TrackingPin["source"], { color: string; scale: number; zIndex: number }> = {
  current_location: { color: "#E53935", scale: 13, zIndex: 10 },
  driver_gps:       { color: "#00897B", scale: 10, zIndex: 9  },
  pickup:           { color: "#2E7D32", scale:  9, zIndex: 8  },
  delivery:         { color: "#E65100", scale:  9, zIndex: 8  },
  waypoint:         { color: "#1565C0", scale:  7, zIndex: 7  },
  status_update:    { color: "#F57C00", scale:  7, zIndex: 6  },
};

const SOURCE_LABEL: Record<TrackingPin["source"], string> = {
  current_location: "Current location (latest)",
  driver_gps:       "Live GPS — Driver App",
  pickup:           "Pickup point",
  delivery:         "Delivery point",
  waypoint:         "En-route waypoint",
  status_update:    "Status update",
};

// Standard light map style — clean, readable labels
const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", stylers: [{ visibility: "simplified" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
];

function buildMarkerIcon(source: TrackingPin["source"]) {
  const { color, scale } = SOURCE_STYLE[source];
  const G = window.google.maps;

  if (source === "current_location") {
    return {
      path: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
      fillColor: color,
      fillOpacity: 1,
      strokeColor: "#FFFFFF",
      strokeWeight: 2,
      scale: 1.5,
      anchor: new G.Point(12, 12),
    };
  }

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
  const mapRef       = useRef<any>(null);
  const markersRef   = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);

  // Keep latest props accessible inside drawAll without re-registering effects
  const pinsRef              = useRef(pins);
  const routesRef            = useRef(routes);
  const selectedDispatchRef  = useRef(selectedDispatchId);
  pinsRef.current             = pins;
  routesRef.current           = routes;
  selectedDispatchRef.current = selectedDispatchId;

  // ── Init map once ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then(() => {
      if (cancelled || !containerRef.current || mapRef.current) return;

      mapRef.current = new window.google.maps.Map(containerRef.current, {
        zoom: 7,
        center: { lat: 6.5244, lng: 3.3792 }, // Lagos
        mapTypeId: "roadmap",
        streetViewControl: false,
        fullscreenControlOptions: { position: window.google.maps.ControlPosition.TOP_RIGHT },
        mapTypeControlOptions: { position: window.google.maps.ControlPosition.TOP_RIGHT },
        zoomControlOptions:     { position: window.google.maps.ControlPosition.RIGHT_CENTER },
        styles: MAP_STYLES,
      });

      // Fire resize after layout settles so tiles render at correct DPI
      requestAnimationFrame(() => {
        if (cancelled) return;
        window.google.maps.event.trigger(mapRef.current, "resize");
        drawAll(pinsRef.current, routesRef.current, selectedDispatchRef.current ?? null);
      });
    }).catch((err) => {
      if (!cancelled) setMapError(err.message);
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Redraw whenever data or selection changes ─────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return;
    drawAll(pins, routes, selectedDispatchId ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins, routes, selectedDispatchId]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function clearOverlays() {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
  }

  function drawAll(data: TrackingPin[], routeList: DispatchRoute[], focusId: string | null) {
    if (!mapRef.current) return;
    clearOverlays();

    const bounds = new window.google.maps.LatLngBounds();
    let hasPoints = false;
    const drawnIds = new Set<string>();

    // Draw polylines + route pins
    routeList.forEach((route) => {
      const isSelected = focusId === route.dispatchId;
      if (route.pins.length >= 2) {
        polylinesRef.current.push(new window.google.maps.Polyline({
          path: route.pins.map((p) => ({ lat: p.lat, lng: p.lng })),
          geodesic: true,
          strokeColor:   isSelected ? "#1976D2" : "#90A4AE",
          strokeOpacity: isSelected ? 0.85 : 0.45,
          strokeWeight:  isSelected ? 3 : 2,
          map: mapRef.current,
          zIndex: isSelected ? 5 : 1,
        }));
      }
      route.pins.forEach((pin) => {
        drawPin(pin, bounds);
        drawnIds.add(pin.id);
        hasPoints = true;
      });
    });

    // Draw remaining fleet pins
    data.forEach((pin) => {
      if (drawnIds.has(pin.id)) return;
      drawPin(pin, bounds);
      hasPoints = true;
    });

    if (!hasPoints) {
      mapRef.current.setCenter({ lat: 6.5244, lng: 3.3792 });
      mapRef.current.setZoom(10);
      return;
    }

    // Focus zoom: selected route → fit its pins, else fit all
    if (focusId) {
      const route = routeList.find((r) => r.dispatchId === focusId);
      if (route && route.pins.length > 0) {
        const fb = new window.google.maps.LatLngBounds();
        route.pins.forEach((p) => fb.extend({ lat: p.lat, lng: p.lng }));
        if (route.pins.length === 1) {
          mapRef.current.setCenter({ lat: route.pins[0].lat, lng: route.pins[0].lng });
          mapRef.current.setZoom(13);
        } else {
          mapRef.current.fitBounds(fb, 80);
          // Cap zoom so we don't over-zoom on nearby pins
          const listener = window.google.maps.event.addListenerOnce(mapRef.current, "bounds_changed", () => {
            if (mapRef.current.getZoom() > 14) mapRef.current.setZoom(14);
          });
          void listener;
        }
        return;
      }

      // Dispatch in list but no route pins — single fleet pin for this dispatch
      const fleetPin = data.find((p) => p.id === focusId);
      if (fleetPin) {
        mapRef.current.setCenter({ lat: fleetPin.lat, lng: fleetPin.lng });
        mapRef.current.setZoom(13);
        return;
      }
    }

    // No focus or no matching route — fit all pins
    if (data.length + routeList.flatMap((r) => r.pins).length === 1) {
      const only = data[0] ?? routeList[0]?.pins[0];
      mapRef.current.setCenter({ lat: only.lat, lng: only.lng });
      mapRef.current.setZoom(13);
    } else if (!bounds.isEmpty()) {
      mapRef.current.fitBounds(bounds, 60);
      const listener = window.google.maps.event.addListenerOnce(mapRef.current, "bounds_changed", () => {
        if (mapRef.current.getZoom() > 13) mapRef.current.setZoom(13);
      });
      void listener;
    }
  }

  function drawPin(pin: TrackingPin, bounds: any) {
    const icon  = buildMarkerIcon(pin.source);
    const style = SOURCE_STYLE[pin.source];

    const markerOptions: any = {
      position: { lat: pin.lat, lng: pin.lng },
      map: mapRef.current,
      title: pin.label,
      icon,
      zIndex: style.zIndex,
    };

    if (pin.source === "waypoint" && pin.sequence != null) {
      markerOptions.label = { text: String(pin.sequence), color: "#FFFFFF", fontSize: "9px", fontWeight: "bold" };
    }
    if (pin.source === "pickup") {
      markerOptions.label = { text: "P", color: "#FFFFFF", fontSize: "9px", fontWeight: "bold" };
    }
    if (pin.source === "delivery") {
      markerOptions.label = { text: "D", color: "#FFFFFF", fontSize: "9px", fontWeight: "bold" };
    }

    const marker = new window.google.maps.Marker(markerOptions);

    const infoContent = `
      <div style="font-family:system-ui,sans-serif;padding:8px 6px;min-width:200px;max-width:260px;">
        <div style="font-weight:600;font-size:13px;margin-bottom:4px;color:#111;">${pin.label}</div>
        ${pin.driverName ? `<div style="font-size:12px;color:#444;margin-bottom:2px;">👤 ${pin.driverName}</div>` : ""}
        ${pin.location   ? `<div style="font-size:12px;color:#444;margin-bottom:4px;">📍 ${pin.location}</div>` : ""}
        <div style="font-size:11px;font-weight:500;color:${style.color};">${SOURCE_LABEL[pin.source]}</div>
        <div style="font-size:11px;color:#888;margin-top:2px;">
          ${new Date(pin.updatedAt).toLocaleString("en-NG", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}
        </div>
      </div>`;

    const info = new window.google.maps.InfoWindow({ content: infoContent });
    marker.addListener("click", () => info.open(mapRef.current, marker));

    bounds.extend({ lat: pin.lat, lng: pin.lng });
    markersRef.current.push(marker);
  }

  // ── Legend (only sources present in current view) ─────────────────────────
  const presentSources = new Set([
    ...pins.map((p) => p.source),
    ...routes.flatMap((r) => r.pins.map((p) => p.source)),
  ]);
  const legendEntries = ([
    { source: "current_location" as const, color: "#E53935", label: "Current location" },
    { source: "driver_gps"       as const, color: "#00897B", label: "Live GPS"          },
    { source: "pickup"           as const, color: "#2E7D32", label: "Pickup"             },
    { source: "delivery"         as const, color: "#E65100", label: "Delivery"           },
    { source: "waypoint"         as const, color: "#1565C0", label: "Waypoint"           },
    { source: "status_update"    as const, color: "#F57C00", label: "Status update"      },
  ]).filter((e) => presentSources.has(e.source));

  if (mapError) {
    return (
      <div className="w-full h-full rounded-lg bg-secondary/30 flex items-center justify-center">
        <div className="text-center p-6">
          <p className="text-sm font-medium text-destructive mb-1">Map failed to load</p>
          <p className="text-xs text-muted-foreground max-w-xs">{mapError}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Ensure VITE_GOOGLE_MAPS_API_KEY is set, the dev server restarted, and the key has no HTTP referrer restrictions blocking localhost.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full rounded-lg overflow-hidden" />

      {/* Legend — bottom-left so it doesn't clash with map type / fullscreen controls top-right */}
      {legendEntries.length > 0 && (
        <div className="absolute bottom-8 left-3 bg-white/90 backdrop-blur rounded-lg px-3 py-2 text-xs space-y-1 border shadow-md pointer-events-none">
          {legendEntries.map((e) => (
            <div key={e.source} className="flex items-center gap-2 text-gray-700">
              <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
              {e.label}
            </div>
          ))}
        </div>
      )}

      {/* Refresh badge — bottom-left below legend, away from Google controls */}
      <div className="absolute bottom-2 left-3 text-[10px] text-gray-500 pointer-events-none">
        Auto-refreshes every 30s
      </div>
    </div>
  );
}
