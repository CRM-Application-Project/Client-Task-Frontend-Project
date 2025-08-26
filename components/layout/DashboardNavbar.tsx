"use client";
import { Bell, Moon, Menu } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Swal from "sweetalert2";

interface UserData {
  firstName: string;
  lastName: string;
  userRole: string;
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

export function DashboardNavbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Get the current page title
  const pageTitle = getPageTitle(pathname);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error("Failed to parse user data", e);
      }
    }
    setIsLoading(false);
  }, []);

  const handleLogout = () => {
    setIsDropdownOpen(false);
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
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        router.push("/");
      }
    });
  };

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
        {/* <button className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none">
          <Bell className="h-5 w-5" />
        </button>
        <button className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none">
          <Moon className="h-5 w-5" />
        </button> */}

        {/* User */}
        {isLoading ? (
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
                className="focus:outline-none group" // Added group class
              >
                <Avatar className="h-8 w-8 cursor-pointer group-hover:bg-brand-primary transition-colors duration-200"> {/* Added hover styles */}
 <AvatarFallback 
    className="transition-colors duration-200 group-hover:bg-brand-primary group-hover:text-text-white"
  >                    {user.firstName.charAt(0).toUpperCase()}
                    {user.lastName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                  <button
                    onClick={handleProfileClick}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    My Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
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
              <div className="text-sm font-medium text-gray-900">
                Guest User
              </div>
              <div className="text-xs text-gray-500">Not logged in</div>
            </div>
            <Avatar className="h-8 w-8">
              <AvatarFallback>GU</AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>

      {/* Click-away */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </header>
  );
}