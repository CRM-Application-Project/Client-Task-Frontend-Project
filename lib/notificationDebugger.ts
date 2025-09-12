// Debug utility to track notification API calls
"use client";

interface CallTrace {
  timestamp: number;
  method: string;
  stack: string;
  args: any[];
}

class NotificationDebugger {
  private static instance: NotificationDebugger;
  private callHistory: CallTrace[] = [];
  private enabled: boolean = false;

  private constructor() {}

  public static getInstance(): NotificationDebugger {
    if (!NotificationDebugger.instance) {
      NotificationDebugger.instance = new NotificationDebugger();
    }
    return NotificationDebugger.instance;
  }

  public enable(): void {
    this.enabled = true;
    console.log('🐛 NotificationDebugger enabled');
  }

  public disable(): void {
    this.enabled = false;
    console.log('🐛 NotificationDebugger disabled');
  }

  public logCall(method: string, ...args: any[]): void {
    if (!this.enabled) return;

    const stack = new Error().stack || '';
    const trace: CallTrace = {
      timestamp: Date.now(),
      method,
      stack,
      args
    };

    this.callHistory.push(trace);

    // Keep only last 20 calls
    if (this.callHistory.length > 20) {
      this.callHistory.shift();
    }

    console.log(`🐛 [${new Date().toISOString()}] ${method} called with:`, args);
    
    // Check for duplicate calls within 1 second
    const recentCalls = this.callHistory.filter(call => 
      call.method === method && 
      trace.timestamp - call.timestamp < 1000
    );

    if (recentCalls.length > 1) {
      console.warn(`⚠️ DUPLICATE CALL DETECTED: ${method} called ${recentCalls.length} times within 1 second!`);
      console.warn('Call stacks:', recentCalls.map(call => call.stack.split('\n').slice(0, 5).join('\n')));
    }
  }

  public getCallHistory(): CallTrace[] {
    return [...this.callHistory];
  }

  public printReport(): void {
    console.group('🐛 Notification Call Report');
    
    const callCounts = this.callHistory.reduce((acc, call) => {
      acc[call.method] = (acc[call.method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('Call counts:', callCounts);
    
    // Show recent calls
    console.log('Recent calls:');
    this.callHistory.slice(-10).forEach(call => {
      console.log(`${new Date(call.timestamp).toISOString()} - ${call.method}`);
    });

    console.groupEnd();
  }

  public clear(): void {
    this.callHistory = [];
    console.log('🐛 Call history cleared');
  }
}

export const notificationDebugger = NotificationDebugger.getInstance();

// Enable debugging in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).notificationDebugger = notificationDebugger;
  notificationDebugger.enable();
}
