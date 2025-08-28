"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  CheckSquare,
  UserCheck,
  ChevronRight,
  LogOut,
  Settings,
  User,
  KeyRound,
  BarChart3,
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
  { name: "Dashboard", icon: BarChart3, href: "/dashboard", moduleName: "Dashboard" },
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
    href: "/changepasswordtab",
  },
];

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
  hovered?: boolean;
}

export function DashboardSidebar({
  isOpen,
  onClose,
  collapsed,
  hovered = false,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [expanded, setExpanded] = useState<string[]>([]); // which groups are open (visual)
  const [manuallyCollapsed, setManuallyCollapsed] = useState<Set<string>>(
    new Set()
  ); // groups user explicitly closed (wins over auto-open)
  const ALWAYS_VISIBLE = new Set<string>(["Dashboard"]);
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

  const can = useCallback(
    (
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
    },
    [modules, ready]
  );

  const filteredNav = useMemo(
    () =>
      NAVIGATION.filter((item) => {
        if (ALWAYS_VISIBLE.has(item.moduleName)) return true;
        const children =
          item.children?.filter((c) => can(c.moduleName, "view")) || [];
        return can(item.moduleName, "view") || children.length > 0;
      }),
    [modules, ready, can]
  );

  const getChildren = useCallback(
    (item: NavItem) =>
      item.children?.filter((c) => can(c.moduleName, "view")) || [],
    [can]
  );

  // AUTO-EXPAND ON ROUTE — but respect manual collapse
  const cleanPath = pathname.split("?")[0].split("#")[0];

useEffect(() => {
  setExpanded((prev) => {
    let next = [...prev];

    const openIfNeeded = (key: string) => {
      if (!next.includes(key)) next.push(key);
    };

    filteredNav.forEach((item) => {
      const children = getChildren(item);
      const hasActiveChild = children.some(
        (c) => cleanPath === c.href || cleanPath.startsWith(c.href + "/")
      );

      // expand parent if path matches parent or child
      if ((cleanPath === item.href || cleanPath.startsWith(item.href + "/") || hasActiveChild) &&
          !manuallyCollapsed.has(item.name)) {
        openIfNeeded(item.name);
      }
    });

    // Settings group
    const isSettingsActive = SETTINGS.some(
      (s) => cleanPath === s.href || cleanPath.startsWith(s.href + "/")
    );
    if (isSettingsActive && !manuallyCollapsed.has("Settings")) {
      openIfNeeded("Settings");
    }

    return Array.from(new Set(next));
  });
}, [pathname, filteredNav, getChildren, manuallyCollapsed]);


  // If you navigate away from a group's children, we **do not** force close it.
  // (This prevents flicker and lets users keep groups open if they want.)
  // Manual collapse always wins.

  const isActivePath = (path: string, currentPath: string) => {
  if (path === "/") return currentPath === "/";
  return currentPath === path || currentPath.startsWith(path + "/");
};

  const toggleGroup = useCallback((key: string) => {
    setExpanded((prev) => {
      const isOpen = prev.includes(key);
      const next = isOpen ? prev.filter((k) => k !== key) : [...prev, key];
      setManuallyCollapsed((mc) => {
        const s = new Set(mc);
        if (isOpen) s.add(key); // user explicitly closed
        else s.delete(key); // user explicitly opened
        return s;
      });
      return next;
    });
  }, []);

  const handleLogout = useCallback(() => {
    Swal.fire({
      title: "Are you sure?",
      text: "You will be logged out from the system",
      icon: "warning",
      width: "400px",
      showCancelButton: true,
      confirmButtonColor: "var(--brand-primary)",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, logout!",
      background: "#fff",
      customClass: {
        container: "bg-opacity-80",
        popup: "rounded-lg shadow-xl",
        title: "text-gray-800",
        confirmButton:
          "bg-brand-primary hover:bg-brand-primary/90 text-text-white px-4 py-2 rounded-md",
        cancelButton:
          "bg-brand-primary hover:bg-brand-primary/90 text-text-white px-4 py-2 rounded-md",
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
  }, [router]);

  const isExpandedView = !collapsed || hovered;
// Add this temporarily to debug

  const SidebarContent = useCallback(() => {
    const isSettingsActive = SETTINGS.some((s) => pathname === s.href);

    return (
      <div className="flex h-full flex-col bg-sidebar relative">
        {/* Logo */}
        <div
          className={cn(
            "flex h-16 shrink-0 items-center justify-between px-6 border-b border-sidebar-border transition-all duration-300",
            collapsed && !hovered && "px-3 justify-center"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
              <BarChart3 className="h-5 w-5 text-brand-primary" />
            </div>
            {isExpandedView && (
              <h1 className="text-xl font-bold text-white whitespace-nowrap">
                CRM Pro
              </h1>
            )}
          </div>
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
  const isGroupExpanded = expanded.includes(item.name);
  
  // This is the correct logic:
  const isActive =
    pathname === item.href ||
    pathname.startsWith(item.href + "/") ||
    children.some(
      (c) => pathname === c.href || pathname.startsWith(c.href + "/")
    );
    console.log("Current path:", pathname);
console.log("Item href:", item.href);
console.log("Is active:", isActive);





                  return children.length ? (
                    <div key={item.name} className="space-y-1">
                       <Button
        variant="ghost"
        className={cn(
          "w-full justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
          // ✅ This should now work correctly
          isActive
            ? "bg-white text-brand-primary shadow-sm"
            : "text-white hover:bg-white hover:text-brand-primary",
          collapsed && !hovered && "justify-center px-2"
        )}
        onClick={() => {
          if (can(item.moduleName, "view") && item.href)
            router.push(item.href);
          toggleGroup(item.name);
        }}
      >
                        <div className="flex items-center gap-3">
                          <item.icon className="h-5 w-5 flex-shrink-0" />
                          {isExpandedView && (
                            <span className="whitespace-nowrap">
                              {item.name}
                            </span>
                          )}
                        </div>
                        {isExpandedView && (
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 flex-shrink-0 transition-transform duration-200",
                              isGroupExpanded && "rotate-45"
                            )}
                          />
                        )}
                      </Button>

                      {/* Submenu */}
                      {isExpandedView && isGroupExpanded && (
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
                                    ? "text-white"
                                    : "text-gray-300 hover:text-white hover:bg-transparent"
                                )}
                              >
                                <span className="whitespace-nowrap">
                                  {c.name}
                                </span>
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
        collapsed && !hovered && "justify-center px-2",
        // ✅ This should now work correctly too
        pathname === item.href || pathname.startsWith(item.href + "/")
          ? "bg-white text-brand-primary shadow-sm"
          : "text-white hover:bg-white hover:text-brand-primary"
      )}
    >
                      <item.icon
                        className={cn(
                          "h-5 w-5 flex-shrink-0",
                          isExpandedView && "mr-3"
                        )}
                      />
                      {isExpandedView && (
                        <span className="whitespace-nowrap">{item.name}</span>
                      )}
                    </Button>
                  );
                })
              )}
            </div>

            {/* Settings */}
            <div
              className={cn(
                "mt-8 pt-4 border-t border-sidebar-border transition-all duration-300",
                collapsed && !hovered && "mt-4"
              )}
            >
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  // ✅ Only highlight when settings route is active
                  isSettingsActive
                    ? "bg-white text-brand-primary shadow-sm"
                    : "text-white hover:bg-white hover:text-brand-primary",
                  collapsed && !hovered && "justify-center px-2"
                )}
                onClick={() => toggleGroup("Settings")}
              >
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5 flex-shrink-0" />
                  {isExpandedView && (
                    <span className="whitespace-nowrap">Settings</span>
                  )}
                </div>
                {isExpandedView && (
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 flex-shrink-0 transition-transform duration-200",
                      expanded.includes("Settings") && "rotate-45"
                    )}
                  />
                )}
              </Button>

              {isExpandedView && expanded.includes("Settings") && (
                <div className="space-y-1 pl-6 pt-1 w-full">
                  {SETTINGS.map((it) => {
                    const isChildActive = pathname === it.href;
                    return (
                      <Button
                        key={it.href}
                        variant="ghost"
                        onClick={() => {
                          if (it.name === "Change Password") {
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
                        <it.icon className="mr-3 h-4 w-4 flex-shrink-0" />
                        <span className="whitespace-nowrap">{it.name}</span>
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
        <div className="p-4 border-t border-sidebar-border transition-all duration-300">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={cn(
              "w-full text-white hover:bg-white hover:text-brand-primary transition-all duration-200",
              collapsed && !hovered ? "justify-center px-2" : "justify-start"
            )}
          >
            <LogOut
              className={cn("h-5 w-5 flex-shrink-0", isExpandedView && "mr-3")}
            />
            {isExpandedView && (
              <span className="whitespace-nowrap">Logout</span>
            )}
          </Button>
        </div>
      </div>
    );
  }, [
    isExpandedView,
    collapsed,
    hovered,
    ready,
    filteredNav,
    getChildren,
    expanded,
    pathname,
    can,
    router,
    toggleGroup,
    handleLogout,
  ]);

  return (
    <>
      {/* Desktop */}
      <div
        className={cn(
          "hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col transition-all duration-300 ease-in-out",
          collapsed && !hovered ? "lg:w-16" : "lg:w-52"
        )}
      >
        <SidebarContent />
      </div>

      {/* Mobile */}
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="left" className="p-0 w-52">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  );
}
