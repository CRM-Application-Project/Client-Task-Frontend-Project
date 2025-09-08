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
              // Only show percentage if it's greater than 0
              const showPercentage = dept.completedPercentage > 0;
              
              return (
                <li
                  key={dept.departmentName}
                  className="rounded-2xl bg-slate-50 px-4 py-3"
                >
                  {/* top row: department name */}
                  <div className="mb-1.5">
                    <div className="text-[15px] font-medium text-slate-900">
                      {dept.departmentName}
                    </div>
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

                  {/* Progress bar showing completion percentage - only show if percentage > 0 */}
                  {showPercentage && (
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
                  )}
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