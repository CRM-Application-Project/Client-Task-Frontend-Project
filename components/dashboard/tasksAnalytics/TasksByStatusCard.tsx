"use client";

import { useMemo } from "react";

interface TasksByStatusCardProps {
  data?: Record<string, number>;
}

type Row = { label: string; value: number; color: string };

const statusColors: Record<string, string> = {
  "TO DO": "#60A5FA", // blue-400
  "IN PROGRESS": "#F59E0B", // amber-500
  "IN REVIEW": "#8B5CF6", // violet-500
  DONE: "#10B981", // emerald-500
  NEW: "#94A3B8", // slate-400
  BACKLOG: "#64748B", // slate-500
};

export default function TasksByStatusCard({ data }: TasksByStatusCardProps) {
  const rows: Row[] = data
    ? Object.entries(data)
        .filter(([_, value]) => value > 0)
        .map(([status, value]) => ({
          label: status,
          value,
          color: statusColors[status] || "#94A3B8",
        }))
    : [];

  const total = useMemo(() => rows.reduce((s, r) => s + r.value, 0), [rows]);

  return (
    <div className="rounded-3xl bg-white p-5 shadow-[0_8px_30px_rgba(2,6,23,0.06)] ring-1 ring-slate-200/60">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[18px] font-semibold text-slate-900">
          Tasks by Status
        </h3>
        <div className="text-[12px] text-slate-500">
          {total.toLocaleString()} total
        </div>
      </div>

      {/* Rows */}
      <div className="space-y-4">
        {rows.length > 0 ? (
          rows.map((r) => {
            const pct = total > 0 ? (r.value / total) * 100 : 0;
            const gradient = `linear-gradient(90deg, ${r.color}CC 0%, ${r.color}99 60%, ${r.color}80 100%)`;
            return (
              <div key={r.label} className="group">
                <div className="mb-1 flex items-center justify-between">
                  <div className="text-[13px] font-medium text-slate-700">
                    {r.label}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
                      {pct.toFixed(0)}%
                    </span>
                    <span className="tabular-nums text-[12px] text-slate-500">
                      {r.value.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* track */}
                <div
                  className="relative h-4 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/70"
                  aria-label={`${r.label} ${r.value} tasks, ${pct.toFixed(
                    0
                  )} percent`}
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(pct)}
                >
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,.6) 0%, rgba(255,255,255,.0) 60%)",
                    }}
                  />
                  <div
                    className="h-full rounded-full transition-[width] duration-500 ease-out will-change-[width]"
                    style={{
                      width: `${pct}%`,
                      background: gradient,
                      boxShadow:
                        "0 4px 12px rgba(2,6,23,0.08), inset 0 1px 0 rgba(255,255,255,.5)",
                    }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center text-slate-400 py-8">
            No data available
          </div>
        )}
      </div>

      {/* Mini stacked overview footer */}
      {rows.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 text-[12px] text-slate-500">Distribution</div>
          <div className="flex h-2 overflow-hidden rounded-full ring-1 ring-slate-200/70">
            {rows.map((r) => {
              const pct = total > 0 ? (r.value / total) * 100 : 0;
              return (
                <div
                  key={r.label}
                  className="h-full"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: r.color,
                    opacity: 0.7,
                  }}
                  title={`${r.label}: ${pct.toFixed(0)}%`}
                />
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
            {rows.map((r) => (
              <span key={r.label} className="inline-flex items-center gap-1">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full ring-2 ring-white"
                  style={{ backgroundColor: r.color, opacity: 0.85 }}
                />
                {r.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
