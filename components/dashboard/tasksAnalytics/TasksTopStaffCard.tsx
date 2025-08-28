import { useState } from "react";
import { TaskPerformer } from "@/app/services/data.service";

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

  const currentData = getCurrentData().map((performer, index) => ({
    n: index + 1,
    name: performer.userName,
    tasks: performer.totalTasks,
    pct: performer.completedPercentage,
  }));

  return (
    <div className="rounded-[24px] bg-white p-5 shadow-[0_8px_30px_rgba(2,6,23,0.06)] ring-1 ring-slate-100">
      <div className="mb-3 flex items-start justify-between">
        <div className="leading-tight">
          <h3 className="text-[18px] font-semibold text-slate-900">Staff by</h3>
          <h3 className="text-[18px] font-semibold text-slate-900">
            Performance
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

      <ul className="space-y-3">
        {currentData.length > 0 ? (
          currentData.map((p) => (
            <li key={p.n} className="rounded-2xl bg-slate-50 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-white text-[12px] font-semibold text-slate-600 ring-1 ring-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,.7)]">
                    {p.n}
                  </div>
                  <div className="leading-tight">
                    <div className="text-[15px] font-medium text-slate-900">
                      {p.name}
                    </div>
                    <div className="text-[12px] text-slate-500">
                      {p.tasks} tasks
                    </div>
                  </div>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-slate-900 ring-1 ring-slate-200">
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
