/**
 * Centralized Environment Configuration
 * Single source of truth for all URLs and environment variables
 */

// Environment detection
export const isDevelopment = () => import.meta.env.DEV;
export const isProduction = () => import.meta.env.PROD;

// URL Configuration
const DEVELOPMENT_API_URL = "http://localhost:3001/api";
const PRODUCTION_API_URL = "https://backend-vaxf.onrender.com/api";

// Frontend URLs for CORS configuration
export const FRONTEND_URLS = {
  development: [
    "http://localhost:10000",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:10000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000"
  ],
  production: [
    "https://laundrify-app-5su7.onrender.com",
    "https://testversion.onrender.com", 
    "https://cleancarepro-1-p2oc.onrender.com",
    "https://cleancare-pro-production.up.railway.app",
    // Add Builder.io domains
    "https://*.builder.codes",
    "https://*.fly.dev",
    "https://*.vercel.app",
    "https://*.netlify.app"
  ]
};

// Backend URLs
export const BACKEND_URLS = {
  development: DEVELOPMENT_API_URL,
  production: PRODUCTION_API_URL
};

// Main API URL getter
export const getApiUrl = (): string => {
  // First check for explicit environment variable
  const envApiUrl = import.meta.env.VITE_API_BASE_URL;
  if (envApiUrl && envApiUrl.trim() !== "") {
    return envApiUrl.endsWith('/api') ? envApiUrl : `${envApiUrl}/api`;
  }

  // Detect environment based on hostname
  const hostname = window.location.hostname;
  const isLocalhost = hostname.includes("localhost") || hostname.includes("127.0.0.1");
  
  if (isLocalhost) {
    return DEVELOPMENT_API_URL;
  }

  return PRODUCTION_API_URL;
};

// Check if backend is available (for hosted environments)
export const shouldUseBackend = (): boolean => {
  const hostname = window.location.hostname;
  
  // Disable backend for certain hosted environments that don't have backend
  if (hostname.includes("fly.dev") && !hostname.includes("backend")) {
    return false;
  }
  
  return true;
};

// Environment variables
export const ENV_CONFIG = {
  // API Configuration
  API_URL: getApiUrl(),
  USE_BACKEND: shouldUseBackend(),
  
  // Authentication
  AUTH_TOKEN_KEY: "laundrify_token",
  USER_DATA_KEY: "laundrify_user",
  
  // Google Services
  GOOGLE_MAPS_API_KEY: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  
  // SMS Service
  DVHOSTING_API_KEY: import.meta.env.VITE_DVHOSTING_API_KEY,
  
  // App Settings
  APP_NAME: "Laundrify",
  APP_VERSION: "1.0.0",
  
  // Timeouts
  API_TIMEOUT: 30000, // 30 seconds
  OTP_TIMEOUT: 5 * 60 * 1000, // 5 minutes
  
  // Development flags
  DEBUG_MODE: isDevelopment(),
  ENABLE_LOGGING: isDevelopment()
};

// Helper functions
export const log = (...args: any[]) => {
  if (ENV_CONFIG.ENABLE_LOGGING) {
    console.log(...args);
  }
};

export const logError = (...args: any[]) => {
  console.error(...args);
};

export const getAuthHeaders = () => {
  const token = localStorage.getItem(ENV_CONFIG.AUTH_TOKEN_KEY) || localStorage.getItem("auth_token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Export as both 'config' and 'ENV_CONFIG' for compatibility
export const config = ENV_CONFIG;
export default ENV_CONFIG;
