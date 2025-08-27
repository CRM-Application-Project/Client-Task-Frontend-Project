// components/dashboard/leads/sections/LeadSourcesCard.tsx
import Donut from "./Donut";

export default function LeadSourcesCard() {
  return (
    <div className="rounded-[24px] bg-white p-5 shadow-[0_8px_30px_rgba(2,6,23,0.06)] ring-1 ring-slate-100">
      <h3 className="text-[18px] font-semibold text-slate-900">Lead Sources</h3>
      <div className="mt-4 flex h-[320px] items-center justify-center">
        <Donut
          type="conic"
          size={224}
          cutout={0.66}
          segments={[
            ["#3B82F6", 35], // social
            ["#F97316", 20], // paid
            ["#8B5CF6", 16], // referrals
            ["#10B981", 15], // organic
            ["#EF4444", 14], // other
          ]}
        />
      </div>
    </div>
  );
}
