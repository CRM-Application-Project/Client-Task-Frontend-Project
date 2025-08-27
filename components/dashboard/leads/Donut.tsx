// components/dashboard/leads/Donut.tsx

type ConicSeg = [color: string, percent: number];

// Minimal tailwind-color → hex map so you can still pass "indigo-500" etc.
// If you pass a raw CSS color (e.g. "#6366F1" or "rgb(99 102 241)") it will use that.
const TW: Record<string, string> = {
  "indigo-500": "#6366F1",
  "amber-400": "#F59E0B",
  "blue-500": "#3B82F6",
  "purple-500": "#8B5CF6",
  "green-500": "#22C55E",
  "red-500": "#EF4444",
  "emerald-500": "#10B981",
};

export default function Donut({
  type,
  size = 224,
  cutout = 0.66,
  from = "indigo-500",
  to = "amber-400",
  segments = [],
}: {
  type: "gradient" | "conic";
  size?: number;
  cutout?: number; // 0..1
  from?: string;   // tailwind token or any CSS color
  to?: string;     // tailwind token or any CSS color
  segments?: ConicSeg[];
}) {
  const hole = Math.max(0, Math.min(1, cutout));
  const mask = `radial-gradient(closest-side, transparent ${hole * 100}%, #000 ${hole * 100 + 0.1}%)`;

  const fromColor = TW[from] ?? from;
  const toColor = TW[to] ?? to;

  const base: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "9999px",
    WebkitMask: mask,
    mask,
    boxShadow: "0 10px 25px rgba(2, 6, 23, 0.12)",
  };

  const style: React.CSSProperties =
    type === "gradient"
      ? {
          ...base,
          // 135deg = to-tr
          backgroundImage: `linear-gradient(135deg, ${fromColor}, ${toColor})`,
        }
      : {
          ...base,
          backgroundImage: `conic-gradient(${toConic(segments)})`,
        };

  return <div style={style} />;
}

function toConic(segments: ConicSeg[]) {
  let acc = 0;
  return segments
    .map(([color, pct]) => {
      const start = acc;
      const end = acc + pct;
      acc = end;
      return `${color} ${start}% ${end}%`;
    })
    .join(", ");
}
