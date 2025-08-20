"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { DashboardSidebar } from "./dashboard-sidebar";
import { DashboardNavbar } from "./DashboardNavbar";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile sheet
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // desktop collapse

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden",
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <DashboardSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
      />

      {/* Main Content Area */}
      <div
        className={cn(
          "min-h-screen transition-all duration-300",
          sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
        )}
      >
        {/* Navbar */}
        <DashboardNavbar
          collapsed={sidebarCollapsed}
          onMenuClick={() => setSidebarOpen(true)}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        />

        {/* Page Content */}
        <main className="py-4 sm:py-4 lg:py-6">
          <div className="px-4 sm:px-4 lg:px-6">{children}</div>
        </main>
      </div>
    </div>
  );
}