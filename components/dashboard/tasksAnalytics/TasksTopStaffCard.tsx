import { useState } from "react";
import { TaskPerformer } from "@/app/services/data.service";
import { CheckCircle2, XCircle, ClipboardList, Clock } from "lucide-react";

interface TasksTopStaffCardProps {
  topPerformers?: TaskPerformer[];
  avgPerformers?: TaskPerformer[];
  leastPerformers?: TaskPerformer[];
}

export default function TasksTopStaffCard({
  topPerformers = [],
  avgPerformers = [],
  leastPerformers = [],
}: TasksTopStaffCardProps) {
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

  const getPctColor = (pct: number) => {
    if (pct >= 70) return "bg-green-500";
    if (pct >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="rounded-[24px] bg-white p-6 shadow-[0_8px_30px_rgba(2,6,23,0.06)] ring-1 ring-slate-100 w-full">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-[18px] font-semibold text-slate-900 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-slate-600" />
          Staff by Task Performance
        </h3>
        <div className="flex gap-2">
          {(["Top", "Avg", "Low"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={
                (filter === tab
                  ? "bg-slate-800 text-white "
                  : "bg-white text-slate-700 hover:bg-slate-50 ring-slate-200 ") +
                "h-9 rounded-full px-4 text-[13px] font-medium ring-1 transition"
              }
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Table-like List */}
      <div className="overflow-x-auto">
        {currentData.length > 0 ? (
          <div className="space-y-3">
            {currentData.map((staff, index) => (
              <div
                key={index}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-gray-200 bg-slate-50 p-4 hover:bg-slate-100 transition"
              >
                {/* Left: rank + name */}
                <div className="flex items-center gap-3 sm:w-[25%]">
                  <div className="h-8 w-8 flex items-center justify-center rounded-full bg-white text-slate-600 font-semibold ring-1 ring-slate-200 shadow">
                    {index + 1}
                  </div>
                  <div className="font-medium text-slate-900">
                    {staff.userName}
                  </div>
                </div>

                {/* Middle stats */}
                <div className="grid grid-cols-3 gap-4 text-center sm:w-[40%]">
                  <div>
                    <div className="text-[12px] text-slate-500">Total Tasks</div>
                    <div className="text-slate-900 font-semibold">
                      {staff.totalTasks}
                    </div>
                  </div>
                  <div>
                    <div className="text-[12px] text-slate-500">Completed</div>
                    <div className="flex items-center justify-center gap-1 text-green-600 font-semibold">
                      <CheckCircle2 className="h-4 w-4" />
                      {staff.completedTasks}
                    </div>
                  </div>
                  <div>
                    <div className="text-[12px] text-slate-500">Ongoing</div>
                    <div className="flex items-center justify-center gap-1 text-orange-600 font-semibold">
                      <Clock className="h-4 w-4" />
                      {staff.ongoingTasks}
                    </div>
                  </div>
                </div>

                {/* Right: completion percentage */}
                <div className="sm:w-[30%] w-full">
                  <div className="text-[12px] text-slate-500 mb-1">
                    Completion Rate
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Progress bar */}
                    <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-2 ${getPctColor(staff.completedPercentage)}`}
                        style={{
                          width: `${staff.completedPercentage}%`,
                        }}
                      ></div>
                    </div>

                    {/* Percentage */}
                    <span className="text-[13px] font-medium text-slate-900">
                      {staff.completedPercentage}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400">
            No data available
          </div>
        )}
      </div>
    </div>
  );
}