"use client";
import { initializeApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  onMessage,
  Messaging,
} from "firebase/messaging";
import { getDatabase, Database } from "firebase/database";
import { notificationService } from "./services/notificationService";

const firebaseConfig = {
  apiKey: "AIzaSyAmHw8W1-CFjkZEBPChYScfWHAot-OeLJk",
  authDomain: "client-task-management-6ef15.firebaseapp.com",
  databaseURL:
    "https://client-task-management-6ef15-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "client-task-management-6ef15",
  storageBucket: "client-task-management-6ef15.firebasestorage.app",
  messagingSenderId: "776364891906",
  appId: "1:776364891906:web:ea640813981faf4dd4ec1b",
  measurementId: "G-WTXPLT2X4B",
};

const app = initializeApp(firebaseConfig);

// Initialize database
let database: Database | null = null;

function getDatabaseInstance(): Database | null {
  if (typeof window !== "undefined") {
    if (!database) {
      try {
        database = getDatabase(app);
      } catch (error) {
        console.warn("Failed to initialize Firebase database:", error);
        database = null;
      }
    }
    return database;
  }
  return null;
}

// Initialize messaging only in browser environment
let messaging: Messaging | null = null;

function getMessagingInstance(): Messaging | null {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    if (!messaging) {
      try {
        messaging = getMessaging(app);
      } catch (error) {
        console.warn("Failed to initialize Firebase messaging:", error);
        messaging = null;
      }
    }
    return messaging;
  }
  return null;
}

export { getMessagingInstance, getDatabaseInstance };

// Global state management
let serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
let isTokenRefreshInProgress = false;
let tokenRefreshTimeout: NodeJS.Timeout | null = null;
let refreshHandlerCleanup: (() => void) | null = null;
let lastSentToken: string | null = null;
let tokenSendInProgress = false;
let userEnablingNotifications = false; // New flag to prevent conflicts

const VAPID_KEY =
  "BB1gECwdCiIdphrOXUFhpS7tiId2-L0Xri5Dp8VOTQbqxbnTDCWTbnWvAl5kPnCKX4yScA1O9JsbZEz5aE6S57c";
const TOKEN_REFRESH_INTERVAL = 60 * 60 * 1000; // 60 minutes (increased from 30 minutes)
const DEBOUNCE_DELAY = 2000; // 2 seconds (increased debounce)
const TOKEN_SEND_COOLDOWN = 5 * 60 * 1000; // 5 minute cooldown between sends (increased)

// Device type detection functions
function getDeviceType(): string {
  if (typeof window === "undefined") return "WEB";

  const userAgent = navigator.userAgent;

  if (/Mobi|Android/i.test(userAgent)) {
    return "MOBILE";
  } else if (/Tablet|iPad/i.test(userAgent)) {
    return "TAB";
  } else {
    return "WEB"; // laptop / desktop
  }
}

function getBrowserName(): string {
  if (typeof window === "undefined") return "UNKNOWN";

  const userAgent = navigator.userAgent;

  if (
    userAgent.includes("Chrome") &&
    !userAgent.includes("Edg") &&
    !userAgent.includes("OPR")
  ) {
    return "CHROME";
  } else if (userAgent.includes("Edg")) {
    return "EDGE";
  } else if (userAgent.includes("Firefox")) {
    return "FIREFOX";
  } else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
    return "SAFARI";
  } else {
    return "UNKNOWN";
  }
}

// Device type with browser detection
export function getDetailedDeviceType(): string {
  const device = getDeviceType();
  const browser = getBrowserName();
  return `${device}-${browser}`;
}

// Service worker management
async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (serviceWorkerRegistration) {
    return serviceWorkerRegistration;
  }

  if (!("serviceWorker" in navigator)) {
    throw new Error("Service Workers are not supported in this browser");
  }

  try {
    const existingRegistration = await navigator.serviceWorker.getRegistration(
      "/firebase-messaging-sw.js"
    );

    if (existingRegistration) {
      serviceWorkerRegistration = existingRegistration;
      return existingRegistration;
    }

    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
      {
        scope: "/",
      }
    );

    if (registration.installing) {
      await new Promise<void>((resolve) => {
        registration.installing!.addEventListener("statechange", (event) => {
          if ((event.target as ServiceWorker).state === "activated") {
            resolve();
          }
        });
      });
    }

    serviceWorkerRegistration = registration;
    return registration;
  } catch (error) {
    console.error("Service Worker registration failed:", error);
    throw error;
  }
}

// Debounced token refresh function
const debouncedTokenRefresh = (() => {
  let timeoutId: NodeJS.Timeout | null = null;

  return (fn: () => Promise<void>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(async () => {
      if (!isTokenRefreshInProgress) {
        await fn();
      }
    }, DEBOUNCE_DELAY);
  };
})();

// Core token refresh logic (with protection against concurrent calls)
async function checkAndRefreshToken(): Promise<void> {
  if (isTokenRefreshInProgress) {
    console.log("🔄 Token refresh already in progress, skipping...");
    return;
  }

  if (userEnablingNotifications) {
    console.log(
      "🔄 User is enabling notifications, skipping automatic refresh..."
    );
    return;
  }

  isTokenRefreshInProgress = true;

  try {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      console.log("No user logged in, skipping token refresh check");
      return;
    }

    const permission = Notification.permission;
    if (permission !== "granted") {
      console.log(
        "Notification permission not granted, skipping token refresh"
      );
      return;
    }

    // Get current token from Firebase
    const messagingInstance = getMessagingInstance();
    if (!messagingInstance) {
      console.log("Firebase messaging not available");
      return;
    }

    const swRegistration = await getServiceWorkerRegistration();
    const currentToken = await getToken(messagingInstance, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration || undefined,
    });

    if (!currentToken) {
      console.log("No current token available");
      return;
    }

    const storedToken = localStorage.getItem("fcmToken");

    if (currentToken !== storedToken) {
      console.log("🔄 Token changed detected, updating backend...");
      const deviceType = getDetailedDeviceType();
      const result = await notificationService.saveFCMToken(
        currentToken,
        deviceType
      );

      if (result.success) {
        console.log("✅ Updated token sent to backend successfully");
      } else {
        console.error(
          "❌ Failed to send updated token to backend:",
          result.message
        );
      }
    } else {
      console.log("Token unchanged, no update needed");
    }
  } catch (error) {
    console.error("❌ Error in token refresh check:", error);
  } finally {
    isTokenRefreshInProgress = false;
  }
}

// Generate FCM Token (only for initial setup)
export async function generateFCMToken(
  deviceType?: string
): Promise<{
  success: boolean;
  token?: string;
  message: string;
  error?: unknown;
}> {
  if (isTokenRefreshInProgress) {
    return { success: false, message: "Token refresh already in progress" };
  }

  try {
    if (!("Notification" in window)) {
      console.warn("Notifications are not supported in this browser");
      return { success: false, message: "Notifications not supported" };
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Notifications permission denied");
      return { success: false, message: "Permission denied" };
    }

    const messagingInstance = getMessagingInstance();
    if (!messagingInstance) {
      return { success: false, message: "Firebase messaging not available" };
    }

    const swRegistration = await getServiceWorkerRegistration();
    await new Promise((resolve) => setTimeout(resolve, 500));

    const fcmToken = await getToken(messagingInstance, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration || undefined,
    });

    if (fcmToken) {
      console.log("✅ FCM Token generated:", fcmToken);

      return {
        success: true,
        token: fcmToken,
        message: "Token generated successfully",
      };
    }

    return { success: false, message: "Failed to generate FCM token" };
  } catch (err) {
    console.error("❌ Failed to get FCM token", err);
    return { success: false, message: "Failed to get FCM token", error: err };
  }
}

// Simplified token refresh handler
export function initTokenRefreshHandler(deviceType?: string): () => void {
  // Clean up any existing handler first
  if (refreshHandlerCleanup) {
    refreshHandlerCleanup();
  }

  console.log("🔄 Initializing token refresh handler...");

  // Single interval for periodic checking
  const refreshInterval = setInterval(() => {
    debouncedTokenRefresh(checkAndRefreshToken);
  }, TOKEN_REFRESH_INTERVAL);

  // Handle storage events (user login/logout in other tabs)
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === "userId") {
      if (event.newValue && !event.oldValue) {
        // User logged in
        console.log("🔑 User logged in detected, scheduling token check...");
        debouncedTokenRefresh(checkAndRefreshToken);
      } else if (!event.newValue && event.oldValue) {
        // User logged out
        console.log("🔑 User logged out detected, cleaning up tokens...");
        cleanupNotifications();
      }
    }
  };

  // Handle page visibility changes (less aggressive)
  const handleVisibilityChange = () => {
    if (!document.hidden) {
      // Only check token on visibility change if we haven't checked recently
      const lastCheckTime = localStorage.getItem("lastTokenCheckTime");
      if (
        !lastCheckTime ||
        Date.now() - parseInt(lastCheckTime) > 5 * 60 * 1000
      ) {
        // 5 minutes
        console.log("👀 Page became visible, scheduling token check...");
        localStorage.setItem("lastTokenCheckTime", Date.now().toString());
        debouncedTokenRefresh(checkAndRefreshToken);
      }
    }
  };

  // Handle online events
  const handleOnline = () => {
    console.log("🌐 Browser came online, scheduling token check...");
    debouncedTokenRefresh(checkAndRefreshToken);
  };

  // Set up event listeners
  window.addEventListener("storage", handleStorageChange);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("online", handleOnline);

  // Initial check (delayed to avoid conflicts with login flow)
  setTimeout(() => {
    // Only do initial check if we haven't checked recently
    const lastCheckTime = localStorage.getItem("lastTokenCheckTime");
    if (
      !lastCheckTime ||
      Date.now() - parseInt(lastCheckTime) > 10 * 60 * 1000
    ) {
      // 10 minutes
      localStorage.setItem("lastTokenCheckTime", Date.now().toString());
      debouncedTokenRefresh(checkAndRefreshToken);
    }
  }, 5000); // 5 second delay

  console.log("✅ Token refresh handler initialized");

  // Return cleanup function
  refreshHandlerCleanup = () => {
    window.removeEventListener("storage", handleStorageChange);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("online", handleOnline);
    clearInterval(refreshInterval);

    if (tokenRefreshTimeout) {
      clearTimeout(tokenRefreshTimeout);
      tokenRefreshTimeout = null;
    }

    isTokenRefreshInProgress = false;
    console.log("🧹 Token refresh handler cleaned up");
  };

  return refreshHandlerCleanup;
}

// App startup handler (simplified)
export async function handleAppStartup(): Promise<void> {
  try {
    console.log("🚀 Starting app notification setup...");

    // Pre-register service worker first
    await preRegisterServiceWorker();

    const userId = localStorage.getItem("userId");
    if (!userId) {
      console.log("No user logged in, skipping notification setup");
      return;
    }

    const permission = getNotificationPermission();
    if (permission === "granted") {
      // Only initialize refresh handler, don't generate token here
      // Token will be handled by login flow or refresh handler
      initTokenRefreshHandler();
    }

    console.log("✅ App notification setup completed");
  } catch (error) {
    console.error("❌ Error during app startup notification setup:", error);
  }
}

// Enhanced cleanup function
export function cleanupNotifications(): void {
  try {
    // Clean up refresh handler
    if (refreshHandlerCleanup) {
      refreshHandlerCleanup();
      refreshHandlerCleanup = null;
    }

    // Remove stored tokens
    localStorage.removeItem("fcmToken");
    localStorage.removeItem("fcmTokenDeviceType");
    localStorage.removeItem("lastTokenSentTime");

    // Reset global state
    isTokenRefreshInProgress = false;
    tokenSendInProgress = false;
    serviceWorkerRegistration = null;
    lastSentToken = null;

    console.log("🧹 Notification data cleaned up");
  } catch (error) {
    console.error("❌ Error during notification cleanup:", error);
  }
}

// Function to handle foreground messages
export function subscribeToMessages(
  onMessageReceived?: (payload: any) => void
): void {
  const messagingInstance = getMessagingInstance();
  if (!messagingInstance) {
    console.warn("Firebase messaging not available for message subscription");
    return;
  }

  onMessage(messagingInstance, (payload) => {
    console.log("📩 Foreground message:", payload);

    if (onMessageReceived) {
      onMessageReceived(payload);
    }

    if (payload.notification) {
      new Notification(payload.notification.title || "New Notification", {
        body: payload.notification.body,
        icon: payload.notification.icon || "/default-icon.png",
        badge: "/badge-icon.png",
        tag: "fcm-notification",
        requireInteraction: false,
      });
    }
  });
}

// Pre-register service worker
export async function preRegisterServiceWorker(): Promise<void> {
  try {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      await getServiceWorkerRegistration();
      console.log("✅ Service worker pre-registered successfully");
    }
  } catch (error) {
    console.warn("⚠️ Service worker pre-registration failed:", error);
  }
}

// Utility functions
export function isNotificationEnabled(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  );
}

export function getNotificationPermission(): NotificationPermission | null {
  if (typeof window !== "undefined" && "Notification" in window) {
    return Notification.permission;
  }
  return null;
}

// Force token refresh (for testing/debugging)
export async function forceTokenRefresh(): Promise<{
  success: boolean;
  token?: string;
  message: string;
}> {
  try {
    console.log("🔄 Forcing token refresh...");

    // Reset the in-progress flag and clear stored token
    isTokenRefreshInProgress = false;
    localStorage.removeItem("fcmToken");

    // Generate new token
    const result = await generateFCMToken();

    if (result.success && result.token) {
      // Send to backend using notification service
      const deviceType = getDetailedDeviceType();
      const backendResult = await notificationService.saveFCMToken(
        result.token,
        deviceType
      );

      if (backendResult.success) {
        console.log("✅ Token refresh forced successfully");
        return {
          success: true,
          token: result.token,
          message: "Token refreshed successfully",
        };
      } else {
        return { success: false, message: backendResult.message };
      }
    } else {
      return { success: false, message: result.message };
    }
  } catch (error) {
    console.error("❌ Error forcing token refresh:", error);
    return { success: false, message: "Failed to force token refresh" };
  }
}

// Legacy function for backward compatibility
export async function requestNotificationPermission(
  userId?: string
): Promise<{ success: boolean; message: string; token?: string }> {
  console.log(
    "⚠️ requestNotificationPermission is deprecated, use generateFCMToken instead"
  );
  const deviceType = getDetailedDeviceType();
  return await generateFCMToken(deviceType);
}

// Functions to manage user enabling state (prevent conflicts)
export function setUserEnablingNotifications(enabling: boolean): void {
  userEnablingNotifications = enabling;
  console.log(`🔄 User enabling notifications flag set to: ${enabling}`);
}

export function isUserEnablingNotifications(): boolean {
  return userEnablingNotifications;
}
