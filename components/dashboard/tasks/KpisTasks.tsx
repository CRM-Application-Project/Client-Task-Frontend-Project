// components/dashboard/tasks/KpisTasks.tsx
import {
  CheckSquare,
  AlertTriangle,
  Target,
  Clock4,
  LucideIcon,
} from "lucide-react";

type Kpi = {
  value: string;
  label: string;
  icon: LucideIcon;
  color: string; // e.g. "text-blue-500 bg-blue-50"
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

export default function KpisTasks() {
  const items: Kpi[] = [
    {
      value: "342",
      label: "Open Tasks",
      icon: CheckSquare,
      color: "text-blue-600 bg-blue-50",
    },
    {
      value: "23",
      label: "Overdue",
      icon: AlertTriangle,
      color: "text-rose-600 bg-rose-50",
    },
    {
      value: "67",
      label: "Completed Today",
      icon: Target,
      color: "text-green-600 bg-green-50",
    },
    {
      value: "4.2d",
      label: "Avg Completion",
      icon: Clock4,
      color: "text-purple-600 bg-purple-50",
    },
  ];

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
      {items.map((k) => (
        <KpiItem key={k.label} {...k} />
      ))}
    </div>
  );
}
