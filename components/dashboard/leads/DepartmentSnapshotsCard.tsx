"use client";

import { Building2 } from "lucide-react";

type Dept = {
  label: string;
  staff: number;
  leads: number;
  tasks: number;
  delta: string;
};

const rows: Dept[] = [
  { label: "Sales",       staff: 32, leads: 456, tasks: 145, delta: "+12%" },
  { label: "Marketing",   staff: 18, leads: 234, tasks:  89, delta: "+8%"  },
  { label: "Support",     staff: 24, leads: 189, tasks: 134, delta: "+15%" },
  // extra records to test scrolling
  { label: "Product",     staff: 14, leads: 120, tasks:  54, delta: "+6%"  },
  { label: "Engineering", staff: 42, leads:  78, tasks: 210, delta: "+11%" },
  { label: "Success",     staff: 20, leads: 167, tasks: 102, delta: "+4%"  },
  { label: "Finance",     staff: 10, leads:  45, tasks:  33, delta: "+3%"  },
  { label: "Ops",         staff: 16, leads:  98, tasks:  71, delta: "+7%"  },
  { label: "PR",          staff:  8, leads:  36, tasks:  19, delta: "+2%"  },
  { label: "Legal",       staff:  6, leads:  22, tasks:  15, delta: "+1%"  },
  { label: "QA",          staff: 12, leads:  64, tasks:  58, delta: "+5%"  },
  { label: "Design",      staff: 11, leads:  52, tasks:  49, delta: "+9%"  },
];

export default function DepartmentSnapshotsCard() {
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
            {rows.map(r => (
              <li
                key={r.label}
                className="rounded-2xl bg-slate-50 px-4 py-3"
              >
                {/* top row: label left, delta badge right */}
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="text-[15px] font-medium text-slate-900">{r.label}</div>
                  <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-slate-900 ring-1 ring-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,.7)]">
                    {r.delta}
                  </span>
                </div>

                {/* bottom row: three stats evenly spaced and muted */}
                <div className="grid grid-cols-3 gap-3 text-[12px] text-slate-500">
                  <div>
                    <span className="text-slate-400">Staff: </span>
                    <span className="font-medium text-slate-700">{r.staff}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Leads: </span>
                    <span className="font-medium text-slate-700">{r.leads}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Tasks: </span>
                    <span className="font-medium text-slate-700">{r.tasks}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* subtle bottom fade like polished UIs; purely decorative */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-white to-transparent rounded-b-[22px]" />
      </div>
    </div>
  );
}
