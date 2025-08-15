const crypto = require('crypto');

// Simple in-memory OTP storage (in production, use Redis or database)
const otpStore = new Map();
const OTP_EXPIRY_TIME = 10 * 60 * 1000; // 10 minutes

class OTPService {
  // Generate 6-digit OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Store OTP with expiry
  storeOTP(phone, otp, purpose = 'login') {
    const key = `${phone}_${purpose}`;
    const expiryTime = Date.now() + OTP_EXPIRY_TIME;
    
    otpStore.set(key, {
      otp,
      expiryTime,
      attempts: 0,
      maxAttempts: 5
    });

    console.log(`🔐 OTP stored for ${phone} (${purpose}): ${otp} [Expires: ${new Date(expiryTime).toLocaleTimeString()}]`);
    
    // Auto cleanup after expiry
    setTimeout(() => {
      otpStore.delete(key);
      console.log(`🗑️ OTP expired and cleaned up for ${phone} (${purpose})`);
    }, OTP_EXPIRY_TIME);
  }

  // Verify OTP
  verifyOTP(phone, providedOTP, purpose = 'login') {
    const key = `${phone}_${purpose}`;
    const otpData = otpStore.get(key);

    if (!otpData) {
      console.log(`❌ No OTP found for ${phone} (${purpose})`);
      return { success: false, error: 'OTP not found or expired' };
    }

    if (Date.now() > otpData.expiryTime) {
      otpStore.delete(key);
      console.log(`⏰ OTP expired for ${phone} (${purpose})`);
      return { success: false, error: 'OTP has expired' };
    }

    if (otpData.attempts >= otpData.maxAttempts) {
      otpStore.delete(key);
      console.log(`🚫 Max attempts exceeded for ${phone} (${purpose})`);
      return { success: false, error: 'Maximum verification attempts exceeded' };
    }

    if (otpData.otp !== providedOTP) {
      otpData.attempts++;
      otpStore.set(key, otpData);
      console.log(`❌ Invalid OTP for ${phone} (${purpose}). Attempts: ${otpData.attempts}/${otpData.maxAttempts}`);
      return { 
        success: false, 
        error: 'Invalid OTP',
        attemptsRemaining: otpData.maxAttempts - otpData.attempts
      };
    }

    // OTP verified successfully
    otpStore.delete(key);
    console.log(`✅ OTP verified successfully for ${phone} (${purpose})`);
    return { success: true };
  }

  // Send OTP via SMS (mock implementation for now)
  async sendOTP(phone, otp, purpose = 'login') {
    try {
      // In development, just log the OTP
      if (process.env.NODE_ENV !== 'production') {
        console.log(`📱 [DEV] SMS to ${phone}: Your Laundrify ${purpose} OTP is: ${otp}. Valid for 10 minutes.`);
        return { success: true, message: 'OTP sent successfully (dev mode)' };
      }

      // TODO: Integrate with actual SMS service (Twilio, AWS SNS, etc.)
      // For now, return success
      console.log(`📱 [PROD] SMS sent to ${phone} for ${purpose}`);
      return { success: true, message: 'OTP sent successfully' };
    } catch (error) {
      console.error(`❌ Failed to send OTP to ${phone}:`, error);
      return { success: false, error: 'Failed to send OTP' };
    }
  }

  // Clear all OTPs for a phone number
  clearOTPs(phone) {
    const keys = Array.from(otpStore.keys()).filter(key => key.startsWith(phone));
    keys.forEach(key => otpStore.delete(key));
    console.log(`🧹 Cleared all OTPs for ${phone}`);
  }

  // Get OTP status (for debugging)
  getOTPStatus(phone, purpose = 'login') {
    const key = `${phone}_${purpose}`;
    const otpData = otpStore.get(key);
    
    if (!otpData) {
      return { exists: false };
    }

    return {
      exists: true,
      expiresAt: new Date(otpData.expiryTime),
      attempts: otpData.attempts,
      maxAttempts: otpData.maxAttempts,
      timeRemaining: Math.max(0, otpData.expiryTime - Date.now())
    };
  }
}

module.exports = new OTPService();
