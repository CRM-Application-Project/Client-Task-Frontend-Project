import Donut from "./Donut";

interface LeadSourcesCardProps {
  data?: Record<string, number>;
}

export default function LeadSourcesCard({ data }: LeadSourcesCardProps) {
  // Convert lead source data to segments for the chart
  const segments = data
    ? Object.entries(data)
        .filter(([_, value]) => value > 0)
        .map(([source, count], index) => {
          const colors = [
            "#3B82F6", // social - blue
            "#F97316", // paid - orange
            "#8B5CF6", // referrals - purple
            "#10B981", // organic - green
            "#EF4444", // other - red
            "#F59E0B", // amber
            "#06B6D4", // cyan
            "#EC4899", // pink
          ];
          return [colors[index % colors.length], count] as [string, number];
        })
    : [];

  const total = segments.reduce((sum, [_, count]) => sum + count, 0);

  return (
    <div className="rounded-[24px] bg-white p-5 shadow-[0_8px_30px_rgba(2,6,23,0.06)] ring-1 ring-slate-100">
      <h3 className="text-[18px] font-semibold text-slate-900">Lead Sources</h3>
      <div className="mt-4 flex h-[320px] items-center justify-center">
        {total > 0 ? (
          <Donut type="conic" size={224} cutout={0.66} segments={segments} />
        ) : (
          <div className="text-slate-400 text-sm">No data available</div>
        )}
      </div>
    </div>
  );
}
