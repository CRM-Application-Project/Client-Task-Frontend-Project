"use client";

import { useState } from "react";

type Staff = { id: number; name: string; leads: number; efficiency: number };

const staffData: Staff[] = [
  { id: 1, name: "Sarah Chen", leads: 28, efficiency: 94 },
  { id: 2, name: "Mike Rodriguez", leads: 31, efficiency: 89 },
  { id: 3, name: "Emily Watson", leads: 25, efficiency: 87 },
];

export default function StaffPerformance() {
  const [filter, setFilter] = useState<"Top" | "Avg" | "Low">("Top");

  return (
    <div className="rounded-[24px] bg-white p-5 shadow-[0_8px_30px_rgba(2,6,23,0.06)] ring-1 ring-slate-100">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="leading-tight">
          <h3 className="text-[18px] font-semibold text-slate-900">Top 5 Staff by</h3>
          <h3 className="text-[18px] font-semibold text-slate-900">Efficiency</h3>
        </div>
        <div className="flex gap-2">
          {(["Top", "Avg", "Low"] as const).map(tab => (
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
        {staffData.map(s => (
          <li key={s.id} className="rounded-2xl bg-slate-50 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-white text-[12px] font-semibold text-slate-600 ring-1 ring-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,.7),0_1px_2px_rgba(16,24,40,.06)]">
                  {s.id}
                </div>
                <div className="leading-tight">
                  <div className="text-[15px] font-medium text-slate-900">{s.name}</div>
                  <div className="text-[12px] text-slate-500">{s.leads} leads</div>
                </div>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-slate-900 ring-1 ring-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,.7)]">
                {s.efficiency}%
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
