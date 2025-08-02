/**
 * Unified Authentication Service
 * 
 * This service provides consistent authentication behavior across all devices and platforms.
 * No iOS-specific workarounds or Android-specific logic - everything works the same way.
 */

export interface UnifiedUser {
  _id?: string;
  id?: string;
  phone: string;
  name: string;
  email?: string;
  createdAt?: Date;
  updatedAt?: Date;
  isVerified?: boolean;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user?: UnifiedUser;
    token?: string;
  };
  error?: any;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UnifiedUser | null;
  token: string | null;
  lastActivity: number;
}

export class UnifiedAuthService {
  private static instance: UnifiedAuthService;
  private apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";
  
  // Unified storage keys - no device-specific variations
  private readonly STORAGE_KEYS = {
    USER: 'unified_user',
    TOKEN: 'unified_auth_token',
    LAST_ACTIVITY: 'unified_last_activity',
    SESSION_DATA: 'unified_session_data'
  };

  // Session timeout: 24 hours for all devices
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000;

  public static getInstance(): UnifiedAuthService {
    if (!UnifiedAuthService.instance) {
      UnifiedAuthService.instance = new UnifiedAuthService();
    }
    return UnifiedAuthService.instance;
  }

  /**
   * Initialize authentication state on app startup
   * Works consistently across all platforms
   */
  async initialize(): Promise<void> {
    console.log('🔐 Initializing unified authentication service');
    
    // Migrate from old storage keys if they exist
    this.migrateOldAuthData();
    
    // Restore session if valid
    const restored = await this.restoreSession();
    if (restored) {
      console.log('✅ Session restored successfully');
    } else {
      console.log('ℹ️ No valid session found');
    }

    // Set up session monitoring (same interval for all devices)
    this.setupSessionMonitoring();
  }

  /**
   * Send OTP to phone number
   * Same behavior for all devices - no special iOS handling
   */
  async sendOTP(phone: string): Promise<AuthResponse> {
    try {
      console.log('📱 Sending OTP to:', phone);

      const cleanPhone = this.cleanPhoneNumber(phone);
      
      if (!this.isValidIndianPhone(cleanPhone)) {
        return {
          success: false,
          message: "Please enter a valid Indian phone number (10 digits starting with 6-9)"
        };
      }

      const response = await fetch(`${this.apiBaseUrl}/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          // Consistent cache headers for all devices
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({ phone: cleanPhone })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message: errorData.message || `Server error: ${response.status}`,
          error: errorData
        };
      }

      const data = await response.json();
      
      // Store OTP session data (same way for all devices)
      this.setOTPSession(cleanPhone);
      
      return {
        success: true,
        message: "OTP sent successfully to your phone",
        data: { user: undefined, token: undefined }
      };

    } catch (error: any) {
      console.error('❌ OTP send error:', error);
      return {
        success: false,
        message: "Failed to send OTP. Please try again.",
        error: error.message
      };
    }
  }

  /**
   * Verify OTP and authenticate user
   * Consistent behavior across all platforms
   */
  async verifyOTP(otp: string, name?: string): Promise<AuthResponse> {
    try {
      console.log('🔐 Verifying OTP:', otp);

      const otpSession = this.getOTPSession();
      if (!otpSession.phone) {
        return {
          success: false,
          message: "Phone number not found. Please request OTP again."
        };
      }

      if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
        return {
          success: false,
          message: "Please enter a valid 6-digit OTP"
        };
      }

      const response = await fetch(`${this.apiBaseUrl}/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          // Consistent cache headers for all devices
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({
          phone: otpSession.phone,
          otp,
          name: name || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message: errorData.message || `Verification failed: ${response.status}`,
          error: errorData
        };
      }

      const data = await response.json();
      
      if (data.success && data.data?.user && data.data?.token) {
        // Store authentication data (same way for all devices)
        await this.setAuthState(data.data.user, data.data.token);
        this.clearOTPSession();
        
        console.log('✅ User authenticated successfully');
        return {
          success: true,
          message: "Authentication successful",
          data: data.data
        };
      }

      return {
        success: false,
        message: "Invalid response from server"
      };

    } catch (error: any) {
      console.error('❌ OTP verification error:', error);
      return {
        success: false,
        message: "Failed to verify OTP. Please try again.",
        error: error.message
      };
    }
  }

  /**
   * Get current authentication state
   * Same behavior for all devices
   */
  getAuthState(): AuthState {
    const user = this.getStoredUser();
    const token = this.getStoredToken();
    const lastActivity = this.getLastActivity();
    
    return {
      isAuthenticated: !!(user && token),
      user,
      token,
      lastActivity
    };
  }

  /**
   * Check if user is authenticated
   * Consistent logic for all platforms
   */
  isAuthenticated(): boolean {
    const authState = this.getAuthState();
    
    if (!authState.user || !authState.token) {
      return false;
    }

    // Check session timeout (same for all devices)
    const timeSinceLastActivity = Date.now() - authState.lastActivity;
    if (timeSinceLastActivity > this.SESSION_TIMEOUT) {
      console.log('⏰ Session expired, logging out');
      this.logout();
      return false;
    }

    return true;
  }

  /**
   * Get current user
   */
  getCurrentUser(): UnifiedUser | null {
    if (!this.isAuthenticated()) {
      return null;
    }
    return this.getStoredUser();
  }

  /**
   * Get auth token
   */
  getAuthToken(): string | null {
    if (!this.isAuthenticated()) {
      return null;
    }
    return this.getStoredToken();
  }

  /**
   * Logout user
   * Same behavior for all devices - clear everything
   */
  logout(): void {
    console.log('👋 Logging out user');

    // Clear all auth data
    localStorage.removeItem(this.STORAGE_KEYS.USER);
    localStorage.removeItem(this.STORAGE_KEYS.TOKEN);
    localStorage.removeItem(this.STORAGE_KEYS.LAST_ACTIVITY);
    localStorage.removeItem(this.STORAGE_KEYS.SESSION_DATA);
    
    // Clear OTP session
    this.clearOTPSession();
    
    // Clear legacy auth data if any
    this.clearLegacyAuthData();
    
    // Emit logout event
    window.dispatchEvent(new CustomEvent('unified-auth-logout'));
    
    console.log('✅ Authentication data cleared');
  }

  /**
   * Update user activity timestamp
   * Called on user interactions to keep session alive
   */
  updateActivity(): void {
    if (this.isAuthenticated()) {
      localStorage.setItem(this.STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString());
    }
  }

  /**
   * Restore session from storage
   * Works the same way for all devices
   */
  private async restoreSession(): Promise<boolean> {
    try {
      const user = this.getStoredUser();
      const token = this.getStoredToken();
      const lastActivity = this.getLastActivity();

      if (!user || !token) {
        return false;
      }

      // Check if session is still valid
      const timeSinceLastActivity = Date.now() - lastActivity;
      if (timeSinceLastActivity > this.SESSION_TIMEOUT) {
        console.log('⏰ Stored session expired, clearing data');
        this.logout();
        return false;
      }

      // Update activity timestamp
      this.updateActivity();
      
      console.log('✅ Session restored for user:', user.phone);
      return true;

    } catch (error) {
      console.error('❌ Error restoring session:', error);
      return false;
    }
  }

  /**
   * Set authentication state
   * Consistent storage for all platforms
   */
  private async setAuthState(user: UnifiedUser, token: string): Promise<void> {
    const now = Date.now();
    
    localStorage.setItem(this.STORAGE_KEYS.USER, JSON.stringify(user));
    localStorage.setItem(this.STORAGE_KEYS.TOKEN, token);
    localStorage.setItem(this.STORAGE_KEYS.LAST_ACTIVITY, now.toString());
    
    // Store session data for redundancy
    const sessionData = {
      user,
      token,
      timestamp: now
    };
    localStorage.setItem(this.STORAGE_KEYS.SESSION_DATA, JSON.stringify(sessionData));
    
    console.log('💾 Auth state saved for user:', user.phone);
  }

  /**
   * Get stored user data
   */
  private getStoredUser(): UnifiedUser | null {
    try {
      const userStr = localStorage.getItem(this.STORAGE_KEYS.USER);
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('❌ Error parsing user data:', error);
      return null;
    }
  }

  /**
   * Get stored auth token
   */
  private getStoredToken(): string | null {
    return localStorage.getItem(this.STORAGE_KEYS.TOKEN);
  }

  /**
   * Get last activity timestamp
   */
  private getLastActivity(): number {
    const timestamp = localStorage.getItem(this.STORAGE_KEYS.LAST_ACTIVITY);
    return timestamp ? parseInt(timestamp) : 0;
  }

  /**
   * Set OTP session data
   */
  private setOTPSession(phone: string): void {
    const otpData = {
      phone,
      timestamp: Date.now()
    };
    sessionStorage.setItem('unified_otp_session', JSON.stringify(otpData));
  }

  /**
   * Get OTP session data
   */
  private getOTPSession(): { phone: string | null; timestamp: number } {
    try {
      const otpStr = sessionStorage.getItem('unified_otp_session');
      if (otpStr) {
        const otpData = JSON.parse(otpStr);
        
        // Check if OTP session is still valid (10 minutes)
        const timeDiff = Date.now() - otpData.timestamp;
        if (timeDiff <= 10 * 60 * 1000) {
          return { phone: otpData.phone, timestamp: otpData.timestamp };
        } else {
          this.clearOTPSession();
        }
      }
    } catch (error) {
      console.error('❌ Error parsing OTP session:', error);
    }
    
    return { phone: null, timestamp: 0 };
  }

  /**
   * Clear OTP session data
   */
  private clearOTPSession(): void {
    sessionStorage.removeItem('unified_otp_session');
  }

  /**
   * Setup session monitoring
   * Same interval for all devices
   */
  private setupSessionMonitoring(): void {
    // Monitor session every 30 seconds (same for all devices)
    setInterval(() => {
      if (this.isAuthenticated()) {
        // Session is valid, no action needed
      }
    }, 30000);

    // Update activity on user interactions
    const events = ['click', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, () => this.updateActivity(), { passive: true });
    });

    console.log('⏰ Session monitoring initialized');
  }

  /**
   * Migrate old authentication data to unified format
   */
  private migrateOldAuthData(): void {
    const oldKeys = [
      'current_user', 'cleancare_user', 'user_data', 'authenticated_user',
      'auth_token', 'cleancare_auth_token'
    ];

    const userData = this.findUserInOldStorage(oldKeys);
    const tokenData = this.findTokenInOldStorage(oldKeys);

    if (userData && tokenData && !this.getStoredUser()) {
      console.log('🔄 Migrating old auth data to unified format');
      this.setAuthState(userData, tokenData);
    }

    // Clear old keys to prevent conflicts
    oldKeys.forEach(key => localStorage.removeItem(key));
  }

  /**
   * Find user data in old storage keys
   */
  private findUserInOldStorage(keys: string[]): UnifiedUser | null {
    for (const key of keys) {
      if (key.includes('user')) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            if (parsed && (parsed._id || parsed.id || parsed.phone)) {
              return parsed;
            }
          }
        } catch (error) {
          // Ignore parsing errors
        }
      }
    }
    return null;
  }

  /**
   * Find token in old storage keys
   */
  private findTokenInOldStorage(keys: string[]): string | null {
    for (const key of keys) {
      if (key.includes('token')) {
        const token = localStorage.getItem(key);
        if (token) {
          return token;
        }
      }
    }
    return null;
  }

  /**
   * Clear all legacy authentication data
   */
  private clearLegacyAuthData(): void {
    const legacyKeys = [
      'current_user', 'cleancare_user', 'user_data', 'authenticated_user',
      'auth_token', 'cleancare_auth_token', 'auth_last_active',
      'ios_backup_user', 'ios_backup_token', 'ios_auth_timestamp',
      'otp_phone', 'otp_timestamp', 'ios_session_user', 'ios_session_token'
    ];

    legacyKeys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    // Clear any iOS cookies
    try {
      document.cookie = 'ios_auth_backup=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    } catch (error) {
      // Ignore cookie errors
    }
  }

  /**
   * Clean phone number
   */
  private cleanPhoneNumber(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  /**
   * Validate Indian phone number
   */
  private isValidIndianPhone(phone: string): boolean {
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length === 10) {
      return /^[6-9]\d{9}$/.test(cleanPhone);
    } else if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
      return /^91[6-9]\d{9}$/.test(cleanPhone);
    }
    
    return false;
  }
}

export default UnifiedAuthService;
