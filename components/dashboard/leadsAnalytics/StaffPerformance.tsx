import { useState } from "react";
import { LeadPerformer } from "@/app/services/data.service";

interface StaffPerformanceProps {
  topPerformers?: LeadPerformer[];
  avgPerformers?: LeadPerformer[];
  leastPerformers?: LeadPerformer[];
}

export default function StaffPerformance({
  topPerformers = [],
  avgPerformers = [],
  leastPerformers = [],
}: StaffPerformanceProps) {
  const [filter, setFilter] = useState<"Top" | "Avg" | "Low">("Top");

  const getCurrentData = () => {
    switch (filter) {
      case "Top":
        return topPerformers;
      case "Avg":
        return avgPerformers;
      case "Low":
        return leastPerformers;
      default:
        return topPerformers;
    }
  };

  const currentData = getCurrentData();

  return (
    <div className="rounded-[24px] bg-white p-5 shadow-[0_8px_30px_rgba(2,6,23,0.06)] ring-1 ring-slate-100">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="leading-tight">
          <h3 className="text-[18px] font-semibold text-slate-900">Staff by</h3>
          <h3 className="text-[18px] font-semibold text-slate-900">
            Performance
          </h3>
        </div>
        <div className="flex gap-2">
          {(["Top", "Avg", "Low"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={
                (filter === tab
                  ? "bg-slate-800 text-white ring-transparent "
                  : "bg-white text-slate-700 hover:bg-slate-50 ring-slate-200 ") +
                "h-9 rounded-full px-4 text-[13px] font-medium ring-1 transition"
              }
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <ul className="space-y-3">
        {currentData.length > 0 ? (
          currentData.map((staff, index) => (
            <li key={index} className="rounded-2xl bg-slate-50 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-white text-[12px] font-semibold text-slate-600 ring-1 ring-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,.7),0_1px_2px_rgba(16,24,40,.06)]">
                    {index + 1}
                  </div>
                  <div className="leading-tight">
                    <div className="text-[15px] font-medium text-slate-900">
                      {staff.userName}
                    </div>
                    <div className="text-[12px] text-slate-500">
                      {staff.totalLeads} leads
                    </div>
                  </div>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-slate-900 ring-1 ring-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,.7)]">
                  {staff.conversionWonLeadsPercentage}%
                </span>
              </div>
            </li>
          ))
        ) : (
          <li className="text-center text-slate-400 py-4">No data available</li>
        )}
      </ul>
    </div>
  );
}
