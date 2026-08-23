"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon issue with bundled webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

export interface HotspotData {
  id: string;
  location_name: string;
  district: string;
  latitude: number;
  longitude: number;
  hazard_type: string;
  complaint_count: number;
  priority_score: number;
  color: "red" | "yellow" | "green";
}

const colorMap: Record<string, string> = {
  red: "#ef4444",
  yellow: "#f59e0b",
  green: "#10b981",
};

const colorLabel: Record<string, string> = {
  red: "Critical",
  yellow: "Moderate",
  green: "Good",
};

// Cache icons by color to avoid recreating on every render
const iconCache = new Map<string, L.DivIcon>();

function createPinIcon(color: string, ariaLabel: string) {
  const cacheKey = `pin-${color}`;
  if (iconCache.has(cacheKey)) return iconCache.get(cacheKey)!;
  const fillColor = colorMap[color] || "#10b981";
  const icon = L.divIcon({
    className: "hotspot-marker-icon",
    html: `<div role="button" tabindex="0" aria-label="${ariaLabel}" style="cursor:pointer;outline:none;"><svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.25));"><path d="M12 0C5.373 0 0 5.373 0 12c0 8.25 9.5 18.375 10.938 20.25a1 1 0 001.124 0C13.5 30.375 24 20.25 24 12 24 5.373 18.627 0 12 0z" fill="${fillColor}"/><circle cx="12" cy="11" r="4.5" fill="white" opacity="0.9"/></svg></div>`,
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    popupAnchor: [0, -28],
  });
  iconCache.set(cacheKey, icon);
  return icon;
}

// Origin marker icon
const originIcon = L.divIcon({
  className: "origin-marker-icon",
  html: `<div style="width:28px;height:28px;border-radius:50%;background:#4f46e5;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><div style="width:8px;height:8px;background:white;border-radius:50%;"></div></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

// Destination marker icon (for selected hotspot)
const destIcon = L.divIcon({
  className: "dest-marker-icon",
  html: `<div style="width:32px;height:32px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 4px 16px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;animation:pulse-ring 1.5s infinite;"><svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

interface RouteInfo {
  distance: number; // meters
  duration: number; // seconds
  geometry: [number, number][]; // [lat, lng] pairs
}

interface HotspotMapProps {
  hotspots: HotspotData[];
  center: [number, number];
  zoom: number;
  onSelect: (h: HotspotData) => void;
  origin?: [number, number] | null;
  routeTarget?: HotspotData | null;
  onRouteLoaded?: (info: { distance: number; duration: number }) => void;
}

export default function HotspotMap({
  hotspots,
  center,
  zoom,
  onSelect,
  origin,
  routeTarget,
  onRouteLoaded,
}: HotspotMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const originMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Disable scrollWheelZoom by default so page scrolls naturally.
    // Ctrl/Cmd + scroll will zoom the map via a custom handler.
    const map = L.map(mapRef.current, {
      center,
      zoom,
      scrollWheelZoom: false,
      zoomControl: true,
      keyboard: true,
      keyboardPanDelta: 80,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);

    // Ctrl/Cmd + scroll wheel zoom handler — uses Leaflet's zoomBy directly
    // so scrollWheelZoom stays off and plain scrolling is never captured.
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const direction = e.deltaY < 0 ? 1 : -1;
        const currentZoom = map.getZoom();
        const nextZoom = Math.max(1, Math.min(19, currentZoom + direction));
        map.setZoom(nextZoom, { animate: true });
      }
      // Without Ctrl: no preventDefault → page scrolls naturally.
    };

    const mapEl = mapRef.current;
    mapEl.addEventListener("wheel", onWheel, { passive: false });

    mapInstanceRef.current = map;

    return () => {
      // Clean up route layers and markers
      if (routeLayerRef.current) {
        routeLayerRef.current.remove();
        routeLayerRef.current = null;
      }
      if (originMarkerRef.current) {
        originMarkerRef.current.remove();
        originMarkerRef.current = null;
      }
      if (destMarkerRef.current) {
        destMarkerRef.current.remove();
        destMarkerRef.current = null;
      }
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapEl.removeEventListener("wheel", onWheel);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fly to center when it changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (map) {
      map.flyTo(center, zoom, { duration: 1.2 });
    }
  }, [center, zoom]);

  // Update markers when hotspots change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    hotspots.forEach((h) => {
      const ariaLabel = `${h.location_name}, ${h.district}: ${colorLabel[h.color]} priority hotspot, score ${h.priority_score}`;
      const icon = createPinIcon(h.color, ariaLabel);
      const marker = L.marker([h.latitude, h.longitude], {
        icon,
        keyboard: true,
        riseOnHover: true,
      } as L.MarkerOptions)
        .addTo(map)
        .bindPopup(
          `<div role="dialog" aria-label="Hotspot details: ${h.location_name}">
            <div style="font-weight:600;color:#0f172a;font-size:13px;margin-bottom:4px;">${h.location_name}</div>
            <div style="font-size:12px;color:#64748b;margin-bottom:4px;">${h.district} • ${h.hazard_type}</div>
            <div style="display:flex;align-items:center;gap:4px;margin-top:4px;">
              <span style="width:8px;height:8px;border-radius:50%;background:${colorMap[h.color]};display:inline-block;" aria-hidden="true"></span>
              <span style="font-size:12px;font-weight:600;color:${colorMap[h.color]};">Priority: ${h.priority_score}</span>
            </div>
          </div>`
        );

      marker.on("click", () => onSelect(h));
      marker.on("keydown", (e: any) => {
        const key = e.originalEvent?.key || e.key;
        if (key === "Enter" || key === " ") {
          e.originalEvent?.preventDefault();
          onSelect(h);
        }
      });
      markersRef.current.push(marker);
    });
  }, [hotspots, onSelect]);

  // Fetch and display route using OSRM
  const fetchRoute = useCallback(async (from: [number, number], to: [number, number]) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    setRouteLoading(true);

    // Clear previous route
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }
    if (originMarkerRef.current) {
      originMarkerRef.current.remove();
      originMarkerRef.current = null;
    }
    if (destMarkerRef.current) {
      destMarkerRef.current.remove();
      destMarkerRef.current = null;
    }

    try {
      // OSRM public demo server - no API key needed
      // Format: /route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=full&geometries=geojson
      const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&steps=true`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
        console.error("OSRM routing failed:", data);
        setRouteLoading(false);
        return;
      }

      const route = data.routes[0];
      const coords: [number, number][] = route.geometry.coordinates.map(
        (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
      );

      // Draw route line
      const routeLine = L.polyline(coords, {
        color: "#4f46e5",
        weight: 5,
        opacity: 0.8,
        dashArray: "10, 6",
        className: "route-line",
      }).addTo(map);

      routeLayerRef.current = routeLine;

      // Add origin marker
      const originMarker = L.marker(from, {
        icon: originIcon,
        zIndexOffset: 1000,
      })
        .addTo(map)
        .bindPopup(`<div style="font-weight:600;color:#0f172a;font-size:13px;">Your Location</div>`);
      originMarkerRef.current = originMarker;

      // Add destination marker
      const destMarker = L.marker(to, {
        icon: destIcon,
        zIndexOffset: 1000,
      }).addTo(map);
      destMarkerRef.current = destMarker;

      // Fit map to show entire route
      const bounds = L.latLngBounds([from, to]);
      coords.forEach((coord) => bounds.extend(coord));
      map.fitBounds(bounds, { padding: [50, 50] });

      // Callback with route info
      if (onRouteLoaded) {
        onRouteLoaded({
          distance: route.distance,
          duration: route.duration,
        });
      }
    } catch (error) {
      console.error("Error fetching route:", error);
      // Show error state so user knows routing failed
      setRouteLoading(false);
    } finally {
      setRouteLoading(false);
    }
  }, [onRouteLoaded]);

  // Handle route display when origin and routeTarget change
  useEffect(() => {
    if (origin && routeTarget) {
      fetchRoute(origin, [routeTarget.latitude, routeTarget.longitude]);
    } else {
      // Clear route if no origin or target
      const map = mapInstanceRef.current;
      if (routeLayerRef.current) {
        routeLayerRef.current.remove();
        routeLayerRef.current = null;
      }
      if (originMarkerRef.current) {
        originMarkerRef.current.remove();
        originMarkerRef.current = null;
      }
      if (destMarkerRef.current) {
        destMarkerRef.current.remove();
        destMarkerRef.current = null;
      }
    }
  }, [origin, routeTarget, fetchRoute]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        ref={mapRef}
        role="application"
        aria-roledescription="interactive map"
        aria-label={`Map showing ${hotspots.length} infrastructure hotspots. Use arrow keys to pan, plus/minus buttons to zoom, Ctrl+scroll to zoom, Tab to navigate between markers.`}
        style={{ width: "100%", height: "100%", minHeight: "480px" }}
        className="rounded-2xl"
      />
      {/* Zoom hint */}
      <div className="absolute bottom-3 left-3 z-[999] bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg shadow-sm border border-[#e2e8f0] text-[10px] text-[#94a3b8] font-medium pointer-events-none">
        Ctrl + Scroll to zoom
      </div>
      {/* Route loading indicator */}
      {routeLoading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 border border-[#e2e8f0]">
          <div className="spinner" />
          <span className="text-xs font-medium text-[#64748b]">Calculating route...</span>
        </div>
      )}
    </div>
  );
}
