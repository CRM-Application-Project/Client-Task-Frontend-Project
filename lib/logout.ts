// utils/logout.ts
// Update this path
import { cleanupNotifications } from '@/app/firebase';
import { dispatchLogoutEvent } from '@/hooks/useNotificationsGlobal'; // Update this path

export const handleUserLogout = async (
  logoutApiFunction?: () => Promise<any>, 
  router?: any,
  redirectPath: string = '/'
) => {
  try {
    // Call logout API if provided
    if (logoutApiFunction) {
      try {
        await logoutApiFunction();
      } catch (error) {
        console.error('Logout API failed:', error);
        // Continue with cleanup even if API fails
      }
    }

    // Clean up all localStorage items
    const itemsToRemove = [
      "currentUser", 
      "userModules", 
      "authToken", 
      "refreshToken", 
      "tenantToken", 
      "logoUrl", 
      "user", 
      "userId",
      "notifications",
      "fcmToken",
      "fcmTokenDeviceType",
      "themeData",
      // Clean up notification timing data
      "lastNotificationFetch",
      "lastTokenSentTime",
      "lastSentFCMToken",
      "lastTokenCheckTime",
      "lastNotificationEnabled",
      "lastNotificationRefresh"
    ];
    
    itemsToRemove.forEach((item) => {
      localStorage.removeItem(item);
    });

    // Clean up Firebase notifications
    cleanupNotifications();

    // Dispatch logout event for hooks to cleanup
    dispatchLogoutEvent();

    console.log('✅ User logout cleanup completed');

    // Redirect if router is provided
    if (router) {
      router.push(redirectPath);
    }

    return { success: true, message: 'Logout successful' };
    
  } catch (error) {
    console.error('Error during logout cleanup:', error);
    return { success: false, message: 'Logout cleanup failed', error };
  }
};

// Enhanced logout with confirmation dialog
export const handleUserLogoutWithConfirmation = async (
  Swal: any,
  logoutApiFunction?: () => Promise<any>,
  router?: any,
  redirectPath: string = '/'
) => {
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

  if (!result.isConfirmed) {
    return { success: false, message: 'Logout cancelled' };
  }

  return await handleUserLogout(logoutApiFunction, router, redirectPath);
};

// Function to check if user session is valid
export const isUserSessionValid = (): boolean => {
  const authToken = localStorage.getItem('authToken');
  const userId = localStorage.getItem('userId');
  
  return !!(authToken && userId);
};

// Function to get current user info
export const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

// Function to update user session (useful after login)
export const updateUserSession = (userData: any, authTokens: any, userModules: any[]) => {
  try {
    // Store auth tokens
    if (authTokens.token) {
      localStorage.setItem("authToken", authTokens.token);
    }
    if (authTokens.refreshToken) {
      localStorage.setItem("refreshToken", authTokens.refreshToken);
    }

    // Store user data
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("userId", userData.id);
    localStorage.setItem("currentUser", JSON.stringify(userData));
    
    // Store user modules
    if (userModules && userModules.length > 0) {
      localStorage.setItem("userModules", JSON.stringify(userModules));
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating user session:', error);
    return { success: false, error };
  }
};