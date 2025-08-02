/**
 * Unified Authentication Persistence
 * 
 * Replaces all device-specific authentication logic with unified behavior.
 * No iOS workarounds, no Android-specific handling - same for all platforms.
 */

import UnifiedAuthService from '@/services/unifiedAuthService';
import UnifiedCacheService, { CACHE_NAMESPACES, CACHE_TTL } from '@/services/unifiedCacheService';

let authPersistenceInitialized = false;

/**
 * Initialize unified authentication persistence
 * Same behavior across all devices
 */
export const initializeUnifiedAuthPersistence = (): void => {
  if (authPersistenceInitialized) return;
  authPersistenceInitialized = true;

  console.log('🔐 Initializing unified authentication persistence');

  const authService = UnifiedAuthService.getInstance();
  const cacheService = UnifiedCacheService.getInstance();

  // Initialize auth service
  authService.initialize();

  // Handle page visibility changes consistently
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // User returned to the tab - update activity
      if (authService.isAuthenticated()) {
        authService.updateActivity();
        console.log('✅ User returned to tab - activity updated');
        
        // Cache user activity
        cacheService.set('last_activity', Date.now(), {
          namespace: CACHE_NAMESPACES.AUTH,
          ttl: CACHE_TTL.HOUR,
          persistent: true
        });
      }
    }
  });

  // Handle storage events for cross-tab synchronization
  window.addEventListener('storage', (event) => {
    // Only listen for unified auth storage changes
    if (event.key && event.key.includes('unified_')) {
      console.log('🔄 Unified auth storage change detected');
      
      if (event.key.includes('unified_user') || event.key.includes('unified_auth_token')) {
        if (event.newValue === null) {
          // User logged out in another tab
          console.log('🚪 User logged out in another tab');
          window.dispatchEvent(new CustomEvent('unified-auth-logout'));
        } else if (event.oldValue === null && event.newValue) {
          // User logged in in another tab
          console.log('🎉 User logged in in another tab');
          window.dispatchEvent(new CustomEvent('unified-auth-login', {
            detail: { user: authService.getCurrentUser() }
          }));
        }
      }
    }
  });

  // Handle page unload - preserve auth state
  const handleBeforeUnload = () => {
    const user = authService.getCurrentUser();
    if (user) {
      console.log('💾 Preserving auth state before page unload');
      authService.updateActivity();
      
      // Cache auth state
      cacheService.set('auth_state', authService.getAuthState(), {
        namespace: CACHE_NAMESPACES.AUTH,
        ttl: CACHE_TTL.DAY,
        persistent: true
      });
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  window.addEventListener('pagehide', handleBeforeUnload);

  // Set up unified session heartbeat (same for all devices)
  setupUnifiedSessionHeartbeat(authService, cacheService);

  // Handle auth events
  setupUnifiedAuthEventHandlers();

  console.log('✅ Unified authentication persistence initialized');
};

/**
 * Setup unified session heartbeat
 * Same interval and behavior for all devices
 */
const setupUnifiedSessionHeartbeat = (
  authService: UnifiedAuthService,
  cacheService: UnifiedCacheService
): void => {
  // Heartbeat every 5 minutes (same for all devices)
  const heartbeatInterval = setInterval(() => {
    if (authService.isAuthenticated()) {
      authService.updateActivity();
      
      // Update cache timestamp
      cacheService.set('session_heartbeat', Date.now(), {
        namespace: CACHE_NAMESPACES.AUTH,
        ttl: CACHE_TTL.HOUR,
        persistent: true
      });
      
      console.log('💓 Session heartbeat - activity updated');
    } else {
      // No active session, stop heartbeat
      clearInterval(heartbeatInterval);
      console.log('⏹️ Session heartbeat stopped - no active session');
    }
  }, 5 * 60 * 1000);

  // Clear heartbeat on page unload
  window.addEventListener('beforeunload', () => {
    clearInterval(heartbeatInterval);
  });

  console.log('💓 Unified session heartbeat started');
};

/**
 * Setup unified auth event handlers
 * Same behavior for all devices
 */
const setupUnifiedAuthEventHandlers = (): void => {
  // Update activity on user interactions (same events for all devices)
  const interactionEvents = ['click', 'keypress', 'scroll', 'touchstart', 'mousemove'];
  
  const throttledActivityUpdate = throttle(() => {
    const authService = UnifiedAuthService.getInstance();
    if (authService.isAuthenticated()) {
      authService.updateActivity();
    }
  }, 30000); // Throttle to once per 30 seconds

  interactionEvents.forEach(event => {
    document.addEventListener(event, throttledActivityUpdate, { passive: true });
  });

  // Handle auth state changes
  window.addEventListener('unified-auth-login', (event: any) => {
    console.log('🎉 Unified auth login event:', event.detail);
    
    // Clear any cached error states
    const cacheService = UnifiedCacheService.getInstance();
    cacheService.clearNamespace('errors');
    
    // Cache login event
    cacheService.set('last_login', Date.now(), {
      namespace: CACHE_NAMESPACES.AUTH,
      ttl: CACHE_TTL.DAY,
      persistent: true
    });
  });

  window.addEventListener('unified-auth-logout', () => {
    console.log('👋 Unified auth logout event');
    
    // Clear auth-related cache
    const cacheService = UnifiedCacheService.getInstance();
    cacheService.clearNamespace(CACHE_NAMESPACES.AUTH);
    cacheService.clearNamespace(CACHE_NAMESPACES.USER);
    
    // Clear any form states
    clearFormStates();
  });

  console.log('📡 Unified auth event handlers setup');
};

/**
 * Restore unified authentication state on app startup
 * Same logic for all devices
 */
export const restoreUnifiedAuthState = async (): Promise<boolean> => {
  console.log('🔄 Restoring unified authentication state');
  
  try {
    const authService = UnifiedAuthService.getInstance();
    const cacheService = UnifiedCacheService.getInstance();
    
    // Check if we have a valid session
    if (authService.isAuthenticated()) {
      const user = authService.getCurrentUser();
      console.log('✅ Unified auth state restored for user:', user?.phone);
      
      // Cache restored session info
      cacheService.set('session_restored', {
        timestamp: Date.now(),
        userPhone: user?.phone,
        restored: true
      }, {
        namespace: CACHE_NAMESPACES.AUTH,
        ttl: CACHE_TTL.HOUR,
        persistent: true
      });
      
      return true;
    }
    
    console.log('ℹ️ No valid unified auth session found');
    return false;
    
  } catch (error) {
    console.error('❌ Error restoring unified auth state:', error);
    
    // Cache error info for debugging
    const cacheService = UnifiedCacheService.getInstance();
    cacheService.set('auth_restore_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    }, {
      namespace: CACHE_NAMESPACES.AUTH,
      ttl: CACHE_TTL.HOUR
    });
    
    return false;
  }
};

/**
 * Validate unified authentication consistency
 * Same validation for all devices
 */
export const validateUnifiedAuthConsistency = (): boolean => {
  const authService = UnifiedAuthService.getInstance();
  const authState = authService.getAuthState();
  
  // Check that authentication state is consistent
  const hasUser = !!authState.user;
  const hasToken = !!authState.token;
  const isAuthenticated = authService.isAuthenticated();
  
  const isConsistent = (hasUser && hasToken && isAuthenticated) || (!hasUser && !hasToken && !isAuthenticated);
  
  if (!isConsistent) {
    console.warn('⚠️ Unified auth state inconsistency detected:', {
      hasUser,
      hasToken,
      isAuthenticated,
      authState
    });
    
    // Try to fix inconsistency
    if (!isAuthenticated && (hasUser || hasToken)) {
      console.log('🔧 Clearing inconsistent auth state');
      authService.logout();
    }
  }
  
  return isConsistent;
};

/**
 * Clear all unified authentication data
 * Emergency function - same for all devices
 */
export const clearUnifiedAuthData = (): void => {
  console.log('🧹 Clearing all unified authentication data');
  
  const authService = UnifiedAuthService.getInstance();
  const cacheService = UnifiedCacheService.getInstance();
  
  // Logout user
  authService.logout();
  
  // Clear auth-related cache
  cacheService.clearNamespace(CACHE_NAMESPACES.AUTH);
  cacheService.clearNamespace(CACHE_NAMESPACES.USER);
  
  // Clear form states
  clearFormStates();
  
  console.log('✅ All unified authentication data cleared');
};

/**
 * Get unified authentication debug info
 * Same debug info for all devices
 */
export const getUnifiedAuthDebugInfo = (): object => {
  const authService = UnifiedAuthService.getInstance();
  const cacheService = UnifiedCacheService.getInstance();
  
  return {
    timestamp: new Date().toISOString(),
    authState: authService.getAuthState(),
    isAuthenticated: authService.isAuthenticated(),
    cacheStats: cacheService.getStats(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    storage: {
      localStorage: Object.keys(localStorage).filter(key => key.includes('unified')),
      sessionStorage: Object.keys(sessionStorage).filter(key => key.includes('unified'))
    }
  };
};

/**
 * Clear form states
 */
const clearFormStates = (): void => {
  const formStateKeys = [
    'checkout_form_state',
    'address_flow_state', 
    'laundry_booking_form',
    'booking_form_data',
    'user_profile_form'
  ];
  
  formStateKeys.forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
  
  console.log('🗑️ Form states cleared');
};

/**
 * Throttle function to limit execution frequency
 */
const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastExecTime = 0;
  
  return (...args: Parameters<T>) => {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
};

/**
 * Setup periodic validation
 * Same interval for all devices
 */
export const setupUnifiedAuthValidation = (): void => {
  // Validate auth consistency every 30 seconds
  setInterval(() => {
    validateUnifiedAuthConsistency();
  }, 30000);
  
  console.log('✅ Unified auth validation setup');
};

// Initialize on module load if in browser environment
if (typeof window !== 'undefined') {
  // Auto-initialize when module is imported
  setTimeout(() => {
    initializeUnifiedAuthPersistence();
    setupUnifiedAuthValidation();
  }, 100);
}
