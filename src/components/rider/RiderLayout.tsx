import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  User,
  MapPin,
  Package,
  LogOut,
  Shield,
  Activity,
  Bell
} from 'lucide-react';

interface RiderLayoutProps {
  children?: React.ReactNode;
}

export default function RiderLayout({ children }: RiderLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [rider, setRider] = React.useState<any>(null);
  const [unreadCount, setUnreadCount] = React.useState<number>(0);

  React.useEffect(() => {
    // Check if rider is logged in
    const riderData = localStorage.getItem('riderAuth');
    if (riderData) {
      setRider(JSON.parse(riderData));
      fetchUnreadCount();
    } else if (location.pathname !== '/rider/register' && location.pathname !== '/rider/login') {
      navigate('/rider/login');
    }
  }, [navigate, location.pathname]);

  React.useEffect(() => {
    if (rider) {
      // Fetch unread count every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [rider]);

  const getRiderApiUrl = (endpoint: string): string => {
    const isDev = import.meta.env.DEV;
    const hostname = window.location.hostname;
    const isLocalhost = hostname.includes("localhost") || hostname.includes("127.0.0.1");
    const isRenderCom = hostname.includes("onrender.com");
    const isLaundrifyDomain = hostname.includes("laundrify.online");

    if (isLocalhost && isDev) {
      return `/api/riders${endpoint}`;
    } else if (isRenderCom || isLaundrifyDomain || !isLocalhost) {
      return `https://backend-vaxf.onrender.com/api/riders${endpoint}`;
    }

    return `/api/riders${endpoint}`;
  };

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('riderToken');
      if (!token) return;

      const apiUrl = getRiderApiUrl('/notifications/unread-count');
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('riderAuth');
    setRider(null);
    navigate('/rider/login');
  };

  const isActive = location.pathname;

  return (
    <div className="min-h-screen bg-gray-50">
      {rider && (
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <Shield className="h-8 w-8 text-laundrify-purple" />
                <h1 className="text-xl font-bold text-gray-900">Rider Portal</h1>
              </div>
              
              <nav className="hidden md:flex space-x-4">
                <Button
                  variant={isActive === '/rider/dashboard' ? 'default' : 'ghost'}
                  onClick={() => navigate('/rider/dashboard')}
                  className="flex items-center space-x-2"
                >
                  <Activity className="h-4 w-4" />
                  <span>Dashboard</span>
                </Button>
                
                <Button
                  variant={isActive === '/rider/orders' ? 'default' : 'ghost'}
                  onClick={() => navigate('/rider/orders')}
                  className="flex items-center space-x-2"
                >
                  <Package className="h-4 w-4" />
                  <span>Orders</span>
                </Button>

                <Button
                  variant={isActive === '/rider/notifications' ? 'default' : 'ghost'}
                  onClick={() => {
                    navigate('/rider/notifications');
                    setUnreadCount(0); // Reset count when navigating to notifications
                  }}
                  className="flex items-center space-x-2 relative"
                >
                  <Bell className="h-4 w-4" />
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>

                <Button
                  variant={isActive === '/rider/profile' ? 'default' : 'ghost'}
                  onClick={() => navigate('/rider/profile')}
                  className="flex items-center space-x-2"
                >
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </Button>
              </nav>

              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  Welcome, {rider.name}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center space-x-1"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </Button>
              </div>
            </div>
          </div>
        </header>
      )}

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children || <Outlet />}
      </main>
    </div>
  );
}
