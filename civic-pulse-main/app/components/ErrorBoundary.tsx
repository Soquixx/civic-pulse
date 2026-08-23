"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center p-8 text-center bg-[#f8fafc] rounded-2xl border border-[#e2e8f0]">
            <AlertTriangle className="w-8 h-8 text-[#f59e0b] mb-3" />
            <h3 className="text-sm font-semibold text-[#64748b] mb-1">
              Unable to load component
            </h3>
            <p className="text-xs text-[#94a3b8] max-w-xs">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-3 px-3 py-1.5 text-xs font-medium text-[#4f46e5] bg-[#eef2ff] rounded-lg hover:bg-[#e0e7ff] transition-colors"
            >
              Try Again
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
