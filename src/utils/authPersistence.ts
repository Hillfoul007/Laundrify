/**
 * Authentication persistence utility - Now using unified approach
 * Same behavior across all devices and platforms
 */

import {
  initializeUnifiedAuthPersistence,
  restoreUnifiedAuthState
} from "@/utils/unifiedAuthPersistence";
import UnifiedAuthService from "@/services/unifiedAuthService";

let authCheckInitialized = false;

export const initializeAuthPersistence = () => {
  if (authCheckInitialized) return;
  authCheckInitialized = true;

  console.log("🔐 Initializing unified authentication persistence (no device-specific logic)");

  // Use unified authentication persistence - same for all devices
  initializeUnifiedAuthPersistence();

  console.log("✅ Unified authentication persistence initialized");
};

/**
 * Check and restore authentication state on app startup
 */
export const restoreAuthState = async (): Promise<boolean> => {
  try {
    const authService = DVHostingSmsService.getInstance();

    // First try iPhone-specific restoration if on iOS
    if (isIosDevice()) {
      const iosRestored = await restoreIosAuth();
      if (iosRestored) {
        console.log("🍎 iPhone auth restored from backup");
      }
    }

    // Check multiple storage locations for auth data
    const token =
      localStorage.getItem("auth_token") ||
      localStorage.getItem("cleancare_auth_token");
    const userStr =
      localStorage.getItem("current_user") ||
      localStorage.getItem("cleancare_user");

    if (!token || !userStr) {
      console.log("ℹ️ No authentication data found");
      return false;
    }

    let user;
    try {
      user = JSON.parse(userStr);
    } catch {
      console.warn("⚠️ Corrupted user data found - attempting recovery");
      // Don't auto-logout, try to preserve what we can
      return false;
    }

    if (!user || (!user.phone && !user.id && !user._id)) {
      console.warn("⚠️ Invalid user data found - attempting recovery");

      // Try to rebuild user data from available info
      const phone = user?.phone || user?.mobile || "";
      const name = user?.name || user?.full_name || user?.displayName || "User";

      if (phone) {
        // Rebuild minimal user object to prevent logout
        const rebuiltUser = {
          phone,
          name,
          id: user?.id || user?._id || phone,
          _id: user?._id || user?.id || phone,
          ...user,
        };

        authService.setCurrentUser(rebuiltUser, token);
        console.log("🔧 Rebuilt user data to prevent logout:", { phone, name });
        return true;
      }

      // Don't auto-logout, try to preserve what we can
      return false;
    }

    // Restore user session
    authService.setCurrentUser(user, token);
    console.log("✅ Authentication state restored:", {
      phone: user.phone,
      name: user.name,
      hasToken: !!token,
    });

    // Try to sync with backend (but never fail if it doesn't work)
    try {
      await authService.restoreSession();
      console.log("✅ Backend session synchronized");
    } catch (error) {
      console.warn(
        "⚠️ Backend sync failed, continuing with local auth:",
        error,
      );
      // Continue anyway - local auth is sufficient
    }

    return true;
  } catch (error) {
    console.error("❌ Error restoring auth state:", error);
    // Never fail completely - preserve user sessions
    console.warn("🔒 Continuing with existing auth state");
    return false;
  }
};

/**
 * Ensure auth state is consistent across all storage keys
 */
export const syncAuthStorage = () => {
  const authService = DVHostingSmsService.getInstance();
  const user = authService.getCurrentUser();

  if (user) {
    // Ensure all storage keys are in sync
    const token =
      localStorage.getItem("auth_token") ||
      localStorage.getItem("cleancare_auth_token");
    if (token) {
      authService.setCurrentUser(user, token);
      console.log("🔄 Auth storage synchronized");
    }
  }
};
