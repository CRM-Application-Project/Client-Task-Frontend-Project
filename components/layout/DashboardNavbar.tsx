"use client";
import { Bell, Menu, X, Check } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Swal from "sweetalert2";
import { logoutUser } from "@/app/services/data.service";
import { useNotifications } from "@/hooks/useNotifications"; // Update this path

interface UserData {
  firstName: string;
  lastName: string;
  userRole: string;
  userId?: string;
}

// Function to get page title from pathname
const getPageTitle = (pathname: string): string => {
  const pathSegments = pathname.split("/").filter(Boolean);

  if (pathSegments.length === 0) return "Dashboard";

  const lastSegment = pathSegments[pathSegments.length - 1];

  // Custom mapping for specific routes
  const pageTitles: Record<string, string> = {
    leads: "Leads",
    tasks: "Tasks",
    employees: "Employees",
    staff: "Staff",
    department: "Departments",
    profile: "Profile",
    settings: "Settings",
  };

  // Return the mapped title or capitalize the segment
  return (
    pageTitles[lastSegment] ||
    lastSegment.charAt(0).toUpperCase() +
      lastSegment.slice(1).replace(/-/g, " ")
  );
};

// Helper function to format notification time
const formatNotificationTime = (timestamp: number) => {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

export function DashboardNavbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [isEnablingNotifications, setIsEnablingNotifications] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();

  // Use the notifications hook
  const {
    notifications,
    unreadCount,
    permission,
    isLoading: isNotificationsLoading,
    enableNotifications,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification
  } = useNotifications();

  // Get the current page title
  const pageTitle = getPageTitle(pathname);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        // Auto-enable notifications if user has granted permission but hasn't enabled yet
        if (permission === 'granted' && parsedUser.userId) {
          // This is handled by the hook automatically
        }
      } catch (e) {
        console.error("Failed to parse user data", e);
      }
    }
    setIsUserLoading(false);
  }, [permission]);

  const handleEnableNotifications = async () => {
    if (!user?.userId) {
      await Swal.fire({
        title: "Error",
        text: "User information not available. Please refresh and try again.",
        icon: "error",
        customClass: { popup: "rounded-lg shadow-xl" },
      });
      return;
    }

    setIsEnablingNotifications(true);
    
    try {
      const result = await enableNotifications(user.userId);
      
      if (result.success) {
        await Swal.fire({
          title: "Notifications Enabled!",
          text: "You will now receive push notifications for important updates.",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
          customClass: { popup: "rounded-lg shadow-xl" },
        });
      } else {
        await Swal.fire({
          title: "Notification Setup Failed",
          text: result.message,
          icon: "error",
          customClass: { popup: "rounded-lg shadow-xl" },
        });
      }
    } catch (error) {
      console.error("Error enabling notifications:", error);
      await Swal.fire({
        title: "Error",
        text: "An unexpected error occurred while enabling notifications.",
        icon: "error",
        customClass: { popup: "rounded-lg shadow-xl" },
      });
    } finally {
      setIsEnablingNotifications(false);
    }
  };

  const handleNotificationClick = (notification: any) => {
    // Mark as read
    markAsRead(notification.id);

    // Handle notification action based on data
    if (notification.data?.action) {
      switch (notification.data.action) {
        case 'navigate':
          if (notification.data.path) {
            router.push(notification.data.path);
          }
          break;
        case 'open_task':
          if (notification.data.taskId) {
            router.push(`/tasks/${notification.data.taskId}`);
          }
          break;
        case 'open_lead':
          if (notification.data.leadId) {
            router.push(`/leads/${notification.data.leadId}`);
          }
          break;
        default:
          console.log("Unknown notification action:", notification.data.action);
      }
    }

    setIsNotificationDropdownOpen(false);
  };

  const handleLogout = useCallback(async () => {
    setIsDropdownOpen(false);

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
      const response = await logoutUser();
      
      if (response.isSuccess) {
        ["currentUser", "userModules", "authToken", "refreshToken", "tenantToken", "logoUrl", "user", "notifications"].forEach((k) =>
          localStorage.removeItem(k)
        );
        router.push("/");
      } else {
        console.error("Logout API failed:", response.message);
        ["currentUser", "userModules", "authToken", "refreshToken", "tenantToken", "logoUrl", "user", "notifications"].forEach((k) =>
          localStorage.removeItem(k)
        );
        router.push("/");
      }
    } catch (error) {
      console.error("Error during logout:", error);
      ["currentUser", "userModules", "authToken", "refreshToken", "tenantToken", "logoUrl", "user", "notifications"].forEach((k) =>
        localStorage.removeItem(k)
      );
      router.push("/");
    }
  }, [router]);

  const handleProfileClick = () => {
    router.push("/profile");
    setIsDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm sm:px-6 lg:px-6">
      {/* Left */}
      <div className="flex items-center gap-2 lg:gap-3">
        {/* Mobile: open sheet */}
        <button
          className="lg:hidden rounded-md p-2 text-gray-600 hover:bg-gray-100 focus:outline-none"
          onClick={onMenuClick}
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        {/* Desktop: Title */}
        <h1 className="hidden lg:block text-[22px] font-bold text-text-primary">
          {user
            ? `Welcome back, ${user.firstName} ${user.lastName}!`
            : pageTitle}
        </h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <div className="relative">
          <button 
            onClick={() => {
              if (permission === 'granted') {
                setIsNotificationDropdownOpen(!isNotificationDropdownOpen);
              } else {
                handleEnableNotifications();
              }
            }}
            className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none disabled:opacity-50"
            disabled={isEnablingNotifications || isNotificationsLoading}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-xs text-white flex items-center justify-center font-medium">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {isNotificationDropdownOpen && permission === 'granted' && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                  <div className="flex gap-2 text-xs">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <Check className="h-3 w-3" />
                        Mark all read
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        onClick={clearAll}
                        className="text-red-600 hover:text-red-800 flex items-center gap-1"
                      >
                        <X className="h-3 w-3" />
                        Clear all
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Notifications List */}
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-sm">No notifications yet</p>
                    <p className="text-gray-400 text-xs mt-1">
                      {`You'll see important updates here`}
                    </p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`relative px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                        !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">
                            {notification.title}
                          </p>
                          <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                            {notification.body}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-gray-400">
                              {formatNotificationTime(notification.timestamp)}
                            </p>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNotification(notification.id);
                          }}
                          className="ml-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Permission Request Tooltip */}
          {isNotificationDropdownOpen && permission !== 'granted' && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-lg border border-gray-200 z-50 p-4">
              <div className="text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Bell className="h-5 w-5 text-gray-400" />
                  <p className="font-medium text-gray-900">Enable Notifications</p>
                </div>
                <p className="text-gray-600 mb-3">
                  {permission === 'denied' 
                    ? 'Notifications are blocked. Please enable them in your browser settings and refresh the page.'
                    : 'Get notified about important updates, new tasks, and messages instantly.'
                  }
                </p>
                {permission !== 'denied' && (
                  <button
                    onClick={handleEnableNotifications}
                    disabled={isEnablingNotifications}
                    className="w-full bg-brand-primary text-white px-3 py-2 rounded-md text-sm hover:bg-brand-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {isEnablingNotifications ? 'Setting up...' : 'Enable Notifications'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User */}
        {isUserLoading ? (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-16 h-3 bg-gray-200 rounded animate-pulse mt-1"></div>
            </div>
            <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
          </div>
        ) : user ? (
          <div className="relative flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-gray-900">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-xs text-gray-500 capitalize">
                {user.userRole.replace(/_/g, " ").toLowerCase()}
              </div>
            </div>
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="focus:outline-none group"
              >
                <Avatar className="h-8 w-8 cursor-pointer group-hover:bg-brand-primary transition-colors duration-200">
                  <AvatarFallback className="transition-colors duration-200 group-hover:bg-brand-primary group-hover:text-text-white">
                    {user.firstName.charAt(0).toUpperCase()}
                    {user.lastName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                  <button
                    onClick={handleProfileClick}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    My Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-gray-900">Guest User</div>
              <div className="text-xs text-gray-500">Not logged in</div>
            </div>
            <Avatar className="h-8 w-8">
              <AvatarFallback>GU</AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>

      {/* Click-away for dropdowns */}
      {(isDropdownOpen || isNotificationDropdownOpen) && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => {
            setIsDropdownOpen(false);
            setIsNotificationDropdownOpen(false);
          }}
        />
      )}
    </header>
  );
}