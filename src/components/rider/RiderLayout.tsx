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
  Activity
} from 'lucide-react';

interface RiderLayoutProps {
  children?: React.ReactNode;
}

export default function RiderLayout({ children }: RiderLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [rider, setRider] = React.useState<any>(null);

  React.useEffect(() => {
    // Check if rider is logged in
    const riderData = localStorage.getItem('riderAuth');
    if (riderData) {
      setRider(JSON.parse(riderData));
    } else if (location.pathname !== '/rider/register' && location.pathname !== '/rider/login') {
      navigate('/rider/login');
    }
  }, [navigate, location.pathname]);

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
