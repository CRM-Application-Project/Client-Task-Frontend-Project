// Global notification manager to prevent duplicate initialization
"use client";

class NotificationManager {
  private static instance: NotificationManager;
  private initialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  public async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.initialize();
    return this.initializationPromise;
  }

  private async initialize(): Promise<void> {
    try {
      console.log('🔄 NotificationManager: Starting global initialization...');
      
      // Import the firebase functions dynamically to avoid SSR issues
      const { preRegisterServiceWorker } = await import('@/app/firebase');
      
      // Pre-register service worker
      await preRegisterServiceWorker();
      
      this.initialized = true;
      console.log('✅ NotificationManager: Initialization completed');
    } catch (error) {
      console.error('❌ NotificationManager: Initialization failed:', error);
      this.initializationPromise = null;
      throw error;
    }
  }

  public reset(): void {
    this.initialized = false;
    this.initializationPromise = null;
    console.log('🧹 NotificationManager: Reset completed');
  }

  public isInitialized(): boolean {
    return this.initialized;
  }
}

export const notificationManager = NotificationManager.getInstance();
