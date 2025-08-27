// components/dashboard/leads/sections/StaffStatusCard.tsx
export default function StaffStatusCard() {
    const items = [
      { color: "#10B981", name: "Sarah Chen",     sub: "Client presentation prep" },
      { color: "#F59E0B", name: "Mike Rodriguez", sub: "Lead qualification call"  },
      { color: "#22C55E", name: "Emily Watson",   sub: "Marketing campaign review"},
      { color: "#60A5FA", name: "David Kim",      sub: "Development project planning" },
    ];
  
    return (
      <div className="rounded-[24px] bg-white p-5 shadow-[0_8px_30px_rgba(2,6,23,0.06)] ring-1 ring-slate-100">
        <h3 className="text-[18px] font-semibold text-slate-900">Staff Status</h3>
        <ul className="mt-4 space-y-3">
          {items.map(x => (
            <li key={x.name} className="rounded-xl bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: x.color }} />
                <div className="leading-tight">
                  <div className="text-[14px] font-medium text-slate-900">{x.name}</div>
                  <div className="text-[12px] text-slate-500">{x.sub}</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  