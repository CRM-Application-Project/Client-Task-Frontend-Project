// components/dashboard/leadsAnalytics/DepartmentSnapshotsCard.tsx
"use client";

import { Building2 } from "lucide-react";
import { DepartmentAnalytics } from "@/app/services/data.service";

interface DepartmentSnapshotsCardProps {
  data?: DepartmentAnalytics[];
}

export default function DepartmentSnapshotsCard({
  data,
}: DepartmentSnapshotsCardProps) {
  // Calculate delta percentage for each department (mock implementation since API doesn't provide this)
  const calculateDelta = (dept: DepartmentAnalytics): string => {
    // This is a placeholder since the API doesn't provide trend data
    // In a real scenario, you'd compare with previous period data
    const completionRate = dept.completedPercentage;

    if (completionRate >= 90) return "+15%";
    if (completionRate >= 80) return "+12%";
    if (completionRate >= 70) return "+8%";
    if (completionRate >= 60) return "+5%";
    if (completionRate >= 50) return "+2%";
    if (completionRate >= 40) return "-2%";
    if (completionRate >= 30) return "-5%";
    if (completionRate >= 20) return "-8%";
    return "-12%";
  };

  if (!data || data.length === 0) {
    return (
      <div className="rounded-[24px] bg-white p-5 shadow-[0_8px_30px_rgba(2,6,23,0.06)] ring-1 ring-slate-100">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-slate-100 ring-1 ring-slate-200">
            <Building2 className="h-4 w-4 text-slate-700" />
          </div>
          <h3 className="text-[20px] font-semibold leading-none text-slate-900">
            Department Snapshots
          </h3>
        </div>
        <div className="text-center text-slate-500 py-8">
          No department data available
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[24px] bg-white p-5 shadow-[0_8px_30px_rgba(2,6,23,0.06)] ring-1 ring-slate-100">
      {/* Header with icon exactly like the mock */}
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-7 w-7 place-items-center rounded-md bg-slate-100 ring-1 ring-slate-200">
          <Building2 className="h-4 w-4 text-slate-700" />
        </div>
        <h3 className="text-[20px] font-semibold leading-none text-slate-900">
          Department Snapshots
        </h3>
      </div>

      {/* Scrollable list with exact spacing/alignment */}
      <div className="relative">
        <div className="max-h-[360px] overflow-y-auto pr-1">
          <ul className="space-y-3">
            {data.map((dept) => {
              const delta = calculateDelta(dept);
              const isPositive = delta.startsWith("+");

              return (
                <li
                  key={dept.departmentName}
                  className="rounded-2xl bg-slate-50 px-4 py-3"
                >
                  {/* top row: label left, delta badge right */}
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="text-[15px] font-medium text-slate-900">
                      {dept.departmentName}
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold ring-1 shadow-[inset_0_1px_0_rgba(255,255,255,.7)] ${
                        isPositive
                          ? "bg-green-50 text-green-700 ring-green-200"
                          : "bg-rose-50 text-rose-700 ring-rose-200"
                      }`}
                    >
                      {delta}
                    </span>
                  </div>

                  {/* bottom row: department stats */}
                  <div className="grid grid-cols-2 gap-3 text-[12px] text-slate-500">
                    <div>
                      <span className="text-slate-400">Total: </span>
                      <span className="font-medium text-slate-700">
                        {dept.totalTasks}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Completed: </span>
                      <span className="font-medium text-slate-700">
                        {dept.completedTasks}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">In Review: </span>
                      <span className="font-medium text-slate-700">
                        {dept.inReviewTasks}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Ongoing: </span>
                      <span className="font-medium text-slate-700">
                        {dept.ongoingTasks}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar showing completion percentage */}
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Completion</span>
                      <span className="font-medium">
                        {dept.completedPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          dept.completedPercentage >= 80
                            ? "bg-green-500"
                            : dept.completedPercentage >= 60
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        }`}
                        style={{ width: `${dept.completedPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* subtle bottom fade like polished UIs; purely decorative */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-white to-transparent rounded-b-[22px]" />
      </div>
    </div>
  );
}
