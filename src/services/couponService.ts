/**
 * Comprehensive Coupon Management Service
 * Handles coupon validation, usage tracking, and restrictions
 */

export interface CouponData {
  code: string;
  discount: number;
  maxDiscount?: number;
  description: string;
  type: 'general' | 'referral' | 'first_order' | 'regular';
  isFirstOrder?: boolean;
  excludeFirstOrder?: boolean;
  isOneTimeUse?: boolean;
  minimumAmount?: number;
  isActive?: boolean;
}

export interface CouponUsage {
  code: string;
  userId: string;
  usedAt: string;
  orderAmount: number;
  discountAmount: number;
}

export class CouponService {
  private static instance: CouponService;
  private pendingValidations = new Map<string, Promise<any>>();
  private pendingMarkUsed = new Map<string, Promise<any>>();
  private apiHealthStatus: 'unknown' | 'healthy' | 'unhealthy' = 'unknown';
  private lastHealthCheck = 0;
  private healthCheckInterval = 60000; // 1 minute

  private constructor() {}

  public static getInstance(): CouponService {
    if (!CouponService.instance) {
      CouponService.instance = new CouponService();
    }
    return CouponService.instance;
  }

  /**
   * Check if the coupon API is healthy
   */
  private async checkApiHealth(): Promise<boolean> {
    const now = Date.now();

    // Only check health every minute to avoid spam
    if (now - this.lastHealthCheck < this.healthCheckInterval && this.apiHealthStatus !== 'unknown') {
      return this.apiHealthStatus === 'healthy';
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for health check

      const response = await fetch('/api/coupons/health', {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        this.apiHealthStatus = 'healthy';
        this.lastHealthCheck = now;
        return true;
      } else {
        this.apiHealthStatus = 'unhealthy';
        this.lastHealthCheck = now;
        console.warn(`⚠️ Coupon API health check failed: ${response.status}`);
        return false;
      }
    } catch (error) {
      this.apiHealthStatus = 'unhealthy';
      this.lastHealthCheck = now;
      console.warn('⚠️ Coupon API health check failed:', error.message);
      return false;
    }
  }

  /**
   * Get all available coupons
   */
  getAllCoupons(): CouponData[] {
    return [
      {
        code: "FIRST30",
        discount: 30,
        maxDiscount: 200,
        description: "30% off on first order only - one-time use (up to ₹200)",
        type: "first_order",
        isFirstOrder: true,
        isOneTimeUse: true,
        isActive: true,
      },
      {
        code: "NEW10",
        discount: 10,
        description: "10% off on all orders",
        type: "general",
        isActive: true,
      },
      {
        code: "FIRST10",
        discount: 10,
        description: "10% off on first order only - one-time use",
        type: "first_order",
        isFirstOrder: true,
        isOneTimeUse: true,
        isActive: true,
      },
      {
        code: "SAVE20",
        discount: 20,
        description: "20% off",
        type: "general",
        isActive: true,
      },
    ];
  }

  /**
   * Check if user is a first-time user (improved detection)
   */
  isFirstTimeUser(userId: string): boolean {
    if (!userId) return false;

    // Check multiple sources for booking history
    const existingBookings = JSON.parse(
      localStorage.getItem(`user_bookings_${userId}`) || "[]",
    );

    // Also check if user has used any first-order coupons before
    const usedCoupons = JSON.parse(
      localStorage.getItem(`used_coupons_${userId}`) || "[]",
    ) as CouponUsage[];

    const hasUsedFirstOrderCoupon = usedCoupons.some(coupon =>
      coupon.code === "FIRST30" || coupon.code === "FIRST10"
    );

    // Check if there's a flag indicating user has made an order
    const hasOrderHistory = localStorage.getItem(`has_ordered_${userId}`) === "true";

    console.log(`🔍 First-time user check for ${userId}:`, {
      existingBookings: existingBookings.length,
      hasUsedFirstOrderCoupon,
      hasOrderHistory,
      isFirstTime: existingBookings.length === 0 && !hasUsedFirstOrderCoupon && !hasOrderHistory
    });

    return existingBookings.length === 0 && !hasUsedFirstOrderCoupon && !hasOrderHistory;
  }

  /**
   * Check if user has already used a specific coupon
   */
  hasCouponBeenUsed(couponCode: string, userId: string): boolean {
    if (!userId) return false;
    
    const usedCoupons = JSON.parse(
      localStorage.getItem(`used_coupons_${userId}`) || "[]",
    ) as CouponUsage[];
    
    return usedCoupons.some(usage => usage.code === couponCode);
  }

  /**
   * Track coupon usage via backend API
   */
  async markCouponAsUsed(
    couponCode: string,
    userId: string,
    bookingId: string,
    orderAmount: number,
    discountAmount: number
  ): Promise<boolean> {
    if (!userId) return false;

    // Create a unique key for this mark-used request
    const requestKey = `${couponCode}_${userId}_${bookingId}`;

    // If there's already a pending mark-used for this exact request, return it
    if (this.pendingMarkUsed.has(requestKey)) {
      console.log(`🔄 Using pending mark-used for ${requestKey}`);
      return this.pendingMarkUsed.get(requestKey)!;
    }

    // Create the mark-used promise
    const markUsedPromise = this.performMarkUsed(couponCode, userId, bookingId, orderAmount, discountAmount);

    // Store it to prevent duplicates
    this.pendingMarkUsed.set(requestKey, markUsedPromise);

    // Clean up after completion
    markUsedPromise.finally(() => {
      this.pendingMarkUsed.delete(requestKey);
    });

    return markUsedPromise;
  }

  private async performMarkUsed(
    couponCode: string,
    userId: string,
    bookingId: string,
    orderAmount: number,
    discountAmount: number
  ): Promise<boolean> {
    // Check API health first
    const isApiHealthy = await this.checkApiHealth();
    if (!isApiHealthy) {
      console.log('🏥 Coupon API unhealthy, using local storage fallback');
      this.markCouponAsUsedLocal(couponCode, userId, orderAmount, discountAmount);
      return false;
    }

    try {
      const requestBody = JSON.stringify({
        couponCode,
        userId,
        bookingId,
        orderAmount,
        discountAmount,
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch('/api/coupons/mark-used', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle response based on content type
      let result;
      let errorText = '';

      if (!response.ok) {
        // Handle different types of server errors
        if (response.status === 500) {
          console.error('❌ Failed to mark coupon as used: Server error (500). Using local storage fallback.');
          this.markCouponAsUsedLocal(couponCode, userId, orderAmount, discountAmount);
          return false;
        }

        if (response.status === 404) {
          console.warn('⚠️ Coupon API endpoint not found (404). Using local storage fallback.');
          this.markCouponAsUsedLocal(couponCode, userId, orderAmount, discountAmount);
          return false;
        }

        if (response.status === 502 || response.status === 503 || response.status === 504) {
          console.warn('⚠️ Coupon service temporarily unavailable. Using local storage fallback.');
          this.markCouponAsUsedLocal(couponCode, userId, orderAmount, discountAmount);
          return false;
        }

        // Try to parse error response for other status codes
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            result = await response.json();
            errorText = result.message || result.error || `HTTP ${response.status}`;
          } else {
            errorText = await response.text();
            // Limit error text length to avoid showing HTML pages
            if (errorText.length > 200) {
              errorText = `HTTP ${response.status}: ${response.statusText}`;
            }
          }
        } catch (parseError) {
          errorText = `HTTP ${response.status}: ${response.statusText}`;
        }

        console.error('❌ Failed to mark coupon as used via backend:', response.status, errorText);
        // Fallback to local storage
        this.markCouponAsUsedLocal(couponCode, userId, orderAmount, discountAmount);
        return false;
      }

      // Response is ok, parse as JSON
      try {
        result = await response.json();
      } catch (parseError) {
        console.error('❌ Failed to parse success response as JSON:', parseError);
        // Fallback to local storage
        this.markCouponAsUsedLocal(couponCode, userId, orderAmount, discountAmount);
        return false;
      }

      if (result.success) {
        console.log(`✅ Marked coupon ${couponCode} as used for user ${userId} via backend`);
        // Also update localStorage as backup
        this.markCouponAsUsedLocal(couponCode, userId, orderAmount, discountAmount);
        return true;
      } else {
        console.error('❌ Failed to mark coupon as used via backend:', result.message);
        // Fallback to local storage
        this.markCouponAsUsedLocal(couponCode, userId, orderAmount, discountAmount);
        return false;
      }
    } catch (error) {
      console.error('❌ Error marking coupon as used:', error);

      // Handle specific error types
      if (error.name === 'AbortError') {
        console.warn('⏰ Mark coupon as used request timed out, using local storage');
      } else if (error.message?.includes('body stream already read')) {
        console.warn('⚠️ Body stream already read error, using local storage');
      }

      // Fallback to local storage
      this.markCouponAsUsedLocal(couponCode, userId, orderAmount, discountAmount);
      return false;
    }
  }

  /**
   * Local fallback for tracking coupon usage
   */
  private markCouponAsUsedLocal(
    couponCode: string,
    userId: string,
    orderAmount: number,
    discountAmount: number
  ): void {
    const usage: CouponUsage = {
      code: couponCode,
      userId,
      usedAt: new Date().toISOString(),
      orderAmount,
      discountAmount,
    };

    const existingUsages = JSON.parse(
      localStorage.getItem(`used_coupons_${userId}`) || "[]",
    ) as CouponUsage[];

    existingUsages.push(usage);
    localStorage.setItem(`used_coupons_${userId}`, JSON.stringify(existingUsages));

    // Mark user as having made an order (no longer first-time)
    localStorage.setItem(`has_ordered_${userId}`, "true");

    console.log(`✅ Marked coupon ${couponCode} as used locally for user ${userId} and set order history flag`);
  }

  /**
   * Validate a coupon for a specific user using backend API
   */
  async validateCoupon(
    couponCode: string,
    userId: string,
    orderAmount: number = 0
  ): Promise<{ valid: boolean; coupon?: CouponData; error?: string }> {
    if (!couponCode || !userId) {
      return { valid: false, error: "Invalid input" };
    }

    // Create a unique key for this validation request
    const requestKey = `${couponCode}_${userId}_${orderAmount}`;

    // If there's already a pending validation for this exact request, return it
    if (this.pendingValidations.has(requestKey)) {
      console.log(`🔄 Using pending validation for ${requestKey}`);
      return this.pendingValidations.get(requestKey)!;
    }

    // Create the validation promise
    const validationPromise = this.performValidation(couponCode, userId, orderAmount);

    // Store it to prevent duplicates
    this.pendingValidations.set(requestKey, validationPromise);

    // Clean up after completion
    validationPromise.finally(() => {
      this.pendingValidations.delete(requestKey);
    });

    return validationPromise;
  }

  private async performValidation(
    couponCode: string,
    userId: string,
    orderAmount: number = 0
  ): Promise<{ valid: boolean; coupon?: CouponData; error?: string }> {
    // Check API health first
    const isApiHealthy = await this.checkApiHealth();
    if (!isApiHealthy) {
      console.log('🏥 Coupon API unhealthy, using local validation');
      return this.validateCouponLocal(couponCode, userId, orderAmount);
    }

    try {
      const requestBody = JSON.stringify({
        couponCode,
        userId,
        orderAmount,
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle response based on content type
      let result;
      let errorText = '';

      if (!response.ok) {
        // Handle different types of server errors
        if (response.status === 500) {
          console.error('❌ Coupon validation failed: Server error (500). Using local validation fallback.');
          return this.validateCouponLocal(couponCode, userId, orderAmount);
        }

        if (response.status === 404) {
          console.warn('⚠️ Coupon API endpoint not found (404). Using local validation fallback.');
          return this.validateCouponLocal(couponCode, userId, orderAmount);
        }

        if (response.status === 502 || response.status === 503 || response.status === 504) {
          console.warn('⚠️ Coupon service temporarily unavailable. Using local validation fallback.');
          return this.validateCouponLocal(couponCode, userId, orderAmount);
        }

        // Try to parse error response for other status codes
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            result = await response.json();
            errorText = result.message || result.error || `HTTP ${response.status}`;
          } else {
            errorText = await response.text();
            // Limit error text length to avoid showing HTML pages
            if (errorText.length > 200) {
              errorText = `HTTP ${response.status}: ${response.statusText}`;
            }
          }
        } catch (parseError) {
          errorText = `HTTP ${response.status}: ${response.statusText}`;
        }

        console.error('❌ Coupon validation failed:', response.status, errorText);
        return { valid: false, error: errorText || 'Coupon validation failed' };
      }

      // Response is ok, parse as JSON
      try {
        result = await response.json();
      } catch (parseError) {
        console.error('❌ Failed to parse success response as JSON:', parseError);
        return { valid: false, error: 'Failed to parse server response' };
      }

      return {
        valid: result.success,
        coupon: result.coupon,
        error: result.success ? undefined : result.message
      };
    } catch (error) {
      console.error('❌ Error validating coupon:', error);

      // Handle specific error types
      if (error.name === 'AbortError') {
        console.warn('⏰ Coupon validation request timed out, using local validation');
      } else if (error.message?.includes('body stream already read')) {
        console.warn('⚠️ Body stream already read error, using local validation');
      }

      // Fallback to local validation if backend is unavailable
      return this.validateCouponLocal(couponCode, userId, orderAmount);
    }
  }

  /**
   * Local fallback validation method
   */
  private validateCouponLocal(
    couponCode: string,
    userId: string,
    orderAmount: number = 0
  ): { valid: boolean; coupon?: CouponData; error?: string } {
    const coupons = this.getAllCoupons();
    const coupon = coupons.find(c => c.code.toLowerCase() === couponCode.toLowerCase());

    if (!coupon) {
      return { valid: false, error: `Invalid coupon code: ${couponCode}` };
    }

    if (!coupon.isActive) {
      return { valid: false, error: "This coupon is no longer active" };
    }

    const isFirstTime = this.isFirstTimeUser(userId);
    const hasBeenUsed = this.hasCouponBeenUsed(coupon.code, userId);

    // Check if it's a one-time use coupon and has been used
    if (coupon.isOneTimeUse && hasBeenUsed) {
      return { valid: false, error: "This coupon has already been used" };
    }

    // Check first order restrictions (more strict)
    if (coupon.isFirstOrder && !isFirstTime) {
      return { valid: false, error: "This coupon is valid for first orders only" };
    }

    // Additional check for specific first-time coupons with more explicit messages
    if ((coupon.code === "FIRST30" || coupon.code === "FIRST10") && !isFirstTime) {
      return {
        valid: false,
        error: `${coupon.code} is a first-order only coupon and can only be used once on your very first order`
      };
    }

    // Check exclude first order restrictions
    if (coupon.excludeFirstOrder && isFirstTime) {
      return { valid: false, error: "This coupon is not valid for first orders" };
    }

    // Check minimum amount if specified
    if (coupon.minimumAmount && orderAmount < coupon.minimumAmount) {
      return {
        valid: false,
        error: `Minimum order amount of ₹${coupon.minimumAmount} required`
      };
    }

    return { valid: true, coupon };
  }

  /**
   * Calculate discount amount for a coupon
   */
  calculateDiscount(coupon: CouponData, orderAmount: number): number {
    if (!coupon || orderAmount <= 0) return 0;
    
    const discountAmount = Math.round(orderAmount * (coupon.discount / 100));
    
    if (coupon.maxDiscount) {
      return Math.min(discountAmount, coupon.maxDiscount);
    }
    
    return discountAmount;
  }

  /**
   * Get available coupons for a specific user (async version)
   */
  async getAvailableCouponsForUser(userId: string, orderAmount: number = 0): Promise<CouponData[]> {
    if (!userId) return [];

    const allCoupons = this.getAllCoupons();
    const availableCoupons: CouponData[] = [];

    for (const coupon of allCoupons) {
      const validation = await this.validateCoupon(coupon.code, userId, orderAmount);
      if (validation.valid) {
        availableCoupons.push(coupon);
      }
    }

    return availableCoupons;
  }

  /**
   * Get available coupons for a specific user (sync version using local validation only)
   */
  getAvailableCouponsForUserLocal(userId: string, orderAmount: number = 0): CouponData[] {
    if (!userId) return [];

    const allCoupons = this.getAllCoupons();
    const availableCoupons: CouponData[] = [];

    for (const coupon of allCoupons) {
      const validation = this.validateCouponLocal(coupon.code, userId, orderAmount);
      if (validation.valid) {
        availableCoupons.push(coupon);
      }
    }

    return availableCoupons;
  }

  /**
   * Get coupon usage history for a user
   */
  getCouponUsageHistory(userId: string): CouponUsage[] {
    if (!userId) return [];
    
    return JSON.parse(
      localStorage.getItem(`used_coupons_${userId}`) || "[]",
    ) as CouponUsage[];
  }

  /**
   * Clear all coupon usage data (for testing)
   */
  clearCouponUsageData(userId: string): void {
    if (!userId) return;
    
    localStorage.removeItem(`used_coupons_${userId}`);
    console.log(`🧹 Cleared coupon usage data for user ${userId}`);
  }
}
