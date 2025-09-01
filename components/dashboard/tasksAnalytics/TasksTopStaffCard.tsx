import { useState } from "react";
import { TaskPerformer } from "@/app/services/data.service";
import { CheckCircle2, XCircle, ClipboardList } from "lucide-react";

interface TasksTopStaffCardProps {
  topPerformers?: TaskPerformer[];
  avgPerformers?: TaskPerformer[];
  leastPerformers?: TaskPerformer[];
}

type Row = { n: number; name: string; tasks: number; pct: number };

export default function TasksTopStaffCard({
  topPerformers = [],
  avgPerformers = [],
  leastPerformers = [],
}: TasksTopStaffCardProps) {
  const [filter, setFilter] = useState<"Top" | "Avg" | "Low">("Top");

  const getCurrentData = () => {
    switch (filter) {
      case "Top":
        return topPerformers.slice(0, 5);
      case "Avg":
        return avgPerformers.slice(0, 5);
      case "Low":
        return leastPerformers.slice(0, 5);
      default:
        return topPerformers.slice(0, 5);
    }
  };

  const currentData: Row[] = getCurrentData().map((performer, index) => ({
    n: index + 1,
    name: performer.userName,
    tasks: performer.totalTasks,
    pct: performer.completedPercentage,
  }));

  const getPctColor = (pct: number) => {
    if (pct >= 70) return "text-green-600 bg-green-50 ring-green-200";
    if (pct >= 40) return "text-yellow-600 bg-yellow-50 ring-yellow-200";
    return "text-red-600 bg-red-50 ring-red-200";
  };

  return (
    <div className="rounded-[24px] bg-white p-5 shadow-[0_8px_30px_rgba(2,6,23,0.06)] ring-1 ring-slate-100">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="leading-tight">
          <h3 className="text-[18px] font-semibold text-slate-900 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-slate-600" />
            Staff by Task Performance
          </h3>
        </div>
        <div className="flex gap-2">
          <Pill active={filter === "Top"} onClick={() => setFilter("Top")}>
            Top
          </Pill>
          <Pill active={filter === "Avg"} onClick={() => setFilter("Avg")}>
            Avg
          </Pill>
          <Pill active={filter === "Low"} onClick={() => setFilter("Low")}>
            Low
          </Pill>
        </div>
      </div>

      {/* List */}
      <ul className="space-y-3">
        {currentData.length > 0 ? (
          currentData.map((p) => (
            <li
              key={p.n}
              className="rounded-2xl bg-slate-50 px-4 py-3 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between">
                {/* Left */}
                <div className="flex items-center gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-white text-[12px] font-semibold text-slate-600 ring-1 ring-slate-200 shadow-sm">
                    {p.n}
                  </div>
                  <div className="leading-tight">
                    <div className="text-[15px] font-medium text-slate-900">
                      {p.name}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[12px]">
                      <span className="flex items-center gap-1 text-slate-500">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        {p.tasks} tasks
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right */}
                <span
                  className={`rounded-full px-3 py-1 text-[12px] font-semibold ring-1 ${getPctColor(
                    p.pct
                  )}`}
                >
                  {p.pct}%
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

function Pill({
  children,
  active = false,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        (active
          ? "bg-slate-800 text-white "
          : "bg-white text-slate-700 hover:bg-slate-50 ring-slate-200 ") +
        "h-9 rounded-full px-4 text-[13px] font-medium ring-1 transition"
      }
    >
      {children}
    </button>
  );
}
