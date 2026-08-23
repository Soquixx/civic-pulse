"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Globe,
  ArrowLeft,
  FileText,
  Loader2,
  Search,
  X as XIcon,
  Download,
  Shield,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import PriorityBadge from "../../components/PriorityBadge";

// ---- Types ----
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

type Filter = "all" | "red" | "yellow" | "green";

const colorMap: Record<string, string> = {
  red: "#ef4444",
  yellow: "#f59e0b",
  green: "#10b981",
};

export default function PetitionsPage() {
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [metadata, setMetadata] = useState<HotspotMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefResult, setBriefResult] = useState<BriefResult | null>(null);
  const [showBrief, setShowBrief] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch hotspots
  const fetchHotspots = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ role: "national_india", color: filter });
      if (stateFilter && stateFilter !== "all") {
        params.set("state", stateFilter);
      }
      const res = await fetch(`/api/get-hotspots?${params}`);
      const data = await res.json();
      const hotspotList: Hotspot[] = Array.isArray(data) ? data : (data.hotspots || []);
      const meta: HotspotMetadata | null = (!Array.isArray(data) && data.metadata) ? data.metadata : null;
      setHotspots(hotspotList);
      if (meta) setMetadata(meta);
    } catch {
      setHotspots([]);
      setMetadata(null);
    }
    setLoading(false);
  }, [filter, stateFilter]);

  useEffect(() => {
    fetchHotspots();
  }, [fetchHotspots]);

  // Filter by search
  const filteredBySearch = hotspots.filter((h) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      h.location_name?.toLowerCase().includes(query) ||
      h.district?.toLowerCase().includes(query) ||
      h.state?.toLowerCase().includes(query) ||
      h.hazard_type?.toLowerCase().includes(query) ||
      h.community_need?.toLowerCase().includes(query)
    );
  });

  // Generate brief
  const handleGenerateBrief = async (hotspot: Hotspot) => {
    setSelectedHotspot(hotspot);
    setBriefLoading(true);
    setBriefResult(null);
    setShowBrief(true);
    try {
      const res = await fetch("/api/generate-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotspot_data: hotspot }),
      });
      const data = await res.json();
      setBriefResult(data);
    } catch (err: unknown) {
      setBriefResult({ error: err instanceof Error ? err.message : "Failed to generate brief." });
    }
    setBriefLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col">
      {/* ---- Top Nav ---- */}
      <nav className="sticky top-0 z-50 bg-white border-b border-[#e2e8f0] shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <Link
              href="/planner"
              className="flex items-center gap-1.5 text-xs font-medium text-[#94a3b8] hover:text-[#4f46e5] transition-colors"
              aria-label="Go back to Planner Dashboard"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              Dashboard
            </Link>
            <div className="h-5 w-px bg-[#e2e8f0]" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#06b6d4] flex items-center justify-center">
                <Globe className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-bold text-[#0f172a]">CivicPulse</span>
            </div>
          </div>

        </div>
      </nav>

      {/* ---- Page Header ---- */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0f172a]">Citizen Petitions</h1>
            <p className="text-sm text-[#94a3b8] mt-1">
              All reported infrastructure hazards nationwide — {hotspots.length} total petitions
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative" role="search" aria-label="Search petitions">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" aria-hidden="true" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search petitions..."
                aria-label="Search petitions by location, district, state, hazard type, or community need"
                className="pl-9 pr-8 py-2 text-xs border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent w-48 sm:w-64"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(""); searchInputRef.current?.focus(); }}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[#f1f5f9] transition-colors"
                >
                  <XIcon className="w-3 h-3 text-[#94a3b8]" />
                </button>
              )}
            </div>
            <span className="text-xs font-semibold text-[#94a3b8] bg-[#f1f5f9] px-2.5 py-1.5 rounded-lg whitespace-nowrap" aria-live="polite">
              {filteredBySearch.length} of {hotspots.length} records
            </span>
          </div>
        </div>
      </div>

      {/* ---- Filter Bar ---- */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3">
          {/* State Filter */}
          {metadata && metadata.states && metadata.states.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider" id="state-filter-label">State:</span>
              <select
                value={stateFilter}
                onChange={(e) => { setStateFilter(e.target.value); setFilter("all"); }}
                aria-labelledby="state-filter-label"
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#e2e8f0] bg-white text-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent cursor-pointer"
              >
                <option value="all">All States ({metadata.totalNationwide} hotspots)</option>
                {metadata.states.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
          )}
          <div className="h-4 w-px bg-[#e2e8f0] hidden sm:block" />
          {/* Priority Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider" id="priority-filter-label">Priority:</span>
            <div role="radiogroup" aria-labelledby="priority-filter-label" className="contents">
              {(["all", "red", "yellow", "green"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  role="radio"
                  aria-checked={filter === f}
                  aria-label={`Filter by ${f === 'all' ? 'all priorities' : f + ' priority'}`}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                    filter === f
                      ? f === "red"
                        ? "bg-[#fef2f2] border-[#fecaca] text-[#b91c1c]"
                        : f === "yellow"
                          ? "bg-[#fffbeb] border-[#fde68a] text-[#92400e]"
                          : f === "green"
                            ? "bg-[#ecfdf5] border-[#a7f3d0] text-[#065f46]"
                            : "bg-[#eff6ff] border-[#bfdbfe] text-[#1e40af]"
                      : "bg-white border-[#e2e8f0] text-[#64748b] hover:border-[#c7d2fe] hover:text-[#4f46e5]"
                  }`}
                >
                  {f === "all" && "All"}
                  {f === "red" && "🔴 Critical (80–100)"}
                  {f === "yellow" && "🟡 Moderate (50–79)"}
                  {f === "green" && "🟢 Good (0–49)"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ---- Petitions Table ---- */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pb-8 flex-1">
        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden" role="region" aria-label="Citizen Petitions">
          {loading ? (
            <div className="p-12 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-[#4f46e5] animate-spin" />
            </div>
          ) : filteredBySearch.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm text-[#94a3b8]">{searchQuery ? "No petitions match your search." : "No petitions match the current filter."}</p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-2 text-xs font-medium text-[#4f46e5] hover:text-[#4338ca] transition-colors"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="civic-table" aria-labelledby="petitions-heading" role="grid">
                <caption className="sr-only">Citizen petitions table showing infrastructure hazards</caption>
                <thead>
                  <tr>
                    <th>Location</th>
                    <th className="hidden sm:table-cell">State</th>
                    <th>District</th>
                    <th>Hazard Type</th>
                    <th>Priority</th>
                    <th>Complaints</th>
                    <th className="hidden md:table-cell">Road Index</th>
                    <th className="hidden lg:table-cell">Community Need</th>
                    <th className="hidden sm:table-cell">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBySearch.map((h) => (
                    <tr
                      key={h.id}
                      className="cursor-pointer hover:bg-[#f8fafc] transition-colors"
                    >
                      <td className="font-medium text-[#0f172a] max-w-[200px] truncate"
                        tabIndex={0}
                        role="row"
                        aria-label={`${h.location_name}, ${h.district}: ${h.hazard_type}, priority score ${h.priority_score}. Click to view details.`}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedHotspot(h); } }}
                      >
                        {h.location_name}
                      </td>
                      <td className="hidden sm:table-cell text-[#64748b]">{h.state || "—"}</td>
                      <td>{h.district}</td>
                      <td>
                        <span className="badge badge-blue">{h.hazard_type}</span>
                      </td>
                      <td>
                        <PriorityBadge color={h.color} score={h.priority_score} showLabel={false} />
                      </td>
                      <td className="text-center font-semibold">{h.complaint_count}</td>
                      <td className="hidden md:table-cell text-center">{h.road_condition_index}%</td>
                      <td className="hidden lg:table-cell max-w-[200px] truncate text-[#64748b]">{h.community_need}</td>
                      <td className="hidden sm:table-cell">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleGenerateBrief(h); }}
                          className="text-xs font-medium text-[#4f46e5] hover:text-[#4338ca] transition-colors flex items-center gap-1"
                          aria-label={`Generate PWD brief for ${h.location_name}`}
                        >
                          <FileText className="w-3 h-3" />
                          Brief
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ---- Mobile Card View (visible only on small screens) ---- */}
      <div className="sm:hidden max-w-[1600px] mx-auto px-4 pb-8">
        <div className="space-y-3">
          {filteredBySearch.map((h) => (
            <div
              key={h.id}
              className="bg-white rounded-xl border border-[#e2e8f0] p-4 cursor-pointer hover:border-[#c7d2fe] transition-colors"
              onClick={() => setSelectedHotspot(h)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedHotspot(h); } }}
              aria-label={`${h.location_name}, ${h.district}: ${h.hazard_type}, priority score ${h.priority_score}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-[#0f172a] truncate">{h.location_name}</h3>
                  <p className="text-xs text-[#94a3b8] mt-0.5">{h.district}{h.state ? `, ${h.state}` : ""}</p>
                </div>
                <PriorityBadge color={h.color} score={h.priority_score} showLabel={false} />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="badge badge-blue">{h.hazard_type}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[#94a3b8]">Complaints:</span>
                  <span className="ml-1 font-semibold text-[#0f172a]">{h.complaint_count}</span>
                </div>
                <div>
                  <span className="text-[#94a3b8]">Road Index:</span>
                  <span className="ml-1 font-semibold text-[#0f172a]">{h.road_condition_index}%</span>
                </div>
              </div>
              <p className="text-xs text-[#64748b] mt-2 truncate">{h.community_need}</p>
              <button
                onClick={(e) => { e.stopPropagation(); handleGenerateBrief(h); }}
                className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-[#4f46e5] bg-[#eef2ff] rounded-lg hover:bg-[#c7d2fe] transition-colors"
                aria-label={`Generate PWD brief for ${h.location_name}`}
              >
                <FileText className="w-3 h-3" />
                Generate PWD Brief
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ---- PWD Brief Modal ---- */}
      {showBrief && (
        <div className="modal-overlay" onClick={() => setShowBrief(false)}>
          <div
            className="modal-content bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
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
              <button
                onClick={() => setShowBrief(false)}
                className="p-2 rounded-lg hover:bg-[#f1f5f9] transition-colors"
              >
                <XIcon className="w-4 h-4 text-[#94a3b8]" />
              </button>
            </div>

            <div className="px-6 py-6 overflow-y-auto flex-1 prose prose-sm max-w-none">
              {briefLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Loader2 className="w-8 h-8 text-[#4f46e5] animate-spin mb-4" />
                  <p className="text-sm font-medium text-[#64748b]">
                    Generating PWD Executive Funding Proposal...
                  </p>
                  <p className="text-xs text-[#94a3b8] mt-1">
                    Analyzing hotspot data & policy compliance
                  </p>
                </div>
              ) : briefResult?.error ? (
                <div className="bg-[#fef2f2] border border-[#fecaca] rounded-xl p-6 text-center">
                  <AlertTriangle className="w-6 h-6 text-[#ef4444] mx-auto mb-2" />
                  <p className="text-sm font-medium text-[#991b1b]">{briefResult.error}</p>
                </div>
              ) : briefResult?.proposal ? (
                <div className="whitespace-pre-wrap text-sm text-[#334155] leading-relaxed">
                  {briefResult.proposal}
                </div>
              ) : null}
            </div>

            {briefResult?.proposal && (
              <div className="px-6 py-4 border-t border-[#f1f5f9] flex items-center justify-end gap-3 shrink-0">
                <button
                  onClick={() => setShowBrief(false)}
                  className="px-4 py-2 text-sm font-medium text-[#64748b] hover:text-[#0f172a] transition-colors"
                >
                  Close
                </button>
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
