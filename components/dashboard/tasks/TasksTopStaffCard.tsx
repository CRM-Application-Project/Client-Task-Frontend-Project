// components/dashboard/tasks/TasksTopStaffCard.tsx
type Row = { n: number; name: string; tasks: number; pct: number };

export default function TasksTopStaffCard() {
  const people: Row[] = [
    { n: 1, name: "Sarah Chen",    tasks: 28, pct: 94 },
    { n: 2, name: "Mike Rodriguez",tasks: 31, pct: 89 },
    { n: 3, name: "Emily Watson",  tasks: 25, pct: 87 },
    { n: 4, name: "David Kim",     tasks: 19, pct: 82 },
    { n: 5, name: "Lisa Johnson",  tasks: 22, pct: 78 },
  ];

  return (
    <div className="rounded-[24px] bg-white p-5 shadow-[0_8px_30px_rgba(2,6,23,0.06)] ring-1 ring-slate-100">
      <div className="mb-3 flex items-start justify-between">
        <div className="leading-tight">
          <h3 className="text-[18px] font-semibold text-slate-900">Top 5 Staff by</h3>
          <h3 className="text-[18px] font-semibold text-slate-900">Efficiency</h3>
        </div>
        <div className="flex gap-2">
          <Pill active>Top</Pill>
          <Pill>Avg</Pill>
          <Pill>Low</Pill>
        </div>
      </div>

      <ul className="space-y-3">
        {people.map(p => (
          <li key={p.n} className="rounded-2xl bg-slate-50 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-white text-[12px] font-semibold text-slate-600 ring-1 ring-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,.7)]">
                  {p.n}
                </div>
                <div className="leading-tight">
                  <div className="text-[15px] font-medium text-slate-900">{p.name}</div>
                  <div className="text-[12px] text-slate-500">{p.tasks} tasks</div>
                </div>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-slate-900 ring-1 ring-slate-200">
                {p.pct}%
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Pill({ children, active = false }: { children: React.ReactNode; active?: boolean }) {
  return (
    <button
      className={
        (active ? "bg-slate-800 text-white " : "bg-white text-slate-700 hover:bg-slate-50 ring-slate-200 ") +
        "h-9 rounded-full px-4 text-[13px] font-medium ring-1 transition"
      }
    >
      {children}
    </button>
  );
}
