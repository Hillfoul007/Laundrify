import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Phone, Lock, LogIn } from 'lucide-react';
import { toast } from 'sonner';

// Helper function to get the correct API URL for rider endpoints
const getRiderApiUrl = (endpoint: string): string => {
  const hostname = window.location.hostname;
  const isLocalhost = hostname.includes("localhost") || hostname.includes("127.0.0.1");
  const isDevelopment = import.meta.env.DEV;

  // For development mode (including fly.dev preview), always try to use local backend
  if (isDevelopment || isLocalhost) {
    return `/api/riders${endpoint}`;
  } else {
    // For true production environments
    return `/api/riders${endpoint}`;
  }
};

export default function RiderLogin() {
  const [credentials, setCredentials] = useState({
    phone: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!credentials.phone || !credentials.password) {
      toast.error('Please fill all fields');
      return;
    }

    setIsLoading(true);

    try {
      const apiUrl = getRiderApiUrl('/login');
      console.log('🔍 Rider Login Debug:', {
        hostname: window.location.hostname,
        isDev: import.meta.env.DEV,
        apiUrl,
        credentials: { phone: credentials.phone, password: '[REDACTED]' }
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      console.log('🔍 Rider Login Response:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.rider.status === 'approved') {
          localStorage.setItem('riderAuth', JSON.stringify(result.rider));
          localStorage.setItem('riderToken', result.token);
          toast.success('Login successful!');
          navigate('/rider/dashboard');
        } else if (result.rider.status === 'pending') {
          toast.error('Your account is still pending approval from admin');
        } else if (result.rider.status === 'rejected') {
          toast.error('Your account has been rejected. Please contact admin.');
        }
      } else {
        if (response.status === 404) {
          toast.error('Rider system is not available on this server. Please use local development environment.');
          return;
        }
        try {
          const error = await response.json();
          toast.error(error.message || 'Login failed');
        } catch (e) {
          toast.error('Login failed - Server error');
        }
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
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
            value={credentials.phone}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="flex items-center space-x-2">
            <Lock className="h-4 w-4" />
            <span>Password</span>
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Enter your password"
            value={credentials.password}
            onChange={handleInputChange}
            required
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            'Logging in...'
          ) : (
            <>
              <LogIn className="h-4 w-4 mr-2" />
              Login
            </>
          )}
        </Button>
      </form>
      
      <Alert>
        <AlertDescription>
          New to our platform? Register above to join our delivery team.
          Your account will be verified by our admin before you can start working.
        </AlertDescription>
      </Alert>
    </div>
  );
}
