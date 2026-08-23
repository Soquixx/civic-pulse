"use client";

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

const badgeClasses: Record<string, string> = {
  red: "badge-red",
  yellow: "badge-yellow",
  green: "badge-green",
};

interface PriorityBadgeProps {
  color: "red" | "yellow" | "green";
  score?: number;
  showLabel?: boolean;
  showDot?: boolean;
  size?: "sm" | "md";
}

export default function PriorityBadge({
  color,
  score,
  showLabel = true,
  showDot = true,
  size = "sm",
}: PriorityBadgeProps) {
  // Build a descriptive aria-label for screen readers
  const ariaParts: string[] = [];
  if (showLabel) ariaParts.push(`Priority: ${colorLabel[color]}`);
  if (score !== undefined) ariaParts.push(`Score: ${score}`);

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={ariaParts.length > 0 ? ariaParts.join(", ") : `Priority level: ${colorLabel[color]}`}
      className={`badge ${badgeClasses[color] || "badge-gray"} ${
        size === "md" ? "text-sm px-3 py-1" : ""
      }`}
    >
      {showDot && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: colorMap[color] }}
          aria-hidden="true"
        />
      )}
      {showLabel && <span>{colorLabel[color]}</span>}
      {score !== undefined && (
        <span className="font-bold ml-0.5">{score}</span>
      )}
    </span>
  );
}
