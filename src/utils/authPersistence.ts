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
 * Now using unified approach - same for all devices
 */
export const restoreAuthState = async (): Promise<boolean> => {
  console.log("🔄 Restoring authentication state using unified service");

  // Use unified authentication restoration
  return await restoreUnifiedAuthState();
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
