import { useEffect, useRef } from "react";

export interface TrackingPin {
  id: string;
  lat: number;
  lng: number;
  label: string;
  vehicleType: string;
  source: "driver_gps" | "status_update";
  location: string | null;
  updatedAt: string;
  driverName?: string | null;
}

interface Props {
  pins: TrackingPin[];
  apiKey: string;
}

declare global {
  interface Window {
    google: any;
    _raMapReady?: boolean;
  }
}

export function GoogleTrackingMap({ pins, apiKey }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!apiKey) return;

    const initMap = () => {
      if (!containerRef.current || mapRef.current) return;
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
      drawPins(pins);
    };

    if (window.google?.maps) {
      initMap();
      return;
    }

    if (!document.getElementById("gmaps-ra")) {
      const s = document.createElement("script");
      s.id = "gmaps-ra";
      s.async = true;
      s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      s.onload = () => {
        window._raMapReady = true;
        initMap();
      };
      document.head.appendChild(s);
    } else if (window._raMapReady) {
      initMap();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return;
    drawPins(pins);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins]);

  function drawPins(data: TrackingPin[]) {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    if (!data.length) return;

    const bounds = new window.google.maps.LatLngBounds();

    data.forEach((pin) => {
      const isLive = pin.source === "driver_gps";
      const marker = new window.google.maps.Marker({
        position: { lat: pin.lat, lng: pin.lng },
        map: mapRef.current,
        title: pin.label,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: isLive ? 11 : 8,
          fillColor: isLive ? "#00C9A7" : "#F5A623",
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 2,
        },
      });

      const infoContent = `
        <div style="font-family: system-ui; padding: 4px; min-width: 180px;">
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${pin.label}</div>
          ${pin.driverName ? `<div style="font-size: 12px; color: #555;">👤 ${pin.driverName}</div>` : ""}
          <div style="font-size: 12px; color: #555;">📍 ${pin.location ?? "Location captured"}</div>
          <div style="font-size: 11px; color: ${isLive ? "#00C9A7" : "#F5A623"}; margin-top: 4px;">
            ${isLive ? "📱 Live GPS — Driver App" : "📧 Last status update"}
          </div>
          <div style="font-size: 11px; color: #888; margin-top: 2px;">
            🕐 ${new Date(pin.updatedAt).toLocaleString("en-NG", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>`;

      const info = new window.google.maps.InfoWindow({ content: infoContent });
      marker.addListener("click", () => info.open(mapRef.current, marker));

      bounds.extend({ lat: pin.lat, lng: pin.lng });
      markersRef.current.push(marker);
    });

    if (data.length === 1) {
      mapRef.current.setCenter({ lat: data[0].lat, lng: data[0].lng });
      mapRef.current.setZoom(10);
    } else {
      mapRef.current.fitBounds(bounds);
    }
  }

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full rounded-lg overflow-hidden" />
      <div className="absolute top-3 left-3 bg-background/90 backdrop-blur rounded-lg px-3 py-2 text-xs space-y-1 border">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-emerald-500 border border-white" />
          <span>Live GPS — Driver App</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-amber-500 border border-white" />
          <span>Last status update</span>
        </div>
      </div>
      <div className="absolute bottom-3 right-3 bg-background/90 backdrop-blur rounded px-2 py-1 text-[10px] text-muted-foreground border">
        Auto-refreshes every 30s
      </div>
    </div>
  );
}
