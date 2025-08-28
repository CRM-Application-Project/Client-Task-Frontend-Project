import Donut from "./Donut";

interface SalesFunnelCardProps {
  data?: Record<string, number>;
}

const statusColors: Record<string, string> = {
  "NEW LEAD": "#3B82F6", // blue
  CONTACTED: "#F97316", // orange
  QUALIFIED: "#8B5CF6", // purple
  DEMO: "#10B981", // green
  "PROPOSAL SENT": "#F59E0B", // amber
  NEGOTIATION: "#06B6D4", // cyan
  "CLOSED WON": "#22C55E", // green-500
  "CLOSED LOST": "#EF4444", // red
};

export default function SalesFunnelCard({ data }: SalesFunnelCardProps) {
  const segments: [string, number][] = data
    ? Object.entries(data)
        .filter(([_, value]) => value > 0)
        .map(([status, count]) => [statusColors[status] || "#64748B", count])
    : [];

  const total = segments.reduce((sum, [_, count]) => sum + count, 0);

  return (
    <div className="rounded-[24px] bg-white p-5 shadow-[0_8px_30px_rgba(2,6,23,0.06)] ring-1 ring-slate-100">
      <h3 className="text-[18px] font-semibold text-slate-900">Lead Status</h3>
      <div className="mt-4 flex h-[320px] items-center justify-center">
        {total > 0 ? (
          <Donut
            type="gradient"
            size={224}
            cutout={0.66}
            from="indigo-500"
            to="amber-400"
            segments={segments}
          />
        ) : (
          <div className="text-slate-400 text-sm">No data available</div>
        )}
      </div>
    </div>
  );
}
