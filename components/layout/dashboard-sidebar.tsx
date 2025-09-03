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
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Swal from "sweetalert2";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import Image from "next/image";
import { logoutUser } from "@/app/services/data.service";

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
      { name: "Department", href: "/employees/department", moduleName: "Department" },
      { name: "Staff", href: "/employees/staff", moduleName: "user" },
    ],
  },
];

const SETTINGS = [
  { name: "Profile", icon: User, href: "/profile" },
  { name: "Change Password", icon: KeyRound, href: "/profile?tab=change-password" },
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const [expanded, setExpanded] = useState<string[]>([]);
  const [manuallyCollapsed, setManuallyCollapsed] = useState<Set<string>>(new Set());
  const reduxUser = useSelector((s: RootState) => s.user.currentUser);
  const [modules, setModules] = useState<UserModuleAccess[]>([]);
  const [ready, setReady] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const [userRole, setUserRole] = useState<string | null>(null);

  // get logo from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = localStorage.getItem("logoUrl");
    if (url) {
      setLogoUrl(url);
    }
  }, []);

  // get role from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log("Parsed user from localStorage:", parsed);
        console.log("Extracted userRole:", parsed?.userRole);
        setUserRole(parsed?.userRole || null);
      }
    } catch {
      console.log("Failed to parse user from localStorage");
      setUserRole(null);
    }
  }, []);

  // get module access
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
    (moduleName: string, perm: "view" | "edit" | "create" | "delete" = "view") => {
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

  const filteredNav = useMemo(() => {
    console.log("Current userRole in filteredNav:", userRole);
    return NAVIGATION.filter((item) => {
      const isSuperAdmin = userRole?.toUpperCase() === "SUPER_ADMIN";

      if (item.moduleName === "Dashboard") {
        if (isSuperAdmin) {
          console.log("Showing Dashboard for SUPER_ADMIN");
          return true;
        } else {
          console.log("Hiding Dashboard for role:", userRole);
          return false;
        }
      }

      const children = item.children?.filter((c) => can(c.moduleName, "view")) || [];
      return can(item.moduleName, "view") || children.length > 0;
    });
  }, [modules, ready, can, userRole]);

  const getChildren = useCallback(
    (item: NavItem) => item.children?.filter((c) => can(c.moduleName, "view")) || [],
    [can]
  );

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
      if (
        (cleanPath === item.href || cleanPath.startsWith(item.href + "/") || hasActiveChild) &&
        !manuallyCollapsed.has(item.name)
      ) {
        openIfNeeded(item.name);
      }
    });

    // Check if we're on the profile page or change password
    const isProfilePage = cleanPath === "/profile";
    const isChangePasswordTab = searchParams?.get("tab") === "change-password";
    const isSettingsActive = isProfilePage || isChangePasswordTab;
    
    if (isSettingsActive && !manuallyCollapsed.has("Settings")) {
      openIfNeeded("Settings");
    }

    return Array.from(new Set(next));
  });
}, [pathname, filteredNav, getChildren, manuallyCollapsed, searchParams]);

  const toggleGroup = useCallback((key: string) => {
    setExpanded((prev) => {
      const isOpen = prev.includes(key);
      const next = isOpen ? prev.filter((k) => k !== key) : [...prev, key];
      setManuallyCollapsed((mc) => {
        const s = new Set(mc);
        if (isOpen) s.add(key);
        else s.delete(key);
        return s;
      });
      return next;
    });
  }, []);

const handleLogout = useCallback(async () => {
  const result = await Swal.fire({
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
  });

  if (!result.isConfirmed) return;

  try {
    // Call the logout API
    const response = await logoutUser();
    
    if (response.isSuccess) {
      // Clear local storage regardless of API response
      ["currentUser", "userModules", "authToken", "refreshToken", "tenantToken", "logoUrl"].forEach((k) =>
        localStorage.removeItem(k)
      );
      
      // Redirect to login page
      router.push("/");
    } else {
      // If API call fails but user confirmed logout, still log them out locally
      console.error("Logout API failed:", response.message);
      ["currentUser", "userModules", "authToken", "refreshToken", "tenantToken", "logoUrl"].forEach((k) =>
        localStorage.removeItem(k)
      );
      router.push("/");
    }
  } catch (error) {
    // If there's an error with the API call, still log out locally
    console.error("Error during logout:", error);
    ["currentUser", "userModules", "authToken", "refreshToken", "tenantToken", "logoUrl"].forEach((k) =>
      localStorage.removeItem(k)
    );
    router.push("/");
  }
}, [router]);

  const isExpandedView = !collapsed || hovered;

  const SidebarContent = useCallback(() => {
  const isProfilePage = cleanPath === "/profile";
  const isChangePasswordTab = searchParams?.get("tab") === "change-password";
  const isSettingsActive = isProfilePage || isChangePasswordTab;

    return (
      <div className="flex h-full flex-col bg-[#3b3b3b] relative">
        {/* Logo */}
        <div
          className={cn(
            "flex h-16 shrink-0 items-center justify-between px-6 border-b border-sidebar-border transition-all duration-300",
            collapsed && !hovered && "px-3 justify-center"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg  overflow-hidden">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt="Company Logo"
                  width={38}
                  height={38}
                  className="object-contain"
                />
              ) : (
                <BarChart3 className="h-5 w-5 text-brand-primary" />
              )}
            </div>
            {isExpandedView && <h1 className="text-xl font-bold text-white whitespace-nowrap">CRM Pro</h1>}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ScrollArea className="h-full">
            <div className="space-y-1">
              {ready && filteredNav.length === 0 ? (
                <div className="text-center text-gray-300 py-8">
                  <p className="text-sm">No accessible modules found</p>
                  <p className="text-xs text-gray-400 mt-1">Contact your administrator</p>
                </div>
              ) : (
                filteredNav.map((item) => {
                  const children = getChildren(item);
                  const isGroupExpanded = expanded.includes(item.name);
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/") ||
                    children.some((c) => pathname === c.href || pathname.startsWith(c.href + "/"));

                  return children.length ? (
                    <div key={item.name} className="space-y-1">
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                          isActive
                            ? "bg-white text-brand-primary shadow-sm"
                            : "text-white hover:bg-white hover:text-brand-primary",
                          collapsed && !hovered && "justify-center px-2"
                        )}
                        onClick={() => {
                          if (can(item.moduleName, "view") && item.href) router.push(item.href);
                          toggleGroup(item.name);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="h-5 w-5 flex-shrink-0" />
                          {isExpandedView && <span className="whitespace-nowrap">{item.name}</span>}
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
                                <span className="whitespace-nowrap">{c.name}</span>
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
                        pathname === item.href || pathname.startsWith(item.href + "/")
                          ? "bg-white text-brand-primary shadow-sm"
                          : "text-white hover:bg-white hover:text-brand-primary"
                      )}
                    >
                      <item.icon className={cn("h-5 w-5 flex-shrink-0", isExpandedView && "mr-3")} />
                      {isExpandedView && <span className="whitespace-nowrap">{item.name}</span>}
                    </Button>
                  );
                })
              )}
            </div>

            {/* Settings */}
           <div className={cn("mt-8 pt-4 border-t border-sidebar-border transition-all duration-300", collapsed && !hovered && "mt-4")}>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
            isSettingsActive
              ? "bg-white text-brand-primary shadow-sm"
              : "text-white hover:bg-white hover:text-brand-primary",
            collapsed && !hovered && "justify-center px-2"
          )}
          onClick={() => toggleGroup("Settings")}
        >
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 flex-shrink-0" />
            {isExpandedView && <span className="whitespace-nowrap">Settings</span>}
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
              // Determine if this setting item is active
              const isProfileItem = it.name === "Profile";
              const isPasswordItem = it.name === "Change Password";
              
              const isChildActive = 
                (isProfileItem && isProfilePage && !isChangePasswordTab) ||
                (isPasswordItem && isChangePasswordTab);
              
              return (
                <Button
                  key={it.href}
                  variant="ghost"
                  onClick={() => router.push(it.href)}
                  className={cn(
                    "relative w-full justify-start rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 group",
                    isChildActive
                      ? "bg-white/10 text-white"
                      : "text-gray-300 hover:text-white hover:bg-white/5"
                  )}
                >
                  <it.icon className="mr-3 h-4 w-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">{it.name}</span>
                  {isChildActive && (
                    <span className="absolute left-0 bottom-0 h-[2px] bg-white w-full transition-all duration-300" />
                  )}
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
            <LogOut className={cn("h-5 w-5 flex-shrink-0", isExpandedView && "mr-3")} />
            {isExpandedView && <span className="whitespace-nowrap">Logout</span>}
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
  logoUrl,
  searchParams,
  cleanPath,
  ]);

  return (
    <>
        <div
      className={cn(
        "hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col transition-all duration-300 ease-in-out",
        collapsed && !hovered ? "lg:w-16" : "lg:w-56"
      )}
      key={searchParams?.toString()} // Force re-render when search params change
    >
      <SidebarContent />
    </div>

      {/* Mobile */}
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="left" className="p-0 w-56">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  );
}