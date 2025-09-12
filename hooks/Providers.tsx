"use client";

import { Provider } from "react-redux";
import { store } from "@/redux/store";
import { useEffect } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize API call tracker to prevent duplicate calls
    if (typeof window !== 'undefined') {
      import('../lib/apiCallTracker').then(() => {
        console.log('🔍 API call tracker initialized');
      });
    }
  }, []);

  return <Provider store={store}>{children}</Provider>;
}
