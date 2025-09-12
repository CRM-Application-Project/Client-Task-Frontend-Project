// Network call tracker to prevent duplicate API requests
"use client";

interface PendingCall {
  url: string;
  method: string;
  body?: string;
  promise: Promise<Response>;
  timestamp: number;
}

class ApiCallTracker {
  private static instance: ApiCallTracker;
  private pendingCalls: Map<string, PendingCall> = new Map();
  private callHistory: Array<{ url: string; method: string; timestamp: number; status: number }> = [];

  private constructor() {}

  public static getInstance(): ApiCallTracker {
    if (!ApiCallTracker.instance) {
      ApiCallTracker.instance = new ApiCallTracker();
    }
    return ApiCallTracker.instance;
  }

  // Generate a unique key for the API call
  private getCallKey(url: string, method: string, body?: string): string {
    return `${method}:${url}:${body ? JSON.stringify(body) : ''}`;
  }

  // Intercept and deduplicate API calls
  public async interceptFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const method = options.method || 'GET';
    const body = options.body ? options.body.toString() : undefined;
    const callKey = this.getCallKey(url, method, body);

    // Check if this exact call is already in progress
    const existingCall = this.pendingCalls.get(callKey);
    if (existingCall) {
      const timeSinceCall = Date.now() - existingCall.timestamp;
      if (timeSinceCall < 5000) { // 5 second window
        console.warn(`🚫 DUPLICATE API CALL BLOCKED: ${method} ${url}`);
        console.warn(`Previous call started ${timeSinceCall}ms ago`);
        
        // Return the existing promise to avoid duplicate calls
        return existingCall.promise;
      } else {
        // Old call, remove it
        this.pendingCalls.delete(callKey);
      }
    }

    // Special handling for notification endpoints
    if (url.includes('/notification/')) {
      console.log(`🔍 TRACKING NOTIFICATION CALL: ${method} ${url}`);
      
      // Check for rapid successive calls to same endpoint
      const recentCalls = this.callHistory.filter(call => 
        call.url.includes('/notification/') && 
        (Date.now() - call.timestamp) < 2000 // 2 seconds
      );

      if (recentCalls.length > 0) {
        console.warn(`⚠️ RAPID NOTIFICATION CALLS DETECTED:`, recentCalls);
      }
    }

    // Create the actual fetch promise
    const fetchPromise = fetch(url, options).then(response => {
      // Log the response
      this.callHistory.push({
        url,
        method,
        timestamp: Date.now(),
        status: response.status
      });

      // Keep only last 50 calls
      if (this.callHistory.length > 50) {
        this.callHistory.shift();
      }

      // Remove from pending calls
      this.pendingCalls.delete(callKey);

      if (url.includes('/notification/')) {
        console.log(`📡 NOTIFICATION CALL COMPLETED: ${method} ${url} - Status: ${response.status}`);
      }

      return response;
    }).catch(error => {
      // Remove from pending calls even on error
      this.pendingCalls.delete(callKey);
      
      if (url.includes('/notification/')) {
        console.error(`❌ NOTIFICATION CALL FAILED: ${method} ${url}`, error);
      }
      
      throw error;
    });

    // Store the pending call
    this.pendingCalls.set(callKey, {
      url,
      method,
      body,
      promise: fetchPromise,
      timestamp: Date.now()
    });

    return fetchPromise;
  }

  // Get call statistics
  public getStats() {
    const stats = {
      pendingCalls: this.pendingCalls.size,
      recentCalls: this.callHistory.slice(-10),
      notificationCalls: this.callHistory.filter(call => call.url.includes('/notification/')),
      duplicateCallsPrevented: Array.from(this.pendingCalls.values()).length
    };

    console.log('📊 API Call Statistics:', stats);
    return stats;
  }

  // Clear all tracking data
  public clear() {
    this.pendingCalls.clear();
    this.callHistory = [];
    console.log('🧹 API call tracker cleared');
  }
}

export const apiCallTracker = ApiCallTracker.getInstance();

// Monkey patch fetch to intercept all API calls
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = input.toString();
    
    // Only intercept our API calls
    if (url.includes('/notification/') || url.includes('/api/v1/')) {
      return apiCallTracker.interceptFetch(url, init);
    }
    
    // Use original fetch for other calls
    return originalFetch.call(this, input, init);
  };

  // Make tracker available globally for debugging
  (window as any).apiCallTracker = apiCallTracker;
}
