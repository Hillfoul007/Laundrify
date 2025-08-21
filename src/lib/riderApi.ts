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
 * Safely fetch data from rider API with error handling
 */
export const riderApiGet = async <T = any>(endpoint: string): Promise<T | null> => {
  try {
    const response = await riderApiFetch(endpoint, { method: 'GET' });
    
    if (!response.ok) {
      log(`❌ Rider API GET failed: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    return data as T;
  } catch (error) {
    log(`❌ Rider API GET error:`, error);
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
