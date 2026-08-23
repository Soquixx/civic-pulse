"use client";

import { useState } from "react";
import {
  Mic,
  MapPin,
  BarChart3,
  Shield,
  ArrowRight,
  Building2,
  Users,
  Zap,
  Globe,
  FileText,
} from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: Mic,
    title: "Voice-First Reporting",
    description:
      "Report infrastructure hazards using your voice in English, Hindi, or Tamil. Our AI transcribes, translates, and categorizes your complaint instantly.",
    color: "#4f46e5",
  },
  {
    icon: MapPin,
    title: "GIS-Powered Hotspot Mapping",
    description:
      "Real-time priority mapping of infrastructure hazard zones using citizen reports, population density, and road condition indices.",
    color: "#06b6d4",
  },
  {
    icon: BarChart3,
    title: "Data-Driven Priority Scoring",
    description:
      "Proprietary algorithm weighs complaint density, urgency, population impact, and road condition to surface the most critical hotspots.",
    color: "#10b981",
  },
  {
    icon: Shield,
    title: "Policy-Compliant Proposals",
    description:
      "Auto-generated PWD Executive Funding Proposals aligned with PMGSY and MoRTH guidelines, ready for treasury review.",
    color: "#f59e0b",
  },
];

const stats = [
  { label: "Voice Reports", value: "AI-Powered", icon: Users },
  { label: "Hotspots Mapped", value: "Real-Time", icon: MapPin },
  { label: "Funding Proposals", value: "Auto-Generated", icon: FileText },
  { label: "Response Time", value: "Instant", icon: Zap },
];

export default function HomePage() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#e2e8f0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4f46e5] to-[#06b6d4] flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-[#0f172a] tracking-tight">
                CivicPulse
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/citizen"
                className="px-4 py-2 text-sm font-medium text-[#4f46e5] hover:bg-[#eef2ff] rounded-lg transition-colors"
              >
                Citizen Portal
              </Link>
              <Link
                href="/planner"
                className="px-4 py-2 text-sm font-medium bg-[#4f46e5] text-white rounded-lg hover:bg-[#4338ca] transition-colors"
              >
                Planner Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#4f46e5] via-[#3730a3] to-[#1e293b]" />
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 25px 25px, white 2%, transparent 0%), radial-gradient(circle at 75px 75px, white 2%, transparent 0%)",
              backgroundSize: "100px 100px",
            }}
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white/90 text-sm font-medium px-4 py-1.5 rounded-full mb-6 border border-white/20">
              <Zap className="w-3.5 h-3.5" />
              AI-Powered Civic Intelligence Platform
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight mb-6">
              Infrastructure Hazards
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#a5b4fc] to-[#67e8f9]">
                Detected & Resolved
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-white/75 max-w-2xl mb-10 leading-relaxed">
              Empowering citizens to report infrastructure issues through voice,
              and giving government planners the AI-driven intelligence to
              prioritize, fund, and resolve hazards faster.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/citizen"
                className="inline-flex items-center justify-center gap-2 bg-white text-[#4f46e5] font-semibold px-8 py-3.5 rounded-xl hover:bg-[#f8fafc] transition-all shadow-lg shadow-black/10 text-base"
              >
                <Mic className="w-5 h-5" />
                Report an Issue
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/planner"
                className="inline-flex items-center justify-center gap-2 bg-white/10 text-white border border-white/25 font-semibold px-8 py-3.5 rounded-xl hover:bg-white/20 transition-all text-base"
              >
                <BarChart3 className="w-5 h-5" />
                Open Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="relative -mt-8 z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl shadow-black/5 border border-[#e2e8f0] grid grid-cols-2 md:grid-cols-4 divide-x divide-[#f1f5f9]">
          {stats.map((stat, i) => (
            <div key={i} className="p-6 text-center">
              <stat.icon className="w-5 h-5 text-[#4f46e5] mx-auto mb-2" />
              <div className="text-2xl font-bold text-[#0f172a]">
                {stat.value}
              </div>
              <div className="text-xs font-medium text-[#94a3b8] mt-1 uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0f172a] tracking-tight mb-4">
            How CivicPulse Works
          </h2>
          <p className="text-lg text-[#64748b] max-w-2xl mx-auto">
            From voice complaints to funded repair proposals — a complete
            pipeline powered by AI
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, i) => (
            <div
              key={i}
              className="relative bg-white rounded-2xl border border-[#e2e8f0] p-8 card-hover cursor-default"
              onMouseEnter={() => setHoveredFeature(i)}
              onMouseLeave={() => setHoveredFeature(null)}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform duration-200"
                style={{
                  background: `${feature.color}10`,
                  transform:
                    hoveredFeature === i ? "scale(1.1)" : "scale(1)",
                }}
              >
                <feature.icon
                  className="w-6 h-6"
                  style={{ color: feature.color }}
                />
              </div>
              <h3 className="text-lg font-semibold text-[#0f172a] mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-[#64748b] leading-relaxed">
                {feature.description}
              </p>
              <div
                className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl transition-all duration-300"
                style={{
                  background: feature.color,
                  opacity: hoveredFeature === i ? 1 : 0,
                }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="bg-gradient-to-br from-[#4f46e5] to-[#3730a3] rounded-3xl p-12 sm:p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20px 20px, white 1%, transparent 0%)",
                backgroundSize: "40px 40px",
              }}
            />
          </div>
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to Make Your Voice Heard?
            </h2>
            <p className="text-white/70 text-lg max-w-xl mx-auto mb-8">
              Whether you&apos;re a citizen reporting a pothole or a planner
              allocating infrastructure budgets — CivicPulse has you covered.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/citizen"
                className="inline-flex items-center justify-center gap-2 bg-white text-[#4f46e5] font-semibold px-8 py-3.5 rounded-xl hover:bg-[#f8fafc] transition-all shadow-lg text-base"
              >
                <Mic className="w-5 h-5" />
                Start Reporting
              </Link>
              <Link
                href="/planner"
                className="inline-flex items-center justify-center gap-2 bg-white/10 text-white border border-white/25 font-semibold px-8 py-3.5 rounded-xl hover:bg-white/20 transition-all text-base"
              >
                <Building2 className="w-5 h-5" />
                View Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e2e8f0] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#06b6d4] flex items-center justify-center">
                <Globe className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold text-[#0f172a]">
                CivicPulse
              </span>
            </div>
            <p className="text-xs text-[#94a3b8]">
              AI-Powered Civic Infrastructure Intelligence Platform • Built for
              Smart Governance
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
