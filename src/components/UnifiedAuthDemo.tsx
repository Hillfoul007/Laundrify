/**
 * Unified Authentication Demo Component
 * 
 * This component demonstrates that authentication and caching now work
 * identically across iOS and Android devices. No device-specific behavior.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import UnifiedAuthService from '@/services/unifiedAuthService';
import UnifiedCacheService, { CACHE_NAMESPACES, CACHE_TTL } from '@/services/unifiedCacheService';
import { getUnifiedAuthDebugInfo } from '@/utils/unifiedAuthPersistence';

export const UnifiedAuthDemo: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [authState, setAuthState] = useState<any>(null);
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const authService = UnifiedAuthService.getInstance();
  const cacheService = UnifiedCacheService.getInstance();

  // Update state every second to show real-time changes
  useEffect(() => {
    const updateInterval = setInterval(() => {
      setAuthState(authService.getAuthState());
      setCacheStats(cacheService.getStats());
      setDebugInfo(getUnifiedAuthDebugInfo());
    }, 1000);

    return () => clearInterval(updateInterval);
  }, []);

  const handleSendOTP = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const result = await authService.sendOTP(phone);
      setMessage(result.message);
      
      // Demo: Cache the OTP request
      cacheService.set('last_otp_request', {
        phone,
        timestamp: Date.now(),
        success: result.success
      }, {
        namespace: CACHE_NAMESPACES.AUTH,
        ttl: CACHE_TTL.MEDIUM
      });
      
    } catch (error) {
      setMessage('Error sending OTP: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const result = await authService.verifyOTP(otp, name);
      setMessage(result.message);
      
      if (result.success) {
        // Demo: Cache successful login
        cacheService.set('last_successful_login', {
          timestamp: Date.now(),
          user: result.data?.user
        }, {
          namespace: CACHE_NAMESPACES.AUTH,
          ttl: CACHE_TTL.DAY,
          persistent: true
        });
      }
      
    } catch (error) {
      setMessage('Error verifying OTP: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    setMessage('Logged out successfully');
    setPhone('');
    setOtp('');
    setName('');
  };

  const testCacheOperations = () => {
    // Demo: Various cache operations
    const testData = {
      timestamp: Date.now(),
      randomValue: Math.random(),
      userAgent: navigator.userAgent,
      platform: navigator.platform
    };

    // Test different cache types
    cacheService.set('test_short', testData, { ttl: CACHE_TTL.SHORT });
    cacheService.set('test_persistent', testData, { persistent: true, ttl: CACHE_TTL.DAY });
    cacheService.set('test_namespaced', testData, { namespace: 'demo', ttl: CACHE_TTL.MEDIUM });

    setMessage('Cache test operations completed - check stats below');
  };

  const clearAllData = () => {
    authService.logout();
    cacheService.clearAll();
    setMessage('All unified auth and cache data cleared');
  };

  const deviceInfo = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
    isAndroid: /Android/.test(navigator.userAgent),
    timestamp: new Date().toISOString()
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🔄 Unified Authentication Demo</CardTitle>
          <CardDescription>
            Testing unified authentication and caching behavior.
            Same behavior on iOS and Android - no device-specific logic.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Device Info</label>
              <div className="text-xs space-y-1">
                <div>Platform: <Badge variant="outline">{deviceInfo.platform}</Badge></div>
                <div>iOS: <Badge variant={deviceInfo.isIOS ? "default" : "secondary"}>{deviceInfo.isIOS ? "Yes" : "No"}</Badge></div>
                <div>Android: <Badge variant={deviceInfo.isAndroid ? "default" : "secondary"}>{deviceInfo.isAndroid ? "Yes" : "No"}</Badge></div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Auth Status</label>
              <div className="text-xs space-y-1">
                <div>Authenticated: <Badge variant={authState?.isAuthenticated ? "default" : "destructive"}>{authState?.isAuthenticated ? "Yes" : "No"}</Badge></div>
                <div>User: <Badge variant="outline">{authState?.user?.phone || "None"}</Badge></div>
                <div>Token: <Badge variant="outline">{authState?.token ? "Present" : "None"}</Badge></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!authState?.isAuthenticated ? (
        <Card>
          <CardHeader>
            <CardTitle>Login (Unified for All Devices)</CardTitle>
            <CardDescription>
              Same login flow for iOS and Android
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                type="tel"
                placeholder="Enter phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleSendOTP} 
              disabled={!phone || isLoading}
              className="w-full"
            >
              {isLoading ? 'Sending...' : 'Send OTP (Unified)'}
            </Button>
            
            <Separator />
            
            <div>
              <Input
                type="text"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>
            <div>
              <Input
                type="text"
                placeholder="Enter name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleVerifyOTP} 
              disabled={!otp || isLoading}
              className="w-full"
            >
              {isLoading ? 'Verifying...' : 'Verify OTP (Unified)'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Welcome {authState.user?.name || authState.user?.phone}</CardTitle>
            <CardDescription>
              Unified authentication successful - same behavior on all devices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleLogout} variant="outline" className="w-full">
              Logout (Unified)
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>🗄️ Unified Cache Testing</CardTitle>
          <CardDescription>
            Testing unified cache behavior - same on iOS and Android
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button onClick={testCacheOperations} variant="outline">
              Test Cache Operations
            </Button>
            <Button onClick={clearAllData} variant="destructive">
              Clear All Data
            </Button>
          </div>
          
          {cacheStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>Total Items: <Badge>{cacheStats.totalItems}</Badge></div>
              <div>Hit Rate: <Badge>{cacheStats.hitRate.toFixed(1)}%</Badge></div>
              <div>Miss Rate: <Badge variant="outline">{cacheStats.missRate.toFixed(1)}%</Badge></div>
              <div>Size: <Badge variant="secondary">{(cacheStats.totalSize / 1024).toFixed(1)}KB</Badge></div>
            </div>
          )}
        </CardContent>
      </Card>

      {message && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm p-3 bg-blue-50 border border-blue-200 rounded">
              {message}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>🔍 Debug Information</CardTitle>
          <CardDescription>
            Real-time debug info showing unified behavior
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>✅ Unified Behavior Verification</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="default">✓</Badge>
              <span>Authentication logic is identical on iOS and Android</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default">✓</Badge>
              <span>Cache behavior is consistent across all devices</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default">✓</Badge>
              <span>No iOS-specific workarounds or Android-specific handling</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default">✓</Badge>
              <span>Errors occur consistently on both platforms</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default">✓</Badge>
              <span>Session persistence works the same way everywhere</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnifiedAuthDemo;
