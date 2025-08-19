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
  Settings,
  User,
  KeyRound,
  ChevronLeft,
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
  children?: {
    name: string;
    href: string;
    moduleName: string;
  }[];
}

// Define navigation items with exact module names matching your API
const navigation: NavItem[] = [
  {
    name: "Leads",
    icon: Users,
    href: "/leads",
    moduleName: "Leads"
  },
  {
    name: "Tasks",
    icon: CheckSquare,
    href: "/tasks",
    moduleName: "Task"
  },
  {
    name: "Employees",
    icon: UserCheck,
    href: "/employees",
    moduleName: "Employees",
    children: [
      { name: "Department", href: "/employees/department", moduleName: "Department" },
      { name: "Staff", href: "/employees/staff", moduleName: "Staff" },
    ],
  },
];

// Settings items (no permission required)
const settingsNavigation = [
  {
    name: "Profile",
    icon: User,
    href: "/profile",
  },
  {
    name: "Change Password",
    icon: KeyRound,
    href: "/change-password",
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
  onCollapseChange?: (collapsed: boolean) => void;
}
export function DashboardSidebar({ isOpen, onClose, onCollapseChange }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Get Redux state
  const reduxUser = useSelector((state: RootState) => state.user.currentUser);
  
  // State to hold user data and modules
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userModules, setUserModules] = useState<UserModuleAccess[]>([]);

  // Get user data and modules from localStorage or Redux
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Try to get user from localStorage first
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setCurrentUser(parsedUser);
          
          // Get modules from stored user data
          if (parsedUser.userModuleAccessList) {
            setUserModules(parsedUser.userModuleAccessList);
          } else if (parsedUser.modules) {
            setUserModules(parsedUser.modules);
          }
        } catch (error) {
          console.error('Error parsing stored user:', error);
          // Fallback to Redux user
          setCurrentUser(reduxUser);
          setUserModules(reduxUser?.modules || []);
        }
      } else {
        // Use Redux user
        setCurrentUser(reduxUser);
        setUserModules(reduxUser?.modules || []);
      }
    }
  }, [reduxUser]);

  // Enhanced permission check function - ONLY use API response data
  const hasPermission = (moduleName: string, permission: 'view' | 'edit' | 'create' | 'delete' = 'view'): boolean => {
    // No user data available
    if (!currentUser) {
      console.warn('No current user found for permission check');
      return false;
    }

    // If no modules data, deny access (even for admins - API controls permissions)
    if (!userModules || userModules.length === 0) {
      console.warn('No user modules found for permission check');
      return false;
    }

    // Find module in user's permissions with flexible matching
    const module = userModules.find((m: UserModuleAccess) => {
      // Try exact match first
      if (m.moduleName === moduleName) return true;
      
      // Try case-insensitive match
      if (m.moduleName?.toLowerCase() === moduleName.toLowerCase()) return true;
      
      // Try partial matches for common cases
      const moduleNameLower = m.moduleName?.toLowerCase() || '';
      const searchNameLower = moduleName.toLowerCase();
      
      return moduleNameLower.includes(searchNameLower) || searchNameLower.includes(moduleNameLower);
    });
    
    if (!module) {
      console.warn(`Module '${moduleName}' not found in user permissions`);
      return false;
    }

    // Check specific permission - use exact property names from API
    let hasPermission = false;
    switch (permission) {
      case 'view':
        hasPermission = module.canView === true;
        break;
      case 'edit':
        hasPermission = module.canEdit === true;
        break;
      case 'create':
        hasPermission = module.canCreate === true;
        break;
      case 'delete':
        hasPermission = module.canDelete === true;
        break;
      default:
        hasPermission = false;
    }
    
    return hasPermission;
  };
  const toggleCollapse = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    if (onCollapseChange) {
      onCollapseChange(newCollapsedState);
    }
  };
  // Filter navigation based on permissions - only show items user can view
  const filteredNavigation = navigation.filter(item => {
    const hasAccess = hasPermission(item.moduleName, 'view');
    
    // For items with children, check if at least one child is accessible
    if (item.children) {
      const accessibleChildren = item.children.filter(child => 
        hasPermission(child.moduleName, 'view')
      );
      
      // Show parent if it has access OR if any child has access
      const shouldShow = hasAccess || accessibleChildren.length > 0;
      
      return shouldShow;
    }
    
    return hasAccess;
  });

  // Filter children for items that have them
  const getFilteredChildren = (item: NavItem) => {
    if (!item.children) return [];
    return item.children.filter(child => hasPermission(child.moduleName, 'view'));
  };

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev =>
      prev.includes(itemName)
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  // Auto-expand items if user is on a child route
  useEffect(() => {
    filteredNavigation.forEach((item) => {
      if (item.children) {
        const filteredChildren = getFilteredChildren(item);
        const isOnChildRoute = filteredChildren.some(child => pathname === child.href);
        
        if (isOnChildRoute && !expandedItems.includes(item.name)) {
          setExpandedItems(prev => [...prev, item.name]);
        }
      }
    });
    
    // Check if we're on a settings route
    if (settingsNavigation.some(item => pathname === item.href) && !expandedItems.includes('Settings')) {
      setExpandedItems(prev => [...prev, 'Settings']);
    }
  }, [pathname, filteredNavigation.length]);

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
        confirmButton: "bg-[#3b3b3b] hover:bg-[#2b2b2b] text-white px-4 py-2 rounded-md",
        cancelButton: "bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md",
      },
    }).then((result) => {
      if (result.isConfirmed) {
        // Clear all auth-related localStorage items
        const keysToRemove = [
          'currentUser',
          'userModules', 
          'authToken',
          'refreshToken',
          'tenantToken'
        ];
        
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
        });
        
        router.push("/");
      }
    });
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-[#3b3b3b] relative">
      {/* Collapse Toggle Button */}
    <Button
    variant="ghost"
    size="sm"
    className={cn(
      "absolute -right-3 top-20 z-10 h-6 w-6 rounded-full p-0 bg-white hover:bg-gray-200 hidden lg:flex",
      isCollapsed && "-right-10"
    )}
    onClick={toggleCollapse} // Changed from onClick={() => setIsCollapsed(!isCollapsed)}
  >
    {isCollapsed ? (
      <ChevronRight className="h-4 w-4 text-[#3b3b3b]" />
    ) : (
      <ChevronLeft className="h-4 w-4 text-[#3b3b3b]" />
    )}
  </Button>

      {/* Logo */}
      <div className={cn(
        "flex h-16 shrink-0 items-center justify-between px-6 border-b border-[#4b4b4b] transition-all duration-300",
        isCollapsed && "px-3 justify-center"
      )}>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
            <BarChart3 className="h-5 w-5 text-[#3b3b3b]" />
          </div>
          {!isCollapsed && (
            <h1 className="text-xl font-bold text-white">CRM Pro</h1>
          )}
        </div>
        {!isCollapsed && (
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
            {filteredNavigation.length === 0 ? (
              <div className="text-center text-gray-300 py-8">
                <p className="text-sm">No accessible modules found</p>
                <p className="text-xs text-gray-400 mt-1">Contact your administrator</p>
              </div>
            ) : (
              filteredNavigation.map((item) => {
                const hasChildren = item.children && item.children.length > 0;
                const filteredChildren = getFilteredChildren(item);
                const isChildActive = filteredChildren.some(child => pathname === child.href);
                const isExpanded = expandedItems.includes(item.name);
                const isDirectActive = pathname === item.href;

                // If item has children, show as expandable
                if (hasChildren && filteredChildren.length > 0) {
                  return (
                    <div key={item.name} className="space-y-1">
                      {/* Parent Item */}
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                          isChildActive || isExpanded || isDirectActive
                            ? "bg-white text-[#3b3b3b] shadow-sm"
                            : "text-white hover:bg-white hover:text-[#3b3b3b]",
                          isCollapsed && "justify-center px-2"
                        )}
                        onClick={() => {
                          // If parent has direct access and href, navigate to it
                          if (hasPermission(item.moduleName, 'view') && item.href) {
                            router.push(item.href);
                          }
                          // Always toggle expansion for children
                          toggleExpanded(item.name);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="h-5 w-5" />
                          {!isCollapsed && item.name}
                        </div>
                        {!isCollapsed && (
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 transition-transform duration-200",
                              isExpanded && "rotate-90"
                            )}
                          />
                        )}
                      </Button>

                      {/* Children - Only show when not collapsed */}
                      {!isCollapsed && isExpanded && (
                        <div className="space-y-1 pl-6 pt-1">
                          {filteredChildren.map((child) => {
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
                                onClick={() => router.push(child.href)}
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

                // Regular nav items without children
                return (
                  <Button
                    key={item.href}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      pathname === item.href
                        ? "bg-white text-[#3b3b3b] shadow-sm"
                        : "text-white hover:bg-white hover:text-[#3b3b3b]",
                      isCollapsed && "justify-center px-2"
                    )}
                    onClick={() => router.push(item.href)}
                  >
                    <item.icon className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
                    {!isCollapsed && item.name}
                  </Button>
                );
              })
            )}
          </div>

          {/* Settings Section (no permission required) */}
          <div className={cn("mt-8 pt-4 border-t border-[#4b4b4b]", isCollapsed && "mt-4")}>
            {!isCollapsed && (
              <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Account
              </div>
            )}
            
            {/* Settings Parent Item */}
            <div className="space-y-1">
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  (expandedItems.includes('Settings') || settingsNavigation.some(item => pathname === item.href))
                    ? "bg-white text-[#3b3b3b] shadow-sm"
                    : "text-white hover:bg-white hover:text-[#3b3b3b]",
                  isCollapsed && "justify-center px-2"
                )}
                onClick={() => toggleExpanded('Settings')}
              >
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5" />
                  {!isCollapsed && "Settings"}
                </div>
                {!isCollapsed && (
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      expandedItems.includes('Settings') && "rotate-90"
                    )}
                  />
                )}
              </Button>

              {/* Settings Children - Only show when not collapsed and expanded */}
              {!isCollapsed && expandedItems.includes('Settings') && (
                <div className="space-y-1 pl-6 pt-1">
                  {settingsNavigation.map((item) => {
                    const isChildActive = pathname === item.href;
                    return (
                      <Button
                        key={item.href}
                        variant="ghost"
                        className={cn(
                          "w-full justify-start rounded-lg px-3 py-2 text-sm transition-all duration-200",
                          isChildActive
                            ? "bg-white text-[#3b3b3b] shadow-sm"
                            : "text-gray-300 hover:bg-white hover:text-[#3b3b3b]"
                        )}
                        onClick={() => router.push(item.href)}
                      >
                        <item.icon className="mr-3 h-4 w-4" />
                        {item.name}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-[#4b4b4b]">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-white hover:bg-white hover:text-[#3b3b3b] transition-all duration-200",
            isCollapsed && "justify-center px-2"
          )}
          onClick={handleLogout}
        >
          <LogOut className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
          {!isCollapsed && "Logout"}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col transition-all duration-300",
        isCollapsed ? "lg:w-16" : "lg:w-64"
      )}>
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