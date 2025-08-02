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

  private constructor() {}

  public static getInstance(): CouponService {
    if (!CouponService.instance) {
      CouponService.instance = new CouponService();
    }
    return CouponService.instance;
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
        description: "30% off on first order (up to ₹200)",
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
        description: "10% off on first order",
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
   * Check if user is a first-time user
   */
  isFirstTimeUser(userId: string): boolean {
    if (!userId) return false;
    
    const existingBookings = JSON.parse(
      localStorage.getItem(`user_bookings_${userId}`) || "[]",
    );
    
    return existingBookings.length === 0;
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

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to mark coupon as used via backend:', response.status, errorText);
        // Fallback to local storage
        this.markCouponAsUsedLocal(couponCode, userId, orderAmount, discountAmount);
        return false;
      }

      const result = await response.json();

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

    console.log(`✅ Marked coupon ${couponCode} as used locally for user ${userId}`);
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

      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Coupon validation failed:', response.status, errorText);
        return { valid: false, error: errorText || 'Coupon validation failed' };
      }

      const result = await response.json();

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

    // Check first order restrictions
    if (coupon.isFirstOrder && !isFirstTime) {
      return { valid: false, error: "This coupon is valid for first orders only" };
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
