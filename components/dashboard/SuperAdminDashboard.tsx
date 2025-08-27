"use client";

import { useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import Leads from "./leads/Leads";
import Tasks from "./tasks/Tasks";
import { cn } from "@/lib/utils";

export default function SuperAdminDashboard() {
  const [tab, setTab] = useState<"leads" | "tasks">("leads");

  return (
    <div>
      {/* Header */}
      <header>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-slate-900">
              Admin Dashboard
            </h1>
            <p className="text-[13px] text-slate-500 -mt-0.5">
              Mission Control Center
            </p>
          </div>

          <Link
            href="#"
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 transition"
          >
            <Download className="h-4 w-4" />
            Export Reports
          </Link>
        </div>

        {/* Tabbed menu with sliding pill */}
        <nav className="mt-5">
          <div className="relative mx-auto w-full rounded-full bg-[#f4f4f4] px-1 py-0.5 ring-1 ring-[#E9EEF5] shadow-sm">
            <div className="grid grid-cols-2 relative">
              {/* Sliding pill indicator */}
              <div
                className={cn(
                  "absolute top-0.5 bottom-0.5 w-1/2 rounded-full bg-white shadow-sm transition-transform duration-300 ease-in-out",
                  tab === "leads" ? "translate-x-0" : "translate-x-full"
                )}
              />

              <button
                onClick={() => setTab("leads")}
                className={cn(
                  "relative z-10 w-full rounded-full py-2 text-[13px] font-medium transition-colors",
                  tab === "leads"
                    ? "text-slate-900"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                Leads Dashboard
              </button>

              <button
                onClick={() => setTab("tasks")}
                className={cn(
                  "relative z-10 w-full rounded-full py-2 text-[13px] font-medium transition-colors",
                  tab === "tasks"
                    ? "text-slate-900"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                Tasks Dashboard
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Content */}
      <main className="pb-10 pt-5">
        {tab === "leads" ? <Leads /> : <Tasks />}
      </main>
    </div>
  );
}
