/**
 * Centralized Rider API Configuration
 * Single source of truth for rider API endpoints
 */

import { getApiUrl, log } from '@/config/env';

/**
 * Get the complete URL for a rider API endpoint
 * Uses centralized API configuration instead of hardcoded URLs
 */
export const getRiderApiUrl = (endpoint: string): string => {
  const baseApiUrl = getApiUrl();
  
  // Ensure endpoint starts with /
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Construct the full URL
  const fullUrl = `${baseApiUrl}/riders${cleanEndpoint}`;
  
  log(`🏃‍♂️ Rider API URL: ${fullUrl}`);
  
  return fullUrl;
};

/**
 * Check if rider API is available
 * Tests connectivity to rider endpoints
 */
export const checkRiderApiHealth = async (): Promise<boolean> => {
  try {
    const healthUrl = getRiderApiUrl('/health');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
      // Don't send auth headers for health check
    });
    
    clearTimeout(timeoutId);
    
    const isHealthy = response.ok;
    log(`🏥 Rider API Health Check: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`, {
      url: healthUrl,
      status: response.status,
      statusText: response.statusText
    });
    
    return isHealthy;
  } catch (error) {
    log(`❌ Rider API Health Check Failed:`, error);
    return false;
  }
};

/**
 * Create authenticated headers for rider API requests
 */
export const getRiderAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('riderToken');
  
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

/**
 * Safe fetch wrapper for rider API calls
 * Includes timeout, error handling, and consistent headers
 */
export const riderApiFetch = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const url = getRiderApiUrl(endpoint);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getRiderAuthHeaders(),
        ...options.headers,
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

/**
 * Safely fetch data from rider API with error handling and demo mode fallback
 */
export const riderApiGet = async <T = any>(endpoint: string): Promise<T | null> => {
  try {
    const response = await riderApiFetch(endpoint, { method: 'GET' });

    if (!response.ok) {
      log(`❌ Rider API GET failed: ${response.status} ${response.statusText}`);

      // Try demo mode on API failures
      if (import.meta.env.DEV) {
        return await tryDemoMode<T>(endpoint);
      }

      return null;
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    log(`❌ Rider API GET error:`, error);

    // Fall back to demo mode on network errors
    if (import.meta.env.DEV) {
      log('🎭 Falling back to demo mode due to API error');
      return await tryDemoMode<T>(endpoint);
    }

    return null;
  }
};

/**
 * Try demo mode for specific endpoints
 */
const tryDemoMode = async <T = any>(endpoint: string): Promise<T | null> => {
  try {
    const { default: RiderDemoService } = await import('@/services/riderDemoService');
    const demoService = RiderDemoService.getInstance();

    // Map endpoints to demo service methods
    switch (endpoint) {
      case '/notifications/unread-count':
        return (await demoService.getUnreadNotificationCount()) as T;

      case '/notifications':
        return (await demoService.getNotifications(false)) as T;

      case '/notifications?includeRead=true':
        return (await demoService.getNotifications(true)) as T;

      case '/orders':
        return (await demoService.getOrders()) as T;

      case '/health':
        return { status: 'demo', message: 'Running in demo mode' } as T;

      default:
        log(`🎭 Demo mode: No handler for endpoint ${endpoint}`);
        return null;
    }
  } catch (demoError) {
    log(`❌ Demo mode failed:`, demoError);
    return null;
  }
};

export default {
  getRiderApiUrl,
  checkRiderApiHealth,
  getRiderAuthHeaders,
  riderApiFetch,
  riderApiGet
};
