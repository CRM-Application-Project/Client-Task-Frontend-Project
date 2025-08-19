"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  CheckSquare,
  UserCheck,
  ChevronRight,
  X,
  BarChart3,
  LogOut,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Swal from "sweetalert2";

interface NavItem {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  children?: {
    name: string;
    href: string;
  }[];
}

const navigation: NavItem[] = [
  {
    name: "Leads",
    icon: Users,
    href: "/leads",
  },
  {
    name: "Tasks",
    icon: CheckSquare,
    href: "/tasks",
  },
  {
    name: "Employees",
    icon: UserCheck,
    href: "/employees",
    children: [
      // { name: "HR", href: "/employees/hr" },
      { name: "Department", href: "/employees/department" },
      { name: "Staff", href: "/employees/staff" },
    ],
  },
];

interface DashboardSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DashboardSidebar({ isOpen, onClose }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(
      (prev) =>
        prev.includes(itemName)
          ? prev.filter((name) => name !== itemName) // close
          : [...prev, itemName] // open
    );
  };

  useEffect(() => {
    navigation.forEach((item) => {
      if (item.children?.some((child) => pathname === child.href)) {
        // auto-open if on a child route
        if (!expandedItems.includes(item.name)) {
          setExpandedItems((prev) => [...prev, item.name]);
        }
      }
    });
  }, [pathname]);

  const handleLogout = () => {
    Swal.fire({
      title: "Are you sure?",
      text: "You will be logged out from the system",
      icon: "warning",
      width: "400px",
      showCancelButton: true,
      confirmButtonColor: "#3b3b3b",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, logout!",
      background: "#fff",
      customClass: {
        container: "bg-opacity-80",
        popup: "rounded-lg shadow-xl",
        title: "text-gray-800",
        confirmButton:
          "bg-[#3b3b3b] hover:bg-[#2b2b2b] text-white px-4 py-2 rounded-md",
        cancelButton:
          "bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md",
      },
    }).then((result) => {
      if (result.isConfirmed) {
        router.push("/");
      }
    });
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-[#3b3b3b]">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-[#4b4b4b]">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
            <BarChart3 className="h-5 w-5 text-[#3b3b3b]" />
          </div>
          <h1 className="text-xl font-bold text-white">CRM Pro</h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden text-white hover:bg-white hover:text-[#3b3b3b]"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ScrollArea className="h-full">
          <div className="space-y-1">
            {navigation.map((item) => {
              const hasChildren = item.children && item.children.length > 0;
              const isChildActive = item.children?.some(
                (child) => pathname === child.href
              );
              const isExpanded = expandedItems.includes(item.name);

              if (hasChildren) {
                return (
                  <div key={item.name} className="space-y-1">
                    {/* Parent */}
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        isChildActive || isExpanded
                          ? "bg-white text-[#3b3b3b] shadow-sm"
                          : "text-white hover:bg-white hover:text-[#3b3b3b]"
                      )}
                      onClick={() => toggleExpanded(item.name)}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5" />
                        {item.name}
                      </div>
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          isExpanded && "rotate-45"
                        )}
                      />
                    </Button>

                    {/* Children */}
                    {isExpanded && (
                      <div className="space-y-1 pl-6 pt-1 w-full justify-start rounded-lg px-3 py-2 text-sm transition-all duration-200">
                        {item.children?.map((child) => {
                          const isChildActive = pathname === child.href;
                          return (
                            <Button
                              key={child.href}
                              variant="ghost"
                              className={cn(
                                "w-full justify-start rounded-lg px-3 py-2 text-sm transition-all duration-200",
                                isChildActive
                                  ? "bg-white text-[#3b3b3b] shadow-sm"
                                  : "text-gray-300 hover:bg-white hover:text-[#3b3b3b]"
                              )}
                              onClick={(e) => {
                                e.stopPropagation(); // ✅ don’t close parent
                                router.push(child.href);
                              }}
                            >
                              {child.name}
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // Normal nav items
              return (
                <Button
                  key={item.href}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    pathname === item.href
                      ? "bg-white text-[#3b3b3b] shadow-sm"
                      : "text-white hover:bg-white hover:text-[#3b3b3b]"
                  )}
                  onClick={() => router.push(item.href)}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-[#4b4b4b]">
        <Button
          variant="ghost"
          className="w-full justify-start text-white hover:bg-white hover:text-[#3b3b3b]"
          onClick={handleLogout}
        >
          <LogOut className="mr-3 h-5 w-5" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  );
}
