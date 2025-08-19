import { DVHostingSmsService } from './dvhostingSmsService';

export interface PendingVerification {
  id: string;
  orderId: string;
  orderData: {
    bookingId: string;
    customerName: string;
    customerPhone: string;
    address: string;
    pickupTime: string;
    riderName: string;
    updatedAt: string;
    status: string;
    originalItems: OrderItem[];
    updatedItems: OrderItem[];
    originalTotal: number;
    updatedTotal: number;
    priceChange: number;
    riderNotes: string;
    isQuickPickup: boolean;
  };
  type: 'price_change' | 'items_change' | 'quick_pickup_created';
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
  expiresAt?: string;
}

export interface OrderItem {
  id: string;
  serviceId?: string;
  name: string;
  description?: string;
  price: number;
  unit?: string;
  category?: string;
  quantity: number;
  total: number;
}

export class CustomerVerificationService {
  private static instance: CustomerVerificationService;
  private pendingVerifications: PendingVerification[] = [];
  private processedVerifications: Set<string> = new Set();
  private storageKey = 'customer_pending_verifications';
  private processedStorageKey = 'customer_processed_verifications';
  private apiBaseUrl: string;

  constructor() {
    // Force correct backend URL for all hosted environments
    const hostname = window.location.hostname;
    const isLocalhost = hostname.includes("localhost") || hostname.includes("127.0.0.1");

    if (isLocalhost) {
      this.apiBaseUrl = "http://localhost:3001/api";
    } else {
      // For all hosted environments, use production backend
      this.apiBaseUrl = "https://backend-vaxf.onrender.com/api";
    }

    this.loadPendingVerifications();
    this.loadProcessedVerifications();
    console.log("📱 CustomerVerificationService initialized");
  }

  public static getInstance(): CustomerVerificationService {
    if (!CustomerVerificationService.instance) {
      CustomerVerificationService.instance = new CustomerVerificationService();
    }
    return CustomerVerificationService.instance;
  }

  /**
   * Load processed verifications from localStorage
   */
  private loadProcessedVerifications(): void {
    try {
      const stored = localStorage.getItem(this.processedStorageKey);
      if (stored) {
        const processedIds = JSON.parse(stored);
        this.processedVerifications = new Set(processedIds);
        console.log(`📋 Loaded ${this.processedVerifications.size} processed verifications from localStorage`);
      }
    } catch (error) {
      console.error('❌ Error loading processed verifications:', error);
      this.processedVerifications = new Set();
    }
  }

  /**
   * Save processed verifications to localStorage
   */
  private saveProcessedVerifications(): void {
    try {
      const processedIds = Array.from(this.processedVerifications);
      localStorage.setItem(this.processedStorageKey, JSON.stringify(processedIds));
      console.log('💾 Processed verifications saved to localStorage');
    } catch (error) {
      console.error('❌ Error saving processed verifications:', error);
    }
  }

  /**
   * Load pending verifications from localStorage and backend
   */
  private loadPendingVerifications(): void {
    try {
      // Load from localStorage first
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const verifications = JSON.parse(stored);
        // Filter out expired verifications
        this.pendingVerifications = verifications.filter((v: PendingVerification) => {
          if (v.expiresAt && new Date(v.expiresAt) < new Date()) {
            return false;
          }
          return true;
        });
        console.log(`📋 Loaded ${this.pendingVerifications.length} pending verifications from localStorage`);
      }

      // Fetch from backend in background
      this.fetchPendingVerificationsFromBackend();
    } catch (error) {
      console.error('❌ Error loading pending verifications:', error);
      this.pendingVerifications = [];
    }
  }

  /**
   * Fetch pending verifications from backend API
   */
  private async fetchPendingVerificationsFromBackend(): Promise<void> {
    try {
      const authService = DVHostingSmsService.getInstance();
      const currentUser = authService.getCurrentUser();

      if (!currentUser || !currentUser.phone) {
        console.log('ℹ️ No authenticated user, skipping backend verification fetch');
        return;
      }

      const customerId = currentUser.phone.startsWith('user_') 
        ? currentUser.phone 
        : `user_${currentUser.phone}`;

      const response = await fetch(`${this.apiBaseUrl}/customer-verifications/${customerId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('cleancare_auth_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.verifications && data.verifications.length > 0) {
          console.log(`✅ Fetched ${data.verifications.length} pending verifications from backend`);

          // Filter out already processed verifications
          const unprocessedVerifications = data.verifications.filter((v: PendingVerification) =>
            !this.processedVerifications.has(v.id)
          );

          console.log(`📋 After filtering processed verifications: ${unprocessedVerifications.length} remaining`);

          // Merge with local verifications (backend takes precedence)
          const backendIds = new Set(unprocessedVerifications.map((v: PendingVerification) => v.id));
          const localOnly = this.pendingVerifications.filter(v => !backendIds.has(v.id));

          this.pendingVerifications = [...unprocessedVerifications, ...localOnly];
          this.savePendingVerifications();
        }
      } else {
        console.warn('⚠️ Failed to fetch verifications from backend:', response.status);
      }
    } catch (error) {
      console.warn('⚠️ Error fetching verifications from backend:', error);
      // Don't fail silently - keep using local data
    }
  }

  /**
   * Save pending verifications to localStorage
   */
  private savePendingVerifications(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.pendingVerifications));
      console.log('💾 Pending verifications saved to localStorage');
    } catch (error) {
      console.error('❌ Error saving pending verifications:', error);
    }
  }

  /**
   * Get all pending verifications for current user
   */
  public getPendingVerifications(): PendingVerification[] {
    // Remove expired and invalid verifications
    const now = new Date();
    this.pendingVerifications = this.pendingVerifications.filter(v => {
      // Check expiration
      if (v.expiresAt && new Date(v.expiresAt) < now) {
        return false;
      }

      // Check data structure validity
      if (!v.orderData ||
          !Array.isArray(v.orderData.originalItems) ||
          !Array.isArray(v.orderData.updatedItems)) {
        console.warn('🗑️ Removing invalid verification:', v.id);
        return false;
      }

      return true;
    });

    // Sort by priority and creation date
    return this.pendingVerifications.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] || 1;
      const bPriority = priorityOrder[b.priority] || 1;

      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }

      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); // Older first
    });
  }

  /**
   * Get the highest priority pending verification
   */
  public getNextPendingVerification(): PendingVerification | null {
    const pending = this.getPendingVerifications();
    return pending.length > 0 ? pending[0] : null;
  }

  /**
   * Check if there are any pending verifications
   */
  public hasPendingVerifications(): boolean {
    return this.getPendingVerifications().length > 0;
  }

  /**
   * Add a new pending verification (used by riders/system)
   */
  public addPendingVerification(verification: Omit<PendingVerification, 'id' | 'createdAt'>): string {
    const id = `verification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newVerification: PendingVerification = {
      ...verification,
      id,
      createdAt: new Date().toISOString(),
      expiresAt: verification.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours default
    };

    this.pendingVerifications.push(newVerification);
    this.savePendingVerifications();

    console.log('✅ Added new pending verification:', id);

    // Create a notification for the customer
    this.createVerificationNotification(newVerification);

    // Trigger verification event
    window.dispatchEvent(new CustomEvent('newVerificationPending', {
      detail: { verification: newVerification }
    }));

    return id;
  }

  /**
   * Create a notification for the customer about pending verification
   */
  private createVerificationNotification(verification: PendingVerification): void {
    try {
      // Create a browser notification if permission is granted
      if ('Notification' in window && Notification.permission === 'granted') {
        const notificationTitle = 'Order Changes Need Your Approval';
        const notificationBody = `Your rider has updated your order. Total: ₹${verification.orderData.updatedTotal}. Tap to review changes.`;

        const notification = new Notification(notificationTitle, {
          body: notificationBody,
          icon: '/laundrify-exact-icon.svg',
          tag: `verification-${verification.id}`,
          requireInteraction: true,
          data: {
            verificationId: verification.id,
            action: 'open_verification'
          }
        });

        // Handle notification click
        notification.onclick = () => {
          console.log('🔔 Verification notification clicked');
          // Trigger verification popup
          window.dispatchEvent(new CustomEvent('openVerificationPopup', {
            detail: { verification }
          }));
          notification.close();

          // Focus the window if needed
          if (window.focus) {
            window.focus();
          }
        };

        console.log('🔔 Browser notification created for verification:', verification.id);
      }

      // Also create an in-app notification (fallback)
      this.createInAppNotification(verification);

    } catch (error) {
      console.error('❌ Error creating verification notification:', error);
    }
  }

  /**
   * Create an in-app notification
   */
  private createInAppNotification(verification: PendingVerification): void {
    // Create a custom event for in-app notification
    window.dispatchEvent(new CustomEvent('showInAppNotification', {
      detail: {
        id: `verification-${verification.id}`,
        title: 'Order Changes Need Approval',
        message: `Your rider has updated your order (Total: ₹${verification.orderData.updatedTotal}). Tap to review changes.`,
        type: 'verification',
        priority: verification.priority,
        action: () => {
          window.dispatchEvent(new CustomEvent('openVerificationPopup', {
            detail: { verification }
          }));
        },
        verificationId: verification.id
      }
    }));
  }

  /**
   * Process verification response (approve/reject)
   */
  public async processVerification(verificationId: string, approved: boolean, reason?: string): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    try {
      const verification = this.pendingVerifications.find(v => v.id === verificationId);
      if (!verification) {
        return {
          success: false,
          message: 'Verification not found',
          error: 'VERIFICATION_NOT_FOUND'
        };
      }

      console.log(`🔄 Processing verification ${verificationId}: ${approved ? 'APPROVED' : 'REJECTED'}`);

      // Send to backend
      let backendSuccess = false;
      try {
        const response = await fetch(`${this.apiBaseUrl}/customer-verifications/${verificationId}/respond`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('cleancare_auth_token')}`,
          },
          body: JSON.stringify({
            approved,
            reason,
            orderId: verification.orderId,
            verificationId
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Verification response sent to backend:', result);
          backendSuccess = true;
        } else {
          console.warn('⚠️ Backend verification response failed:', response.status);
        }
      } catch (error) {
        console.warn('⚠️ Error sending verification response to backend:', error);
      }

      // Remove from pending list regardless of backend status
      this.pendingVerifications = this.pendingVerifications.filter(v => v.id !== verificationId);
      this.savePendingVerifications();

      // Track as processed to prevent re-showing (especially for rejected verifications)
      this.processedVerifications.add(verificationId);
      this.saveProcessedVerifications();

      // Trigger verification completed event
      window.dispatchEvent(new CustomEvent('verificationCompleted', {
        detail: { 
          verificationId, 
          approved, 
          verification,
          backendSuccess 
        }
      }));

      const message = approved 
        ? 'Order changes approved! The rider has been notified and can now complete the order.'
        : 'Order changes rejected. The rider will be informed to modify the order.';

      return {
        success: true,
        message
      };
    } catch (error) {
      console.error('❌ Error processing verification:', error);
      return {
        success: false,
        message: 'Failed to process verification. Please try again.',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Clear all pending verifications (for testing/admin)
   */
  public clearAllVerifications(): void {
    this.pendingVerifications = [];
    this.processedVerifications.clear();
    this.savePendingVerifications();
    this.saveProcessedVerifications();
    console.log('🗑️ All pending and processed verifications cleared');
  }

  /**
   * Create a custom verification with specific data (for demos)
   */
  public createCustomVerification(customData: Partial<PendingVerification>): string {
    const verificationId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    // Ensure orderData has required structure
    const defaultOrderData = {
      bookingId: `order-${Date.now()}`,
      customerName: 'Unknown Customer',
      customerPhone: '',
      address: '',
      pickupTime: '',
      riderName: '',
      updatedAt: new Date().toISOString(),
      status: 'pending',
      originalItems: [],
      updatedItems: [],
      originalTotal: 0,
      updatedTotal: 0,
      priceChange: 0,
      riderNotes: '',
      isQuickPickup: false
    };

    const verification: PendingVerification = {
      id: verificationId,
      orderId: customData.orderData?.bookingId || defaultOrderData.bookingId,
      orderData: { ...defaultOrderData, ...customData.orderData },
      type: customData.type || 'items_change',
      priority: customData.priority || 'medium',
      createdAt: new Date().toISOString(),
      expiresAt: customData.expiresAt || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    };

    this.pendingVerifications.push(verification);
    this.savePendingVerifications();

    console.log('🎭 Created custom verification:', verificationId);

    // Dispatch event for listeners
    const event = new CustomEvent('newVerificationPending', {
      detail: { verification }
    });
    window.dispatchEvent(event);

    return verificationId;
  }

  /**
   * Create a demo verification (for testing)
   */
  public createDemoVerification(): string {
    const demoOrderData = {
      bookingId: 'DEMO-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      customerName: 'Demo Customer',
      customerPhone: '+91 9999999999',
      address: 'Demo Address, Sector 123, Demo City',
      pickupTime: '2:00 PM - 4:00 PM',
      riderName: 'Demo Rider',
      updatedAt: new Date().toISOString(),
      status: 'pending',
      originalItems: [
        {
          id: '1',
          name: 'Shirt',
          price: 50,
          quantity: 2,
          total: 100,
          unit: 'PC'
        },
        {
          id: '2', 
          name: 'Trouser',
          price: 80,
          quantity: 1,
          total: 80,
          unit: 'PC'
        }
      ],
      updatedItems: [
        {
          id: '1',
          name: 'Shirt',
          price: 50,
          quantity: 3, // Increased quantity
          total: 150,
          unit: 'PC'
        },
        {
          id: '2',
          name: 'Trouser', 
          price: 80,
          quantity: 1,
          total: 80,
          unit: 'PC'
        },
        {
          id: '3',
          name: 'Jacket', // New item
          price: 120,
          quantity: 1,
          total: 120,
          unit: 'PC'
        }
      ],
      originalTotal: 180,
      updatedTotal: 350,
      priceChange: 170,
      riderNotes: 'Found additional items that need cleaning. Customer requested to add jacket and one more shirt.',
      isQuickPickup: false
    };

    return this.addPendingVerification({
      orderId: 'demo-order-' + Date.now(),
      orderData: demoOrderData,
      type: 'items_change',
      priority: 'high',
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours
    });
  }

  /**
   * Refresh verifications from backend
   */
  public async refreshVerifications(): Promise<void> {
    await this.fetchPendingVerificationsFromBackend();
  }
}

export default CustomerVerificationService;
