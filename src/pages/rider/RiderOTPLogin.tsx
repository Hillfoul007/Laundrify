import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Phone, Lock, LogIn, Timer } from 'lucide-react';
import { toast } from 'sonner';

// Helper function to get the correct API URL for rider endpoints
const getRiderApiUrl = (endpoint: string): string => {
  const isDev = import.meta.env.DEV;
  const hostname = window.location.hostname;
  const isLocalhost = hostname.includes("localhost") || hostname.includes("127.0.0.1");
  const isRenderCom = hostname.includes("onrender.com");
  const isLaundrifyDomain = hostname.includes("laundrify.online");

  if (isLocalhost && isDev) {
    return `/api/riders${endpoint}`;
  } else if (isRenderCom || isLaundrifyDomain || !isLocalhost) {
    const backendUrl = 'https://backend-vaxf.onrender.com/api/riders' + endpoint;
    return backendUrl;
  }

  return `/api/riders${endpoint}`;
};

export default function RiderOTPLogin() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOTP] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone.trim()) {
      toast.error('Please enter your phone number');
      return;
    }

    setIsLoading(true);

    try {
      const apiUrl = getRiderApiUrl('/request-otp');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: phone.trim() }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('OTP sent to your phone number');
        setStep('otp');
        
        // Start countdown timer
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        const error = await response.json();
        if (response.status === 404) {
          toast.error('Rider not found. Please register first.');
        } else if (response.status === 403) {
          toast.error(error.message || 'Account not approved by admin');
        } else {
          toast.error(error.message || 'Failed to send OTP');
        }
      }
    } catch (error) {
      console.error('Request OTP error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp.trim()) {
      toast.error('Please enter the OTP');
      return;
    }

    setIsLoading(true);

    try {
      const apiUrl = getRiderApiUrl('/verify-otp');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phone: phone.trim(), 
          otp: otp.trim() 
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Store authentication data
        localStorage.setItem('riderAuth', JSON.stringify(result.rider));
        localStorage.setItem('riderToken', result.token);

        toast.success('Login successful!');
        navigate('/rider/dashboard');
      } else {
        const error = await response.json();
        if (response.status === 400) {
          toast.error(error.message || 'Invalid OTP');
          if (error.attemptsRemaining) {
            toast.info(`${error.attemptsRemaining} attempts remaining`);
          }
        } else if (response.status === 404) {
          toast.error('Rider not found. Please register first.');
          setStep('phone');
        } else if (response.status === 403) {
          toast.error(error.message || 'Account not approved');
        } else {
          toast.error(error.message || 'Verification failed');
        }
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    
    setOTP('');
    await handleRequestOTP({ preventDefault: () => {} } as React.FormEvent);
  };

  return (
    <div className="space-y-6">
      {step === 'phone' ? (
        <form onSubmit={handleRequestOTP} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center space-x-2">
              <Phone className="h-4 w-4" />
              <span>Phone Number</span>
            </Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="Enter your phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              'Sending OTP...'
            ) : (
              <>
                <Phone className="h-4 w-4 mr-2" />
                Send OTP
              </>
            )}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp" className="flex items-center space-x-2">
              <Lock className="h-4 w-4" />
              <span>Enter OTP</span>
            </Label>
            <Input
              id="otp"
              name="otp"
              type="text"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              required
            />
            <p className="text-sm text-gray-600">
              OTP sent to {phone}
            </p>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              'Verifying...'
            ) : (
              <>
                <LogIn className="h-4 w-4 mr-2" />
                Verify & Login
              </>
            )}
          </Button>

          <div className="flex items-center justify-between text-sm">
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto"
              onClick={() => setStep('phone')}
            >
              Change phone number
            </Button>
            
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto"
              onClick={handleResendOTP}
              disabled={countdown > 0}
            >
              {countdown > 0 ? (
                <span className="flex items-center gap-1">
                  <Timer className="h-3 w-3" />
                  Resend in {countdown}s
                </span>
              ) : (
                'Resend OTP'
              )}
            </Button>
          </div>
        </form>
      )}

      <div className="bg-blue-50 p-3 rounded-lg">
        <p className="text-blue-900 text-sm font-medium mb-2">🚀 Rider System</p>
        <p className="text-blue-700 text-xs mb-2">
          <strong>Secure OTP Login:</strong> No passwords needed
        </p>
        <p className="text-blue-700 text-xs mb-2">
          <strong>Environment:</strong> {window.location.hostname}
        </p>
        
        {getRiderApiUrl('/request-otp').includes('backend-vaxf.onrender.com') ? (
          <div className="bg-green-50 p-2 rounded mt-2 border border-green-200">
            <p className="text-green-800 text-xs font-medium">✅ Production Backend</p>
            <p className="text-green-700 text-xs">
              OTP will be sent to your registered phone number.
            </p>
            <p className="text-red-700 text-xs">
              <strong>Note:</strong> Only approved riders can login.
            </p>
          </div>
        ) : import.meta.env.DEV ? (
          <div className="bg-green-50 p-2 rounded mt-2 border border-green-200">
            <p className="text-green-800 text-xs font-medium">✅ Development Mode</p>
            <p className="text-green-700 text-xs">
              OTP will be logged in console for testing.
            </p>
          </div>
        ) : (
          <p className="text-orange-700 text-xs">
            ⚠️ Production mode. Use registered phone number.
          </p>
        )}
      </div>
      
      <Alert>
        <AlertDescription>
          New to our platform? Register above to join our delivery team.
          Your account will be verified by our admin before you can start working.
        </AlertDescription>
      </Alert>
    </div>
  );
}
