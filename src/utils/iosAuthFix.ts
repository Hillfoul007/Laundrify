/**
 * DEPRECATED: iOS-Specific Authentication Fixes
 * 
 * This file has been deprecated and replaced with unified authentication.
 * All the iOS-specific workarounds have been removed in favor of consistent
 * authentication behavior across all devices.
 * 
 * New unified authentication is handled by:
 * - src/services/unifiedAuthService.ts
 * - src/utils/unifiedAuthPersistence.ts
 * 
 * DO NOT USE FUNCTIONS FROM THIS FILE - they are deprecated.
 */

// Deprecated functions - kept for backwards compatibility but do nothing
export const clearIosAuthState = (): void => {
  console.warn('⚠️ clearIosAuthState is deprecated. Use UnifiedAuthService.logout() instead.');
};

export const addIosNoCacheHeaders = (fetchOptions: RequestInit = {}): RequestInit => {
  console.warn('⚠️ addIosNoCacheHeaders is deprecated. Cache headers are now unified across all devices.');
  return {
    ...fetchOptions,
    headers: {
      ...fetchOptions.headers,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  };
};

export const isIosDevice = (): boolean => {
  console.warn('⚠️ isIosDevice is deprecated. Device detection no longer affects authentication behavior.');
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
};

export const isPWAMode = (): boolean => {
  console.warn('⚠️ isPWAMode is deprecated. PWA detection no longer affects authentication behavior.');
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes("android-app://") ||
    window.location.search.includes("pwa=true")
  );
};

export const isIosPWA = (): boolean => {
  console.warn('⚠️ isIosPWA is deprecated. PWA detection no longer affects authentication behavior.');
  return isIosDevice() && isPWAMode();
};

export const addIosOtpDelay = async (): Promise<void> => {
  console.warn('⚠️ addIosOtpDelay is deprecated. OTP timing is now unified across all devices.');
  // No delay needed - unified authentication handles timing consistently
};

export const preventIosAutoLogout = (): void => {
  console.warn('⚠️ preventIosAutoLogout is deprecated. Logout prevention is now unified across all devices via UnifiedAuthService.');
  // Do nothing - unified auth handles this
};

export const restoreIosAuth = async (): Promise<boolean> => {
  console.warn('⚠️ restoreIosAuth is deprecated. Use UnifiedAuthService.initialize() instead.');
  return false; // Let unified auth handle restoration
};

export const saveIosAuthToIndexedDB = async (user: any, token: string): Promise<void> => {
  console.warn('⚠️ saveIosAuthToIndexedDB is deprecated. Auth persistence is now unified via UnifiedCacheService.');
  // Do nothing - unified cache handles this
};

export const restoreIosAuthFromIndexedDB = async (): Promise<boolean> => {
  console.warn('⚠️ restoreIosAuthFromIndexedDB is deprecated. Auth restoration is now unified via UnifiedAuthService.');
  return false; // Let unified auth handle restoration
};

console.warn(`
🚨 DEPRECATION NOTICE 🚨

The iOS-specific authentication workarounds in this file have been deprecated.
The app now uses unified authentication that works consistently across all devices:

- iOS and Android now have identical authentication behavior
- No more device-specific cache handling
- No more iOS-specific session restoration
- Errors will occur consistently across all platforms

Migration Guide:
✅ Replace isIosDevice() checks with unified logic
✅ Use UnifiedAuthService instead of device-specific auth
✅ Use UnifiedCacheService instead of iOS-specific cache
✅ Remove any iOS-specific error handling

This ensures that if there's an authentication error, it happens on both iOS and Android,
providing a consistent user experience across all platforms.
`);
