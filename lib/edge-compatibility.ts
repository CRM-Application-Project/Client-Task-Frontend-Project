import { getDetailedDeviceType } from "@/app/firebase";

// Edge compatibility utilities
export const isEdgeBrowser = (): boolean => {
  return navigator.userAgent.indexOf('Edg/') > -1 || 
         navigator.userAgent.indexOf('Edge/') > -1;
};

export const checkEdgeNotificationSupport = (): boolean => {
  if (isEdgeBrowser()) {
    // Edge has limited notification support
    return 'Notification' in window && 
           'serviceWorker' in navigator && 
           'PushManager' in window;
  }
  return true;
};

export const getEdgeCompatibleDeviceType = (): string => {
  if (isEdgeBrowser()) {
    return 'edge-web';
  }
  return getDetailedDeviceType(); // Your existing function
};