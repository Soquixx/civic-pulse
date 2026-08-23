"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from "recharts";

// Simplified Hotspot type for chart components (only fields needed for visualization)
interface ChartHotspot {
  hazard_type: string;
  complaint_count: number;
  priority_score: number;
  color: "red" | "yellow" | "green";
  location_name: string;
}

const colorMap: Record<string, string> = {
  red: "#ef4444",
  yellow: "#f59e0b",
  green: "#10b981",
};

interface ChartsProps {
  hotspots: ChartHotspot[];
}

export function HazardTypeChart({ hotspots }: ChartsProps) {
  // Aggregate by hazard type
  const data = hotspots.reduce<Record<string, number>>((acc, h) => {
    const type = h.hazard_type || "Unknown";
    acc[type] = (acc[type] || 0) + (h.complaint_count || 1);
    return acc;
  }, {});

  const chartData = Object.entries(data)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-sm text-[#94a3b8]">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          axisLine={{ stroke: "#e2e8f0" }}
          tickLine={false}
          interval={0}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          axisLine={{ stroke: "#e2e8f0" }}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {chartData.map((_, index) => (
            <Cell key={index} fill={index % 2 === 0 ? "#4f46e5" : "#818cf8"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PriorityDistributionChart({ hotspots }: ChartsProps) {
  const redCount = hotspots.filter((h) => h.color === "red").length;
  const yellowCount = hotspots.filter((h) => h.color === "yellow").length;
  const greenCount = hotspots.filter((h) => h.color === "green").length;

  const chartData = [
    { name: "Critical", count: redCount, color: colorMap.red },
    { name: "Moderate", count: yellowCount, color: colorMap.yellow },
    { name: "Good", count: greenCount, color: colorMap.green },
  ];

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          axisLine={{ stroke: "#e2e8f0" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          axisLine={{ stroke: "#e2e8f0" }}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ComplaintTrendChart({ hotspots }: ChartsProps) {
  // Sort by priority score and show trend
  const sortedData = [...hotspots]
    .sort((a, b) => a.priority_score - b.priority_score)
    .map((h, i) => ({
      index: i + 1,
      complaints: h.complaint_count || 0,
      priority: h.priority_score || 0,
      name: h.location_name,
    }));

  if (sortedData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-sm text-[#94a3b8]">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={sortedData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="index"
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          axisLine={{ stroke: "#e2e8f0" }}
          tickLine={false}
          label={{ value: "Hotspot Index", position: "bottom", fontSize: 10, fill: "#94a3b8" }}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          axisLine={{ stroke: "#e2e8f0" }}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(value?: unknown, name?: unknown) => [String(value ?? 0), name === "complaints" ? "Complaints" : "Priority Score"]}
          labelFormatter={(label) => `Hotspot #${label}`}
        />
        <Line
          type="monotone"
          dataKey="complaints"
          stroke="#4f46e5"
          strokeWidth={2}
          dot={{ fill: "#4f46e5", strokeWidth: 2, r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="priority"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={{ fill: "#f59e0b", strokeWidth: 2, r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
