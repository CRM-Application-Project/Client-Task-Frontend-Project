import {
  Users,
  Building2,
  Target,
  TrendingUp,
  Percent,
  LucideIcon,
} from "lucide-react";
import { LeadAnalytics } from "@/app/services/data.service";

interface KpiCardProps {
  data?: LeadAnalytics;
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

export default function KpiCard({ data }: KpiCardProps) {
  const items: Kpi[] = [
    {
      value: data?.toDaysNewLeads?.toString() || "0",
      label: "New Leads Today",
      icon: Users,
      color: "text-blue-500 bg-blue-50",
    },
    {
      value: data?.totalLeads?.toString() || "0",
      label: "Total Leads",
      icon: Building2,
      color: "text-purple-500 bg-purple-50",
    },
    {
      value: data?.convertedLeads?.toString() || "0",
      label: "Converted Leads",
      icon: Target,
      color: "text-green-600 bg-green-50",
    },
    {
      value: `${data?.convertedLeadPercentage?.toFixed(1) || "0"}%`,
      label: "Conversion Rate",
      icon: Percent,
      color: "text-indigo-500 bg-indigo-50",
    },
    {
      value: data?.convertedLostLeads?.toString() || "0",
      label: "Lost Leads",
      icon: TrendingUp,
      color: "text-red-500 bg-red-50",
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
