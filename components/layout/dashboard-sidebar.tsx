"use client";

import { useEffect, useMemo, useState } from "react";
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
  Settings,
  User,
  KeyRound,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";

interface NavItem {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  moduleName: string;
  children?: { name: string; href: string; moduleName: string }[];
}

const NAVIGATION: NavItem[] = [
  { name: "Leads", icon: Users, href: "/leads", moduleName: "Leads" },
  { name: "Tasks", icon: CheckSquare, href: "/tasks", moduleName: "Task" },
  {
    name: "Employees",
    icon: UserCheck,
    href: "/employees",
    moduleName: "Employees",
    children: [
      {
        name: "Department",
        href: "/employees/department",
        moduleName: "Department",
      },
      { name: "Staff", href: "/employees/staff", moduleName: "user" },
    ],
  },
];

const SETTINGS = [
  { name: "Profile", icon: User, href: "/profile" },
 { 
    name: "Change Password", 
    icon: KeyRound, 
    href: "/profile?tab=change-password" 
  },];

interface UserModuleAccess {
  id: number;
  moduleId: number;
  moduleName: string;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCreate: boolean;
}

interface DashboardSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
}

export function DashboardSidebar({
  isOpen,
  onClose,
  collapsed,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [expanded, setExpanded] = useState<string[]>([]);

  const reduxUser = useSelector((s: RootState) => s.user.currentUser);
  const [modules, setModules] = useState<UserModuleAccess[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("currentUser");
      const parsed = stored ? JSON.parse(stored) : reduxUser;
      const m = parsed?.userModuleAccessList || parsed?.modules || [];
      setModules(Array.isArray(m) ? m : []);
    } catch {
      setModules(reduxUser?.modules || []);
    } finally {
      setReady(true);
    }
  }, [reduxUser]);

  const can = (
    moduleName: string,
    perm: "view" | "edit" | "create" | "delete" = "view"
  ) => {
    if (!ready || modules.length === 0) return false;
    const norm = (s: string) => (s || "").toLowerCase();
    const mod = modules.find((m) => {
      const a = norm(m.moduleName);
      const b = norm(moduleName);
      return a === b || a.includes(b) || b.includes(a);
    });
    if (!mod) return false;
    return perm === "view"
      ? mod.canView
      : perm === "edit"
      ? mod.canEdit
      : perm === "create"
      ? mod.canCreate
      : mod.canDelete;
  };

  const filteredNav = useMemo(
    () =>
      NAVIGATION.filter((item) => {
        const children =
          item.children?.filter((c) => can(c.moduleName, "view")) || [];
        return can(item.moduleName, "view") || children.length > 0;
      }),
    [modules, ready]
  );

  const getChildren = (item: NavItem) =>
    item.children?.filter((c) => can(c.moduleName, "view")) || [];

  useEffect(() => {
    filteredNav.forEach((item) => {
      const children = getChildren(item);
      if (
        children.some((c) => pathname === c.href) &&
        !expanded.includes(item.name)
      ) {
        setExpanded((p) => [...p, item.name]);
      }
    });
    if (
      SETTINGS.some((s) => pathname === s.href) &&
      !expanded.includes("Settings")
    ) {
      setExpanded((p) => [...p, "Settings"]);
    }
  }, [pathname, filteredNav, expanded]);

  const toggleGroup = (key: string) =>
    setExpanded((p) =>
      p.includes(key) ? p.filter((k) => k !== key) : [...p, key]
    );

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
    }).then((r) => {
      if (!r.isConfirmed) return;
      [
        "currentUser",
        "userModules",
        "authToken",
        "refreshToken",
        "tenantToken",
      ].forEach((k) => localStorage.removeItem(k));
      router.push("/");
    });
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-[#3b3b3b] relative">
      {/* Logo */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center justify-between px-6 border-b border-[#4b4b4b] transition-all duration-300",
          collapsed && "px-3 justify-center"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
            <BarChart3 className="h-5 w-5 text-[#3b3b3b]" />
          </div>
          {!collapsed && (
            <h1 className="text-xl font-bold text-white">CRM Pro</h1>
          )}
        </div>
        {!collapsed && (
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden text-white hover:bg-white hover:text-[#3b3b3b]"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ScrollArea className="h-full">
          <div className="space-y-1">
            {ready && filteredNav.length === 0 ? (
              <div className="text-center text-gray-300 py-8">
                <p className="text-sm">No accessible modules found</p>
                <p className="text-xs text-gray-400 mt-1">
                  Contact your administrator
                </p>
              </div>
            ) : (
              filteredNav.map((item) => {
                const children = getChildren(item);
                const isExpanded = expanded.includes(item.name);
                const isActive =
                  pathname === item.href ||
                  children.some((c) => pathname === c.href);

                return children.length ? (
                  <div key={item.name} className="space-y-1">
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        isActive || isExpanded
                          ? "bg-white text-[#3b3b3b] shadow-sm"
                          : "text-white hover:bg-white hover:text-[#3b3b3b]",
                        collapsed && "justify-center px-2"
                      )}
                      onClick={() => {
                        if (can(item.moduleName, "view") && item.href)
                          router.push(item.href);
                        toggleGroup(item.name);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5" />
                        {!collapsed && item.name}
                      </div>
                      {!collapsed && (
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 transition-transform",
                            isExpanded && "rotate-90"
                          )}
                        />
                      )}
                    </Button>

                    {/* Submenu children */}
                    {!collapsed && isExpanded && (
                      <div className="space-y-1 pl-6 pt-1 w-full">
                        {children.map((c) => {
                          const isChildActive = pathname === c.href;
                          return (
                            <Button
                              key={c.href}
                              variant="ghost"
                              onClick={() => router.push(c.href)}
                              className={cn(
                                "relative w-full justify-start rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 group",
                                isChildActive
                                  ? "text-white" // ✅ active but no bg
                                  : "text-gray-300 hover:text-white hover:bg-transparent" // ✅ subtle hover
                              )}
                            >
                              {c.name}

                              {/* underline effect */}
                              <span
                                className={cn(
                                  "absolute left-0 bottom-0 h-[2px] bg-white transition-all duration-300",
                                  isChildActive
                                    ? "w-full"
                                    : "w-0 group-hover:w-full"
                                )}
                              />
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <Button
                    key={item.href}
                    variant="ghost"
                    onClick={() => router.push(item.href)}
                    className={cn(
                      "w-full justify-start rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      collapsed && "justify-center px-2",
                      pathname === item.href
                        ? "bg-white text-[#3b3b3b] shadow-sm"
                        : "text-white hover:bg-white hover:text-[#3b3b3b]"
                    )}
                  >
                    <item.icon
                      className={cn("h-5 w-5", !collapsed && "mr-3")}
                    />
                    {!collapsed && item.name}
                  </Button>
                );
              })
            )}
          </div>

          {/* Settings */}
          <div
            className={cn(
              "mt-8 pt-4 border-t border-[#4b4b4b]",
              collapsed && "mt-4"
            )}
          >
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                expanded.includes("Settings") ||
                  SETTINGS.some((s) => pathname === s.href)
                  ? "bg-white text-[#3b3b3b] shadow-sm"
                  : "text-white hover:bg-white hover:text-[#3b3b3b]",
                collapsed && "justify-center px-2"
              )}
              onClick={() => toggleGroup("Settings")}
            >
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5" />
                {!collapsed && "Settings"}
              </div>
              {!collapsed && (
                <ChevronRight
                  className={cn(
                    "h-4 w-4 transition-transform",
                    expanded.includes("Settings") && "rotate-90"
                  )}
                />
              )}
            </Button>

{!collapsed && expanded.includes("Settings") && (
  <div className="space-y-1 pl-6 pt-1 w-full">
    {SETTINGS.map((it) => {
      const isChildActive = pathname === it.href;
      return (
        <Button
          key={it.href}
          variant="ghost"
          onClick={() => {
            if (it.name === "Change Password") {
              // Navigate to profile with tab parameter
              router.push("/profile?tab=change-password");
            } else {
              router.push(it.href);
            }
          }}
          className={cn(
            "relative w-full justify-start rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 group",
            isChildActive
              ? "text-white"
              : "text-gray-300 hover:text-white hover:bg-transparent"
          )}
        >
          <it.icon className="mr-3 h-4 w-4" />
          {it.name}

          {/* underline effect */}
          <span
            className={cn(
              "absolute left-0 bottom-0 h-[2px] bg-white transition-all duration-300",
              isChildActive ? "w-full" : "w-0 group-hover:w-full"
            )}
          />
        </Button>
      );
    })}
  </div>
)}
          </div>
        </ScrollArea>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-[#4b4b4b]">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={cn(
            "w-full text-white hover:bg-white hover:text-[#3b3b3b] transition-all duration-200",
            collapsed ? "justify-center px-2" : "justify-start"
          )}
        >
          <LogOut className={cn("h-5 w-5", !collapsed && "mr-3")} />
          {!collapsed && "Logout"}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <div
        className={cn(
          "hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col transition-all duration-300",
          collapsed ? "lg:w-16" : "lg:w-64"
        )}
      >
        <SidebarContent />
      </div>

      {/* Mobile */}
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  );
}
