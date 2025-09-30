"use client";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { DashboardSidebar } from "./dashboard-sidebar";
import { DashboardNavbar } from "./DashboardNavbar";

export function DashboardLayout({ 
  children, 
  noPadding = false 
}: { 
  children: React.ReactNode;
  noPadding?: boolean;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile sheet
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // Start collapsed by default
  const [sidebarHovered, setSidebarHovered] = useState(false);

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
      <div 
        className="hidden lg:block"
        onMouseEnter={() => {
          setSidebarHovered(true);
          setSidebarCollapsed(false); // Expand on hover
        }}
        onMouseLeave={() => {
          setSidebarHovered(false);
          setSidebarCollapsed(true); // Collapse when mouse leaves
        }}
      >
        <DashboardSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          hovered={sidebarHovered}
        />
      </div>

      {/* Main Content Area */}
      <div
        className={cn(
          "min-h-screen transition-all duration-300 ease-in-out",
          sidebarCollapsed && !sidebarHovered ? "lg:ml-16" : "lg:ml-56"
        )}
      >
        {/* Navbar */}
        <DashboardNavbar onMenuClick={() => setSidebarOpen(true)} />

        {/* Page Content */}
        {noPadding ? (
          <main className="h-[calc(100vh-4rem)]"> {/* Adjust based on your navbar height */}
            {children}
          </main>
        ) : (
          <main className="py-4 sm:py-4 lg:py-6">
            <div className="px-4 sm:px-4 lg:px-6">{children}</div>
          </main>
        )}
      </div>
    </div>
  );
}