class SimpleApiCallTracker {
  private activeCalls = new Set<string>();
  private originalFetch: typeof fetch; // Store reference to original fetch

  constructor() {
    // Store the original fetch function before intercepting
    this.originalFetch = window.fetch.bind(window);
    this.interceptFetch();
  }

  private getCallKey(url: string, options?: RequestInit): string {
    const method = options?.method || 'GET';
    const body = options?.body;
    
    // Create a simple key without causing recursion
    let bodyString = '';
    if (body) {
      if (typeof body === 'string') {
        bodyString = body.length > 100 ? body.substring(0, 100) + '...' : body;
      } else {
        bodyString = '[object]';
      }
    }
    
    return `${method}:${url}:${bodyString}`;
  }

  private interceptFetch() {
    // Only intercept if not already intercepted
    if (window.fetch.name === 'interceptedFetch') {
      return;
    }

    const tracker = this;
    
    window.fetch = async function interceptedFetch(
      input: RequestInfo | URL, 
      init?: RequestInit
    ): Promise<Response> {
      const url = typeof input === 'string' ? input : input.toString();
      const callKey = tracker.getCallKey(url, init);

      // Check for duplicate calls
      if (tracker.activeCalls.has(callKey)) {
        console.warn(`🔄 Duplicate API call detected and blocked: ${callKey}`);
        throw new Error('Duplicate API call blocked');
      }

      // Track the call
      tracker.activeCalls.add(callKey);
      console.log(`📤 API CALL START: ${init?.method || 'GET'} ${url}`);

      try {
        // Use the original fetch function to avoid recursion
        const response = await tracker.originalFetch(input, init);
        
        console.log(`✅ API CALL SUCCESS: ${init?.method || 'GET'} ${url}`);
        return response;
      } catch (error) {
        console.error(`❌ API CALL FAILED: ${init?.method || 'GET'} ${url}`, error);
        throw error;
      } finally {
        // Always remove the call from tracking
        tracker.activeCalls.delete(callKey);
      }
    };
  }

  // Method to clear all active calls (useful for cleanup)
  clearActiveCalls() {
    this.activeCalls.clear();
  }

  // Method to get current active calls count
  getActiveCallsCount(): number {
    return this.activeCalls.size;
  }
}

// Initialize the tracker
export const apiCallTracker = new SimpleApiCallTracker();