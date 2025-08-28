import {
  CheckSquare,
  AlertTriangle,
  Target,
  Clock4,
  Loader2,
  LucideIcon,
} from "lucide-react";
import { TaskAnalytics } from "@/app/services/data.service";

interface KpisTasksProps {
  data?: TaskAnalytics;
}

type Kpi = {
  value: string;
  label: string;
  icon: LucideIcon;
  color: string;
};

function KpiItem({ value, label, icon: Icon, color }: Kpi) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-[0_2px_8px_rgba(16,24,40,.06)] ring-1 ring-slate-200/60">
      <div>
        <div className="text-[22px] font-semibold leading-none text-slate-900">
          {value}
        </div>
        <div className="mt-1 text-[13px] text-slate-500">{label}</div>
      </div>

      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}
      >
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}

export default function KpisTasks({ data }: KpisTasksProps) {
  const items: Kpi[] = [
    {
      value: (data?.totalTasks || 0).toString(),
      label: "Total Tasks",
      icon: CheckSquare,
      color: "text-blue-600 bg-blue-50",
    },
    {
      value: (data?.ongoingTasks || 0).toString(),
      label: "Ongoing",
      icon: Loader2,
      color: "text-cyan-600 bg-cyan-50",
    },
    {
      value: (data?.inReviewTasks || 0).toString(),
      label: "In Review",
      icon: AlertTriangle,
      color: "text-amber-600 bg-amber-50",
    },
    {
      value: (data?.completedTasks || 0).toString(),
      label: "Completed",
      icon: Target,
      color: "text-green-600 bg-green-50",
    },
    {
      value: `${data?.completedTasksPercentage?.toFixed(1) || 0}%`,
      label: "Completion Rate",
      icon: Clock4,
      color: "text-purple-600 bg-purple-50",
    },
  ];

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">
      {items.map((k) => (
        <KpiItem key={k.label} {...k} />
      ))}
    </div>
  );
}
