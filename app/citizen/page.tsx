"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Mic,
  MicOff,
  Send,
  Globe,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Zap,
  Users,
  Heart,
  Loader2,
  Volume2,
  Languages,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";

interface VoiceResult {
  translated_text?: string;
  location_name?: string;
  hazard_type?: string;
  urgency_score?: number;
  population_impact?: string;
  community_need?: string;
  error?: string;
}

type LanguageCode = "en-US" | "hi-IN" | "ta-IN";

const LANGUAGES: { code: LanguageCode; label: string; flag: string }[] = [
  { code: "en-US", label: "English", flag: "🇬🇧" },
  { code: "hi-IN", label: "हिन्दी", flag: "🇮🇳" },
  { code: "ta-IN", label: "தமிழ்", flag: "🇮🇳" },
];

const urgencyLabels: Record<number, { label: string; color: string }> = {
  1: { label: "Low", color: "badge-green" },
  2: { label: "Moderate", color: "badge-yellow" },
  3: { label: "High", color: "badge-yellow" },
  4: { label: "Critical", color: "badge-red" },
  5: { label: "Emergency", color: "badge-red" },
};

export default function CitizenPage() {
  const [selectedLang, setSelectedLang] = useState<LanguageCode>("en-US");
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [result, setResult] = useState<VoiceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Check browser support
  const [speechSupported, setSpeechSupported] = useState(true);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSpeechSupported(false);
    }
  }, []);

  const startRecording = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = selectedLang;

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += t;
        } else {
          interim += t;
        }
      }
      if (final) setTranscript((prev) => (prev ? prev + " " + final : final));
      setInterimText(interim);
    };

    recognition.onerror = (event: any) => {
      if (event.error !== "aborted") {
        setError(`Speech recognition error: ${event.error}`);
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      setInterimText("");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setError(null);
  }, [selectedLang]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    setInterimText("");
  }, []);

  const handleSubmit = async () => {
    const text = transcript.trim();
    if (!text) {
      setError("Please enter or speak your infrastructure complaint first.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setShowResult(false);

    try {
      const langLabel =
        LANGUAGES.find((l) => l.code === selectedLang)?.label || "English";

      const response = await fetch("/api/analyze-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_text: text,
          language: langLabel,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze your report.");
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);
      setShowResult(true);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTranscript("");
    setInterimText("");
    setResult(null);
    setShowResult(false);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#e2e8f0]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-[#64748b] hover:text-[#0f172a] transition-colors"
              aria-label="Go to CivicPulse home page"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Home
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#06b6d4] flex items-center justify-center">
                <Globe className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-bold text-[#0f172a]">
                CivicPulse
              </span>
            </div>
            <Link
              href="/planner"
              className="text-sm font-medium text-[#4f46e5] hover:text-[#4338ca] transition-colors"
              aria-label="Go to Planner Dashboard"
            >
              Planner
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Page Title */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 bg-[#eef2ff] text-[#4f46e5] text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
            <Volume2 className="w-3 h-3" />
            Citizen Voice Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0f172a] tracking-tight mb-2">
            Speak Your Infrastructure Request
          </h1>
          <p className="text-[#64748b] text-sm sm:text-base max-w-lg mx-auto">
            Report a road hazard, pothole, waterlogging, or any infrastructure
            issue. Our AI will categorize and prioritize your report instantly.
          </p>
        </div>

        {/* Language Selector */}
        <div className="flex items-center justify-center gap-2 mb-8" role="radiogroup" aria-labelledby="language-label">
          <Languages className="w-4 h-4 text-[#94a3b8]" aria-hidden="true" />
          <span className="text-xs font-medium text-[#94a3b8] mr-1" id="language-label">
            Language:
          </span>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setSelectedLang(lang.code)}
              role="radio"
              aria-checked={selectedLang === lang.code}
              aria-label={`Select language: ${lang.label}`}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                selectedLang === lang.code
                  ? "bg-[#4f46e5] text-white shadow-sm"
                  : "bg-white text-[#64748b] border border-[#e2e8f0] hover:border-[#c7d2fe] hover:text-[#4f46e5]"
              }`}
            >
              {lang.flag} {lang.label}
            </button>
          ))}
        </div>

        {/* Mic Button */}
        <div className="flex flex-col items-center mb-8">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!speechSupported}
            aria-label={isRecording ? "Stop voice recording" : "Start voice recording"}
            aria-pressed={isRecording}
            className={`mic-pulse ${isRecording ? "recording" : ""} w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
              isRecording
                ? "bg-[#ef4444] hover:bg-[#dc2626] shadow-red-200"
                : "bg-[#4f46e5] hover:bg-[#4338ca] shadow-indigo-200"
            } ${!speechSupported ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            {isRecording ? (
              <MicOff className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            ) : (
              <Mic className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            )}
          </button>
          <p className="mt-4 text-sm font-medium text-[#64748b]">
            {isRecording
              ? "Listening... Tap to stop"
              : speechSupported
                ? "Tap to start speaking"
                : "Speech recognition not supported in this browser"}
          </p>            {isRecording && (
            <div className="flex items-center gap-1.5 mt-2" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-1 bg-[#ef4444] rounded-full animate-pulse"
                  style={{
                    height: `${12 + Math.random() * 16}px`,
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Text Input Area */}
        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-4 sm:p-6 mb-6">
          <label className="block text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-2">
            Your Report
          </label>
          <textarea
            ref={textareaRef}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            aria-label="Infrastructure complaint report. Type or use the microphone to dictate."
            aria-describedby="report-char-count"
            placeholder={
              isRecording
                ? "Speak now — your words will appear here..."
                : "Type your infrastructure complaint, or use the mic button above..."
            }
            className="w-full min-h-[120px] sm:min-h-[160px] resize-none text-sm sm:text-base text-[#0f172a] placeholder-[#cbd5e1] focus:outline-none focus:ring-0 bg-transparent leading-relaxed"
            rows={5}
          />
          {/* Live interim transcription display (read-only, below textarea) */}
          {isRecording && interimText && (
            <div className="mt-2 px-3 py-2 bg-[#eef2ff] rounded-lg border border-[#c7d2fe]">
              <p className="text-xs text-[#4f46e5] italic">Listening... {interimText}</p>
            </div>
          )}
          <div className="flex items-center justify-between pt-3 border-t border-[#f1f5f9]">
            <span className="text-xs text-[#94a3b8]" id="report-char-count" aria-live="polite">
              {transcript.length} characters
            </span>
            <div className="flex items-center gap-2">
              {(transcript || interimText) && (
                <button
                  onClick={handleReset}
                  aria-label="Clear report text"
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#94a3b8] hover:text-[#64748b] hover:bg-[#f1f5f9] rounded-lg transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-[#fef2f2] border border-[#fecaca] rounded-xl p-4 mb-6 flex items-start gap-3" role="alert">
            <AlertTriangle className="w-5 h-5 text-[#ef4444] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-[#991b1b]">{error}</p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={loading || !transcript.trim()}
          aria-label={loading ? "Analyzing your report" : "Submit infrastructure complaint report"}
          aria-busy={loading}
          className="w-full flex items-center justify-center gap-2 bg-[#4f46e5] text-white font-semibold py-3.5 rounded-xl hover:bg-[#4338ca] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200 text-sm sm:text-base"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Analyzing Your Report...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Submit Request
            </>
          )}
        </button>

        {/* AI Extraction Summary */}
        {showResult && result && !result.error && (
          <div className="mt-8 bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden" role="region" aria-label="AI Analysis Results">
            <div className="bg-gradient-to-r from-[#ecfdf5] to-[#f0fdf4] px-6 py-4 border-b border-[#d1fae5]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#10b981]" />
                <h3 className="text-sm font-bold text-[#065f46] uppercase tracking-wider">
                  AI Extraction Summary
                </h3>
              </div>
            </div>
            <div className="p-6 space-y-5">
              {/* Location */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#eff6ff] flex items-center justify-center shrink-0">
                  <MapPin className="w-[18px] h-[18px] text-[#2563eb]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">
                    Location Identified
                  </p>
                  <p className="text-sm font-medium text-[#0f172a] mt-0.5">
                    {result.location_name || "—"}
                  </p>
                </div>
              </div>

              {/* Hazard Type */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#fef3c7] flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-[18px] h-[18px] text-[#d97706]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">
                    Hazard Type
                  </p>
                  <p className="text-sm font-medium text-[#0f172a] mt-0.5">
                    {result.hazard_type || "—"}
                  </p>
                </div>
              </div>

              {/* Urgency Score */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#fef2f2] flex items-center justify-center shrink-0">
                  <Zap className="w-[18px] h-[18px] text-[#ef4444]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">
                    Urgency Score
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-bold text-[#0f172a]">
                      {result.urgency_score != null
                        ? `${result.urgency_score}/5`
                        : "—"}
                    </span>
                    {result.urgency_score != null &&
                      urgencyLabels[result.urgency_score] && (
                        <span
                          className={`badge ${urgencyLabels[result.urgency_score].color}`}
                        >
                          {urgencyLabels[result.urgency_score].label}
                        </span>
                      )}
                  </div>
                </div>
              </div>

              {/* Population Impact */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#f5f3ff] flex items-center justify-center shrink-0">
                  <Users className="w-[18px] h-[18px] text-[#7c3aed]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">
                    Population Impact
                  </p>
                  <p className="text-sm font-medium text-[#0f172a] mt-0.5">
                    {result.population_impact || "—"}
                  </p>
                </div>
              </div>

              {/* Community Need */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#ecfdf5] flex items-center justify-center shrink-0">
                  <Heart className="w-[18px] h-[18px] text-[#10b981]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">
                    Community Need
                  </p>
                  <p className="text-sm font-medium text-[#0f172a] mt-0.5">
                    {result.community_need || "—"}
                  </p>
                </div>
              </div>

              {/* Translated Text */}
              {result.translated_text && (
                <div className="pt-4 border-t border-[#f1f5f9]">
                  <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-1">
                    AI-Processed Transcript
                  </p>
                  <p className="text-sm text-[#64748b] italic leading-relaxed">
                    &ldquo;{result.translated_text}&rdquo;
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-[#f8fafc] border-t border-[#e2e8f0] flex items-center justify-between">
              <button
                onClick={handleReset}
                aria-label="Submit another infrastructure report"
                className="flex items-center gap-1.5 text-sm font-medium text-[#64748b] hover:text-[#0f172a] transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Submit Another Report
              </button>
              <Link
                href="/planner"
                className="flex items-center gap-1.5 text-sm font-medium text-[#4f46e5] hover:text-[#4338ca] transition-colors"
                aria-label="View report in Planner Dashboard"
              >
                View in Dashboard
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
