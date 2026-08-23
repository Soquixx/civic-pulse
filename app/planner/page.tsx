"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Globe,
  ArrowLeft,
  Building2,
  ChevronDown,
  MapPin,
  AlertTriangle,
  FileText,
  Loader2,
  X,
  Download,
  Shield,
  TrendingUp,
  Route as RouteIcon,
  BarChart3,
  Users,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import PriorityBadge from "../components/PriorityBadge";
import ErrorBoundary from "../components/ErrorBoundary";
import { HazardTypeChart, PriorityDistributionChart, ComplaintTrendChart } from "./Charts";

const HotspotMap = dynamic(() => import("./HotspotMap"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-[#f8fafc] rounded-2xl border border-[#e2e8f0]">
      <Loader2 className="w-8 h-8 text-[#4f46e5] animate-spin" />
    </div>
  ),
});

interface Hotspot {
  id: string;
  location_name: string;
  district: string;
  state?: string;
  latitude: number;
  longitude: number;
  hazard_type: string;
  complaint_count: number;
  urgency_score: number;
  pop_density_score: number;
  road_condition_index: number;
  population_impact: string;
  community_need: string;
  priority_score: number;
  color: "red" | "yellow" | "green";
}

interface BriefResult {
  proposal?: string;
  error?: string;
}

interface HotspotMetadata {
  total: number;
  totalNationwide: number;
  states: string[];
  districts: string[];
  hazardTypes: string[];
}

type Role = "district_varanasi" | "national_india";
type Filter = "all" | "red" | "yellow" | "green";

const ROLES: { value: Role; label: string; sub: string }[] = [
  { value: "national_india", label: "National Policy Maker", sub: "India" },
  { value: "district_varanasi", label: "Local District Planner", sub: "Varanasi" },
];

const colorMap: Record<string, string> = {
  red: "#ef4444",
  yellow: "#f59e0b",
  green: "#10b981",
};

export default function PlannerPage() {
  const [role, setRole] = useState<Role>("national_india");
  const [filter, setFilter] = useState<Filter>("all");
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [metadata, setMetadata] = useState<HotspotMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Hotspot | null>(null);
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefResult, setBriefResult] = useState<BriefResult | null>(null);
  const [showBrief, setShowBrief] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([23.2599, 77.4126]);
  const [mapZoom, setMapZoom] = useState(5);
  const [originCoords, setOriginCoords] = useState<[number, number] | null>(null);
  const [routeTarget, setRouteTarget] = useState<Hotspot | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  const [useMyLocation, setUseMyLocation] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchHotspots = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ role, color: filter });
      if (stateFilter && stateFilter !== "all") params.set("state", stateFilter);
      const res = await fetch(`/api/get-hotspots?${params}`);
      const data = await res.json();
      const hotspotList: Hotspot[] = Array.isArray(data) ? data : (data.hotspots || []);
      const meta: HotspotMetadata | null = !Array.isArray(data) && data.metadata ? data.metadata : null;
      setHotspots(hotspotList);
      if (meta) setMetadata(meta);
      if (hotspotList.length > 0 && role === "national_india") {
        setMapCenter([23.2599, 77.4126]);
        setMapZoom(5);
      } else if (hotspotList.length > 0 && role === "district_varanasi") {
        setMapCenter([25.32, 83.0]);
        setMapZoom(12);
      }
    } catch {
      setHotspots([]);
      setMetadata(null);
    }
    setLoading(false);
  }, [role, stateFilter, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchHotspots(); }, [fetchHotspots]);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (selected) {
      setDrawerVisible(true);
      rafRef.current = requestAnimationFrame(() => setDrawerOpen(true));
    } else if (drawerVisible) {
      setDrawerOpen(false);
      timerRef.current = setTimeout(() => setDrawerVisible(false), 350);
    }
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) setShowRoleMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const totalRequests = hotspots.reduce((s, h) => s + (h.complaint_count || 0), 0);
  const activeHotspots = hotspots.length;
  const avgRoadCondition = hotspots.length
    ? Math.round(hotspots.reduce((s, h) => s + (h.road_condition_index || 0), 0) / hotspots.length)
    : 0;
  const criticalCount = hotspots.filter((h) => h.color === "red").length;
  const moderateCount = hotspots.filter((h) => h.color === "yellow").length;

  const handleSelect = useCallback((h: Hotspot) => {
    setSelected(h);
    setRouteTarget(null);
    setRouteInfo(null);
    setMapCenter([h.latitude, h.longitude]);
    setMapZoom(14);
  }, []);

  const handleMapSelect = useCallback(
    (h: { id: string }) => {
      const full = hotspots.find((hs) => hs.id === h.id);
      if (full) handleSelect(full);
    },
    [hotspots, handleSelect]
  );

  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }
    setUseMyLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOriginCoords([position.coords.latitude, position.coords.longitude]);
        setUseMyLocation(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("Unable to get your location. Please check location permissions.");
        setUseMyLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const handleGetRoute = useCallback(() => {
    if (!originCoords || !selected) {
      alert("Please set your origin location first.");
      return;
    }
    setRouteTarget(selected);
    setRouteInfo(null);
  }, [originCoords, selected]);

  const handleClearRoute = useCallback(() => {
    setRouteTarget(null);
    setRouteInfo(null);
  }, []);

  const handleRouteLoaded = useCallback((info: { distance: number; duration: number }) => {
    setRouteInfo(info);
  }, []);

  const handleGenerateBrief = async () => {
    if (!selected) return;
    setBriefLoading(true);
    setBriefResult(null);
    setShowBrief(true);
    try {
      const res = await fetch("/api/generate-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotspot_data: selected }),
      });
      const data = await res.json();
      setBriefResult(data);
    } catch (err: unknown) {
      setBriefResult({ error: err instanceof Error ? err.message : "Failed to generate brief." });
    }
    setBriefLoading(false);
  };

  const resetSelectionState = () => {
    setSelected(null);
    setRouteTarget(null);
    setRouteInfo(null);
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col">
      {/* ---- Top Nav ---- */}
      <nav className="sticky top-0 z-50 bg-white border-b border-[#e2e8f0] shadow-sm">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-1.5 text-xs font-medium text-[#94a3b8] hover:text-[#4f46e5] transition-colors" aria-label="Go to CivicPulse home page">
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              Home
            </Link>
            <div className="h-5 w-px bg-[#e2e8f0]" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#06b6d4] flex items-center justify-center">
                <Globe className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-bold text-[#0f172a]">CivicPulse</span>
            </div>
            <div className="hidden md:flex items-center gap-1 ml-4">
              <span className="px-3 py-1 text-xs font-semibold bg-[#4f46e5] text-white rounded-full">Dashboard</span>
              <Link href="/planner/petitions" className="px-3 py-1 text-xs font-medium text-[#64748b] hover:text-[#4f46e5] hover:bg-[#f1f5f9] rounded-full transition-colors">Petitions</Link>
            </div>
          </div>
          <div className="relative" ref={roleMenuRef}>
            <button onClick={() => setShowRoleMenu(!showRoleMenu)} aria-expanded={showRoleMenu} aria-haspopup="listbox" aria-label={`Current role: ${ROLES.find((r) => r.value === role)?.label}. Click to change role.`} className="flex items-center gap-2 px-3 py-1.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg hover:border-[#c7d2fe] transition-colors text-left">
              <Building2 className="w-4 h-4 text-[#4f46e5]" />
              <div>
                <div className="text-xs font-semibold text-[#0f172a] leading-tight">{ROLES.find((r) => r.value === role)?.label}</div>
                <div className="text-[10px] text-[#94a3b8] leading-tight">{ROLES.find((r) => r.value === role)?.sub}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#94a3b8] ml-1" />
            </button>
            {showRoleMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-[#e2e8f0] rounded-xl shadow-xl py-1 w-64 z-50" role="listbox" aria-label="Select a role">
                {ROLES.map((r) => (
                  <button key={r.value} onClick={() => { setRole(r.value); setShowRoleMenu(false); resetSelectionState(); setFilter("all"); }} className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#f8fafc] transition-colors ${role === r.value ? "bg-[#eef2ff]" : ""}`}>
                    <Building2 className={`w-4 h-4 ${role === r.value ? "text-[#4f46e5]" : "text-[#94a3b8]"}`} />
                    <div>
                      <div className="text-xs font-semibold text-[#0f172a]">{r.label}</div>
                      <div className="text-[10px] text-[#94a3b8]">{r.sub}</div>
                    </div>
                    {role === r.value && <div className="ml-auto w-2 h-2 rounded-full bg-[#4f46e5]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ---- Metrics Strip ---- */}
      <div className="bg-white border-b border-[#e2e8f0]">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#eff6ff] flex items-center justify-center"><FileText className="w-4 h-4 text-[#2563eb]" /></div>
              <div>
                <p className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider">Total Requests</p>
                <p className="text-sm font-bold text-[#0f172a]">{loading ? <span className="inline-block w-12 h-4 bg-[#f1f5f9] rounded animate-pulse" /> : totalRequests.toLocaleString()}</p>
              </div>
            </div>
            <div className="h-8 w-px bg-[#e2e8f0]" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#fef3c7] flex items-center justify-center"><MapPin className="w-4 h-4 text-[#d97706]" /></div>
              <div>
                <p className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider">Active Hotspots</p>
                <p className="text-sm font-bold text-[#0f172a]">{loading ? <span className="inline-block w-6 h-4 bg-[#f1f5f9] rounded animate-pulse" /> : activeHotspots}</p>
              </div>
            </div>
            <div className="h-8 w-px bg-[#e2e8f0]" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#ecfdf5] flex items-center justify-center"><TrendingUp className="w-4 h-4 text-[#10b981]" /></div>
              <div>
                <p className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider">Avg Road Condition</p>
                <p className="text-sm font-bold text-[#0f172a]">{loading ? <span className="inline-block w-8 h-4 bg-[#f1f5f9] rounded animate-pulse" /> : `${avgRoadCondition}%`}</p>
              </div>
            </div>
            <div className="h-8 w-px bg-[#e2e8f0]" />
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                <span className="text-xs font-medium text-[#64748b]">Critical: {loading ? "..." : criticalCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                <span className="text-xs font-medium text-[#64748b]">Moderate: {loading ? "..." : moderateCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Citizen Petitions Section ---- */}
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4 w-full">
        <Link href="/planner/petitions" className="block bg-white rounded-2xl border border-[#e2e8f0] shadow-sm hover:shadow-md hover:border-[#c7d2fe] transition-all group">
          <div className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#0f172a]">Citizen Petitions</h2>
                  <p className="text-xs text-[#94a3b8] mt-0.5">Infrastructure complaints from citizens across India — {loading ? "..." : hotspots.length} active petitions</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="hidden md:flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-lg font-bold text-[#0f172a]">{loading ? "..." : totalRequests.toLocaleString()}</p>
                    <p className="text-[10px] text-[#94a3b8] uppercase">Complaints</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-[#ef4444]">{loading ? "..." : criticalCount}</p>
                    <p className="text-[10px] text-[#94a3b8] uppercase">Critical</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[#4f46e5]">
                  <span className="text-xs font-semibold hidden sm:block">View All Petitions</span>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* ---- Main Map Section ---- */}
      <div className="flex-1 max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pb-4 w-full">
        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden" style={{ minHeight: "65vh" }}>
          <div className="px-4 py-3 border-b border-[#f1f5f9] bg-[#fafbfc]">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-bold text-[#0f172a]">Infrastructure Map</h2>
                <span className="text-xs text-[#94a3b8]">•</span>
                <span className="text-xs text-[#94a3b8]">{loading ? "Loading..." : `${activeHotspots} hotspots nationwide`}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {metadata && metadata.states && metadata.states.length > 0 && (
                  <select value={stateFilter} onChange={(e) => { setStateFilter(e.target.value); }} aria-label="Filter by state" className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#e2e8f0] bg-white text-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent cursor-pointer">
                    <option value="all">All States ({metadata.totalNationwide})</option>
                    {metadata.states.map((state) => (<option key={state} value={state}>{state}</option>))}
                  </select>
                )}
                <div className="flex items-center gap-1 bg-[#f1f5f9] rounded-lg p-1" role="group" aria-label="Priority filter">
                  {(["all", "red", "yellow", "green"] as Filter[]).map((f) => (
                    <button key={f} onClick={() => { setFilter(f); }} aria-pressed={filter === f} className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${filter === f ? (f === "red" ? "bg-[#fef2f2] text-[#b91c1c] shadow-sm" : f === "yellow" ? "bg-[#fffbeb] text-[#92400e] shadow-sm" : f === "green" ? "bg-[#ecfdf5] text-[#065f46] shadow-sm" : "bg-white text-[#1e40af] shadow-sm") : "text-[#64748b] hover:text-[#4f46e5]"}`}>
                      {f === "all" && "All"}
                      {f === "red" && "🔴 Critical"}
                      {f === "yellow" && "🟡 Moderate"}
                      {f === "green" && "🟢 Good"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="relative" style={{ height: "calc(65vh - 56px)" }}>
            {loading && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                <Loader2 className="w-8 h-8 text-[#4f46e5] animate-spin" />
              </div>
            )}
            <ErrorBoundary>
              <HotspotMap
                hotspots={hotspots.map((h) => ({ id: h.id, location_name: h.location_name, district: h.district, latitude: h.latitude, longitude: h.longitude, hazard_type: h.hazard_type, complaint_count: h.complaint_count, priority_score: h.priority_score, color: h.color }))}
                center={mapCenter}
                zoom={mapZoom}
                onSelect={handleMapSelect}
                origin={originCoords}
                routeTarget={routeTarget}
                onRouteLoaded={handleRouteLoaded}
              />
            </ErrorBoundary>

            {/* Floating Details Panel (Desktop) */}
            {selected && (
              <div className="hidden lg:block absolute top-4 right-4 w-80 bg-white rounded-xl shadow-2xl border border-[#e2e8f0] z-[1000] max-h-[calc(100%-32px)] overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-[#f1f5f9] bg-[#fafbfc]">
                  <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-xs font-medium text-[#64748b] hover:text-[#4f46e5] transition-colors mb-2">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Map</span>
                  </button>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-[#0f172a] truncate">{selected.location_name}</h3>
                      <p className="text-xs text-[#94a3b8]">{selected.district} District{selected.state ? `, ${selected.state}` : ""}</p>
                    </div>
                    <button onClick={() => setSelected(null)} className="p-1 rounded-lg hover:bg-[#f1f5f9] transition-colors ml-2" aria-label="Close hotspot details">
                      <X className="w-4 h-4 text-[#94a3b8]" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <PriorityBadge color={selected.color} showLabel={true} />
                    <span className="badge badge-blue text-[10px]">{selected.hazard_type}</span>
                  </div>
                </div>

                <div className="px-4 py-3 space-y-3 flex-1 overflow-y-auto">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-[#94a3b8] uppercase">Priority Score</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(selected.priority_score, 100)}%`, background: colorMap[selected.color] }} />
                      </div>
                      <span className="text-xs font-bold" style={{ color: colorMap[selected.color] }}>{selected.priority_score}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-[#94a3b8] uppercase">Complaints</span>
                    <span className="text-xs font-semibold text-[#0f172a]">{selected.complaint_count}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-[#94a3b8] uppercase">Road Index</span>
                    <span className="text-xs font-semibold text-[#0f172a]">{selected.road_condition_index}%</span>
                  </div>
                  <div className="pt-2 border-t border-[#f1f5f9]">
                    <p className="text-[10px] font-semibold text-[#94a3b8] uppercase mb-1">Community Need</p>
                    <p className="text-xs text-[#0f172a] leading-relaxed">{selected.community_need}</p>
                  </div>
                </div>

                {routeInfo && (
                  <div className="px-4 py-2 bg-[#eff6ff] border-t border-[#bfdbfe]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <RouteIcon className="w-3.5 h-3.5 text-[#4f46e5]" />
                        <span className="text-[10px] font-semibold text-[#1e40af] uppercase">Route</span>
                      </div>
                      <button onClick={handleClearRoute} className="text-[10px] font-medium text-[#64748b] hover:text-[#0f172a]">Clear</button>
                    </div>
                    <div className="flex gap-4 mt-1">
                      <span className="text-xs font-bold text-[#0f172a]">{routeInfo.distance < 1000 ? `${Math.round(routeInfo.distance)}m` : `${(routeInfo.distance / 1000).toFixed(1)}km`}</span>
                      <span className="text-xs font-bold text-[#0f172a]">{routeInfo.duration < 60 ? `${Math.round(routeInfo.duration)}s` : routeInfo.duration < 3600 ? `${Math.round(routeInfo.duration / 60)}m` : `${(routeInfo.duration / 3600).toFixed(1)}h`}</span>
                    </div>
                  </div>
                )}

                <div className="px-4 py-3 border-t border-[#f1f5f9] bg-[#fafbfc] space-y-2">
                  <div className="flex gap-2">
                    {!originCoords ? (
                      <button onClick={handleUseMyLocation} disabled={useMyLocation} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#eef2ff] text-[#4f46e5] font-medium rounded-lg hover:bg-[#c7d2fe] disabled:opacity-50 transition-all text-xs">
                        {useMyLocation ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
                        <span>{useMyLocation ? "Locating..." : "Use My Location"}</span>
                      </button>
                    ) : (
                      <button onClick={handleGetRoute} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#eef2ff] text-[#4f46e5] font-medium rounded-lg hover:bg-[#c7d2fe] transition-all text-xs">
                        <RouteIcon className="w-3.5 h-3.5" />
                        <span>Get Route</span>
                      </button>
                    )}
                  </div>
                  <button onClick={handleGenerateBrief} disabled={briefLoading} className="w-full flex items-center justify-center gap-1.5 bg-[#4f46e5] text-white font-semibold py-2 rounded-lg hover:bg-[#4338ca] disabled:opacity-50 transition-all text-xs">
                    {briefLoading ? <span className="flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</span> : <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Generate PWD Brief</span>}
                  </button>
                </div>
              </div>
            )}

            {/* Route Info Bar */}
            {routeInfo && !selected && (
              <div className="absolute bottom-4 left-4 right-4 lg:right-auto lg:w-80 bg-white rounded-xl shadow-lg border border-[#e2e8f0] z-[1000] px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RouteIcon className="w-4 h-4 text-[#4f46e5]" />
                    <span className="text-xs font-semibold text-[#0f172a]">Route to {routeTarget?.location_name}</span>
                  </div>
                  <button onClick={handleClearRoute} className="text-xs font-medium text-[#64748b] hover:text-[#0f172a]">Clear</button>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <div>
                    <p className="text-[10px] text-[#64748b] uppercase">Distance</p>
                    <p className="text-sm font-bold text-[#0f172a]">{routeInfo.distance < 1000 ? `${Math.round(routeInfo.distance)} m` : `${(routeInfo.distance / 1000).toFixed(1)} km`}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#64748b] uppercase">Duration</p>
                    <p className="text-sm font-bold text-[#0f172a]">{routeInfo.duration < 60 ? `${Math.round(routeInfo.duration)} sec` : routeInfo.duration < 3600 ? `${Math.round(routeInfo.duration / 60)} min` : `${(routeInfo.duration / 3600).toFixed(1)} hr`}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---- Data Visualization ---- */}
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pb-8 w-full">
        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#f1f5f9] flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#f5f3ff] flex items-center justify-center"><BarChart3 className="w-4 h-4 text-[#7c3aed]" /></div>
            <div>
              <h3 className="text-sm font-bold text-[#0f172a]">Data Visualization</h3>
              <p className="text-xs text-[#94a3b8]">Analytics and trends from citizen reports</p>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#fafbfc] rounded-xl p-4 border border-[#f1f5f9]">
                <h4 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">Hazard Type Distribution</h4>
                <HazardTypeChart hotspots={hotspots} />
              </div>
              <div className="bg-[#fafbfc] rounded-xl p-4 border border-[#f1f5f9]">
                <h4 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">Priority Distribution</h4>
                <PriorityDistributionChart hotspots={hotspots} />
              </div>
              <div className="bg-[#fafbfc] rounded-xl p-4 border border-[#f1f5f9]">
                <h4 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">Complaint Trend by Priority</h4>
                <ComplaintTrendChart hotspots={hotspots} />
              </div>
            </div>
          </div>
        </div>
      </div>            {/* ---- Mobile Bottom-Sheet Drawer ---- */}
      {drawerVisible && selected && (
        <>
          <div className={`drawer-backdrop ${drawerOpen ? "open" : ""} lg:hidden`} onClick={() => setSelected(null)} />
          <div className={`drawer-sheet ${drawerOpen ? "open" : ""} lg:hidden bg-white shadow-2xl flex flex-col`}>
            <div className="drawer-handle" />
            <div className="px-5 pt-3 pb-2 border-b border-[#f1f5f9] shrink-0">
              <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-xs font-medium text-[#64748b] hover:text-[#4f46e5] transition-colors mb-2">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Map</span>
              </button>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h2 className="text-base font-bold text-[#0f172a] leading-tight">{selected.location_name}</h2>
                  <p className="text-xs text-[#94a3b8] mt-0.5">{selected.district} District</p>
                </div>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-[#f1f5f9] transition-colors -mt-0.5 -mr-1" aria-label="Close hotspot details">
                  <X className="w-4 h-4 text-[#94a3b8]" />
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <PriorityBadge color={selected.color} showLabel={true} />
                <span className="badge badge-blue">{selected.hazard_type}</span>
              </div>
            </div>
            <div className="px-5 py-3 space-y-3 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">Priority Score</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(selected.priority_score, 100)}%`, background: colorMap[selected.color] }} />
                  </div>
                  <span className="text-sm font-bold" style={{ color: colorMap[selected.color] }}>{selected.priority_score}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">Complaint Density</span>
                <span className="text-sm font-semibold text-[#0f172a]">{selected.complaint_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">Road Index</span>
                <span className="text-sm font-semibold text-[#0f172a]">{selected.road_condition_index}%</span>
              </div>
              <div className="pt-2 border-t border-[#f1f5f9]">
                <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-1">Community Need</p>
                <p className="text-sm text-[#0f172a] leading-relaxed">{selected.community_need}</p>
              </div>
            </div>
            {routeInfo && (
              <div className="px-5 py-3 border-t border-[#f1f5f9] bg-[#eff6ff]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RouteIcon className="w-4 h-4 text-[#4f46e5]" />
                    <span className="text-xs font-semibold text-[#1e40af] uppercase tracking-wider">Route Info</span>
                  </div>
                  <button onClick={handleClearRoute} className="text-xs font-medium text-[#64748b] hover:text-[#0f172a] transition-colors">Clear</button>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <div>
                    <p className="text-[10px] text-[#64748b] uppercase">Distance</p>
                    <p className="text-sm font-bold text-[#0f172a]">{routeInfo.distance < 1000 ? `${Math.round(routeInfo.distance)} m` : `${(routeInfo.distance / 1000).toFixed(1)} km`}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#64748b] uppercase">Duration</p>
                    <p className="text-sm font-bold text-[#0f172a]">{routeInfo.duration < 60 ? `${Math.round(routeInfo.duration)} sec` : routeInfo.duration < 3600 ? `${Math.round(routeInfo.duration / 60)} min` : `${(routeInfo.duration / 3600).toFixed(1)} hr`}</p>
                  </div>
                </div>
              </div>
            )}
            <div className="px-5 py-3 border-t border-[#f1f5f9] bg-[#f8fafc] shrink-0 space-y-2">
              <div className="flex gap-2">
                {!originCoords ? (
                  <button onClick={handleUseMyLocation} disabled={useMyLocation} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#eef2ff] text-[#4f46e5] font-medium rounded-lg hover:bg-[#c7d2fe] disabled:opacity-50 transition-all text-xs">
                    {useMyLocation ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
                    <span>{useMyLocation ? "Locating..." : "Use My Location"}</span>
                  </button>
                ) : (
                  <button onClick={handleGetRoute} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#eef2ff] text-[#4f46e5] font-medium rounded-lg hover:bg-[#c7d2fe] transition-all text-xs">
                    <RouteIcon className="w-3.5 h-3.5" />
                    <span>Get Route</span>
                  </button>
                )}
              </div>
              <button onClick={handleGenerateBrief} disabled={briefLoading} className="w-full flex items-center justify-center gap-2 bg-[#4f46e5] text-white font-semibold py-3 rounded-xl hover:bg-[#4338ca] disabled:opacity-50 transition-all text-sm">
                {briefLoading ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Generating...</span> : <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> Generate PWD Repair Brief</span>}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ---- PWD Brief Modal ---- */}
      {showBrief && (
        <div className="modal-overlay" onClick={() => setShowBrief(false)}>
          <div className="modal-content bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-[#f1f5f9] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#eff6ff] flex items-center justify-center">
                  <Shield className="w-5 h-5 text-[#2563eb]" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#0f172a]">PWD Executive Funding Proposal</h2>
                  <p className="text-xs text-[#94a3b8]">AI-Generated • Policy-Compliant</p>
                </div>
              </div>
              <button onClick={() => setShowBrief(false)} className="p-2 rounded-lg hover:bg-[#f1f5f9] transition-colors">
                <X className="w-4 h-4 text-[#94a3b8]" />
              </button>
            </div>
            <div className="px-6 py-6 overflow-y-auto flex-1 prose prose-sm max-w-none">
              {briefLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Loader2 className="w-8 h-8 text-[#4f46e5] animate-spin mb-4" />
                  <p className="text-sm font-medium text-[#64748b]">Generating PWD Executive Funding Proposal...</p>
                  <p className="text-xs text-[#94a3b8] mt-1">Analyzing hotspot data &amp; policy compliance</p>
                </div>
              ) : briefResult?.error ? (
                <div className="bg-[#fef2f2] border border-[#fecaca] rounded-xl p-6 text-center">
                  <AlertTriangle className="w-6 h-6 text-[#ef4444] mx-auto mb-2" />
                  <p className="text-sm font-medium text-[#991b1b]">{briefResult.error}</p>
                </div>
              ) : briefResult?.proposal ? (
                <div className="whitespace-pre-wrap text-sm text-[#334155] leading-relaxed">{briefResult.proposal}</div>
              ) : null}
            </div>
            {briefResult?.proposal && (
              <div className="px-6 py-4 border-t border-[#f1f5f9] flex items-center justify-end gap-3 shrink-0">
                <button onClick={() => setShowBrief(false)} className="px-4 py-2 text-sm font-medium text-[#64748b] hover:text-[#0f172a] transition-colors">Close</button>
                <button className="flex items-center gap-1.5 px-4 py-2 bg-[#4f46e5] text-white text-sm font-medium rounded-lg hover:bg-[#4338ca] transition-colors">
                  <Download className="w-3.5 h-3.5" />
                  Export PDF
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
