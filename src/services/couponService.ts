interface CouponData {
  code: string;
  discount: number;
  maxDiscount: number;
  description: string;
  isFirstOrderOnly: boolean;
  isActive: boolean;
}

interface CouponUsage {
  code: string;
  userId: string;
  usedAt: string;
  orderAmount: number;
  discountAmount: number;
}

export class CouponService {
  private static instance: CouponService;

  public static getInstance(): CouponService {
    if (!CouponService.instance) {
      CouponService.instance = new CouponService();
    }
    return CouponService.instance;
  }

  // Get all available coupons
  getAllCoupons(): CouponData[] {
    return [
      {
        code: "FIRST30",
        discount: 30,
        maxDiscount: 200,
        description: "30% off for first order only (up to ₹200)",
        isFirstOrderOnly: true,
        isActive: true,
      },
      {
        code: "NEW10",
        discount: 10,
        maxDiscount: 200,
        description: "10% off on all orders (up to ₹200)",
        isFirstOrderOnly: false,
        isActive: true,
      },
    ];
  }

  // Check if user is a first-time user
  isFirstTimeUser(userId: string): boolean {
    if (!userId) return false;
    
    // Check if user has any existing bookings
    const existingBookings = JSON.parse(
      localStorage.getItem(`user_bookings_${userId}`) || "[]",
    );

    // Check if user has used any first-order coupons before
    const usedCoupons = JSON.parse(
      localStorage.getItem(`used_coupons_${userId}`) || "[]",
    ) as CouponUsage[];

    const hasUsedFirstOrderCoupon = usedCoupons.some(coupon =>
      coupon.code === "FIRST30"
    );

    return existingBookings.length === 0 && !hasUsedFirstOrderCoupon;
  }

  // Check if user has already used a specific coupon
  hasCouponBeenUsed(couponCode: string, userId: string): boolean {
    if (!userId) return false;
    
    const usedCoupons = JSON.parse(
      localStorage.getItem(`used_coupons_${userId}`) || "[]",
    ) as CouponUsage[];
    
    return usedCoupons.some(usage => usage.code === couponCode);
  }

  // Validate a coupon for a specific user
  validateCoupon(
    couponCode: string,
    userId: string,
    orderAmount: number = 0
  ): { valid: boolean; coupon?: CouponData; error?: string } {
    if (!couponCode || !userId) {
      return { valid: false, error: "Invalid input" };
    }

    const coupons = this.getAllCoupons();
    const coupon = coupons.find(c => c.code.toLowerCase() === couponCode.toLowerCase());

    if (!coupon) {
      return { valid: false, error: `Invalid coupon code: ${couponCode}` };
    }

    if (!coupon.isActive) {
      return { valid: false, error: "This coupon is no longer active" };
    }

    const isFirstTime = this.isFirstTimeUser(userId);

    // Check first order restrictions
    if (coupon.isFirstOrderOnly && !isFirstTime) {
      return { valid: false, error: "This coupon is valid for first orders only" };
    }

    // For FIRST30, check if it's been used before
    if (coupon.code === "FIRST30" && this.hasCouponBeenUsed(coupon.code, userId)) {
      return { valid: false, error: "This coupon has already been used" };
    }

    return { valid: true, coupon };
  }

  // Calculate discount amount
  calculateDiscount(subtotal: number, coupon: CouponData): number {
    const discountAmount = Math.round(
      subtotal * (coupon.discount / 100),
    );
    return Math.min(discountAmount, coupon.maxDiscount);
  }

  // Mark coupon as used
  markCouponAsUsed(
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
}
