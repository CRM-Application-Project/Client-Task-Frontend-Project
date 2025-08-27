// components/dashboard/leads/KpiCard.tsx
import { Users, Building2, Target, TrendingUp, LucideIcon } from "lucide-react";

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

      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}

/**
 * Self-contained KPI grid. Renders all four cards internally.
 * Usage: <KpiCard />
 */
export default function KpiCard() {
  const items: Kpi[] = [
    { value: "28",   label: "New Leads Today", icon: Users,     color: "text-blue-500 bg-blue-50" },
    { value: "2,847",label: "Total Leads",     icon: Building2,  color: "text-purple-500 bg-purple-50" },
    { value: "706",  label: "Converted Leads", icon: Target,    color: "text-green-600 bg-green-50" },
    { value: "134",  label: "Lost Leads",      icon: TrendingUp,color: "text-red-500 bg-red-50" },
  ];

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
      {items.map((k) => (
        <KpiItem key={k.label} {...k} />
      ))}
    </div>
  );
}
