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
 * Ensure auth state is consistent - now using unified service
 */
export const syncAuthStorage = () => {
  const authService = UnifiedAuthService.getInstance();

  if (authService.isAuthenticated()) {
    authService.updateActivity();
    console.log("🔄 Unified auth storage synchronized");
  }
};
