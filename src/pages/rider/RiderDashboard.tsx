import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Activity,
  Package,
  MapPin,
  Clock,
  User,
  Phone,
  Navigation,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import RiderLayout from '@/components/rider/RiderLayout';
import RiderNotifications from '@/components/rider/RiderNotifications';

// Helper function to get the correct API URL for rider endpoints
const getRiderApiUrl = (endpoint: string): string => {
  const isDev = import.meta.env.DEV;
  const hostname = window.location.hostname;
  const isLocalhost = hostname.includes("localhost") || hostname.includes("127.0.0.1");
  const isRenderCom = hostname.includes("onrender.com");
  const isLaundrifyDomain = hostname.includes("laundrify.online");

  console.log('🔍 Rider API URL Detection:', {
    isDev,
    hostname,
    isLocalhost,
    isRenderCom,
    isLaundrifyDomain,
    mode: import.meta.env.MODE,
    origin: window.location.origin,
    endpoint
  });

  // Force correct backend URL based on environment
  if (isLocalhost && isDev) {
    // Local development - use proxy
    console.log('🏠 Using local proxy for rider API');
    return `/api/riders${endpoint}`;
  } else if (isRenderCom || isLaundrifyDomain || !isLocalhost) {
    // Any hosted environment - use backend server
    const backendUrl = 'https://backend-vaxf.onrender.com/api/riders' + endpoint;
    console.log('🌐 Using backend server for rider API:', backendUrl);
    return backendUrl;
  }

  // Fallback
  return `/api/riders${endpoint}`;
};

export default function RiderDashboard() {
  const [rider, setRider] = useState<any>(null);
  const [isActive, setIsActive] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [assignedOrders, setAssignedOrders] = useState<any[]>([]);
  const [locationWatcher, setLocationWatcher] = useState<number | null>(null);

  useEffect(() => {
    // Load rider data
    const riderData = localStorage.getItem('riderAuth');
    if (riderData) {
      const riderInfo = JSON.parse(riderData);
      setRider(riderInfo);
      setIsActive(riderInfo.isActive || false);
    }
    
    // Load assigned orders
    fetchAssignedOrders();
  }, []);

  useEffect(() => {
    if (isActive) {
      startLocationTracking();
    } else {
      stopLocationTracking();
    }
    
    return () => {
      if (locationWatcher) {
        navigator.geolocation.clearWatch(locationWatcher);
      }
    };
  }, [isActive]);

  const startLocationTracking = () => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(location);
          
          // Send location to backend
          updateLocationOnServer(location);
        },
        (error) => {
          console.error('Location error:', error);
          toast.error('Location access required for active status');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        }
      );
      setLocationWatcher(watchId);
    }
  };

  const stopLocationTracking = () => {
    if (locationWatcher) {
      navigator.geolocation.clearWatch(locationWatcher);
      setLocationWatcher(null);
    }
  };

  const updateLocationOnServer = async (location: {lat: number, lng: number}) => {
    try {
      const token = localStorage.getItem('riderToken');
      const apiUrl = getRiderApiUrl('/location');
      console.log('🔍 Updating location:', apiUrl);

      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          riderId: rider?._id,
          location,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to update location:', error);
    }
  };

  const toggleActiveStatus = async () => {
    if (!isActive && !currentLocation) {
      // Request location permission first
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      } catch (error) {
        toast.error('Location access is required to go active');
        return;
      }
    }

    try {
      const token = localStorage.getItem('riderToken');
      const apiUrl = getRiderApiUrl('/toggle-status');
      console.log('🔍 Toggling status:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          riderId: rider?._id,
          isActive: !isActive,
          location: currentLocation
        })
      });

      if (response.ok) {
        setIsActive(!isActive);
        const updatedRider = { ...rider, isActive: !isActive };
        setRider(updatedRider);
        localStorage.setItem('riderAuth', JSON.stringify(updatedRider));
        
        toast.success(`You are now ${!isActive ? 'active' : 'inactive'}`);
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    }
  };

  const fetchAssignedOrders = async () => {
    try {
      const token = localStorage.getItem('riderToken');
      const apiUrl = getRiderApiUrl('/orders');
      console.log('🔍 Fetching assigned orders:', apiUrl);

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const orders = await response.json();
        console.log(`📋 Fetched ${orders.length} assigned orders for rider`);
        setAssignedOrders(orders);
      } else {
        console.error('Failed to fetch assigned orders:', response.status);
        setAssignedOrders([]);
      }
    } catch (error) {
      console.error('Failed to fetch assigned orders:', error);
      setAssignedOrders([]);
    }
  };

  const handleOrderAction = async (orderId: string, action: 'accept' | 'start' | 'complete') => {
    console.log('🚀 handleOrderAction called', {
      orderId,
      action,
      rider: rider ? { id: rider._id, status: rider.status, name: rider.name } : null,
      isActive,
      timestamp: new Date().toISOString()
    });

    try {
      // Validate rider status first
      if (!rider) {
        console.error('❌ No rider data found');
        toast.error('Rider information not found. Please login again.');
        return;
      }

      console.log('✅ Rider validation:', {
        status: rider.status,
        isActive,
        action
      });

      if (rider.status !== 'approved') {
        console.error('❌ Rider not approved:', rider.status);
        toast.error('Only approved riders can accept orders. Your status: ' + rider.status);
        return;
      }

      if (!isActive && action === 'accept') {
        console.error('❌ Rider not active');
        toast.error('Please go active to accept orders.');
        return;
      }

      const token = localStorage.getItem('riderToken');
      if (!token) {
        toast.error('Authentication token not found. Please login again.');
        return;
      }

      const apiUrl = getRiderApiUrl('/order-action');
      console.log('🔍 Order action:', action, 'for order:', orderId, 'API URL:', apiUrl);

      // Show loading state
      toast.loading(`${action.charAt(0).toUpperCase() + action.slice(1)}ing order...`, {
        id: `order-action-${orderId}`
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderId,
          action,
          riderId: rider?._id,
          location: currentLocation,
          timestamp: new Date().toISOString()
        })
      });

      const responseData = await response.json().catch(() => ({}));

      // Dismiss loading toast
      toast.dismiss(`order-action-${orderId}`);

      if (response.ok) {
        toast.success(`Order ${action}ed successfully!`);
        // Refresh orders immediately
        await fetchAssignedOrders();
      } else {
        console.error('Order action failed:', response.status, responseData);
        toast.error(responseData.message || `Failed to ${action} order. Please try again.`);
      }
    } catch (error) {
      console.error('Order action error:', error);
      toast.dismiss(`order-action-${orderId}`);
      toast.error('Network error. Please check your connection and try again.');
    }
  };

  if (!rider) {
    return <div>Loading...</div>;
  }

  return (
    <RiderLayout>
      <div className="space-y-6">
        {/* Notifications Card */}
        <RiderNotifications compact={true} />

        {/* Rider Status Alert */}
        {rider?.status !== 'approved' && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {rider?.status === 'pending' ? (
                    <Clock className="h-5 w-5 text-orange-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-orange-800">
                    {rider?.status === 'pending' ? 'Account Pending Approval' : 'Account Rejected'}
                  </h3>
                  <p className="text-sm text-orange-700 mt-1">
                    {rider?.status === 'pending'
                      ? 'Your account is currently under review by our admin team. You will be notified once approved.'
                      : `Your account has been rejected. ${rider?.rejectionReason ? 'Reason: ' + rider.rejectionReason : 'Please contact admin for more details.'}`
                    }
                  </p>
                  {rider?.status === 'rejected' && (
                    <p className="text-sm text-orange-700 mt-2">
                      <strong>Next Steps:</strong> Contact our support team to resubmit your application.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Rider Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="active-toggle">Active Status</Label>
                  <Badge variant={isActive ? 'default' : 'secondary'}>
                    {isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">
                  Toggle to start receiving order assignments
                </p>
                {currentLocation && (
                  <p className="text-xs text-green-600 flex items-center space-x-1">
                    <MapPin className="h-3 w-3" />
                    <span>Location tracking active</span>
                  </p>
                )}
              </div>
              <Switch
                id="active-toggle"
                checked={isActive}
                onCheckedChange={toggleActiveStatus}
                disabled={rider?.status !== 'approved'}
              />
              {rider?.status !== 'approved' && (
                <p className="text-xs text-gray-500 mt-2">
                  Only approved riders can go active
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Rider Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Profile Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Name</Label>
                <p className="text-gray-900">{rider.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Phone</Label>
                <p className="text-gray-900">{rider.phone}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <Badge variant={rider.status === 'approved' ? 'default' : 'secondary'}>
                  {rider.status}
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-medium">Aadhar Number</Label>
                <p className="text-gray-900">{rider.aadharNumber}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assigned Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Assigned Orders</span>
            </CardTitle>
            <CardDescription>
              Orders assigned to you for pickup and delivery
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assignedOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No orders assigned yet</p>
                <p className="text-sm">Make sure you're active to receive orders</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assignedOrders.map((order) => (
                  <Card key={order._id} className="border-l-4 border-l-laundrify-purple">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold">Order #{order.bookingId}</h4>
                          <p className="text-sm text-gray-600">{order.type} Order</p>
                        </div>
                        <Badge variant={
                          order.riderStatus === 'assigned' ? 'secondary' :
                          order.riderStatus === 'picked_up' ? 'default' : 'default'
                        }>
                          {order.riderStatus}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span>{order.customerName}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span>{order.customerPhone}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span>{order.address}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>{order.pickupTime}</span>
                        </div>
                      </div>

                      <div className="flex space-x-2 mt-4">
                        {order.riderStatus === 'assigned' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              console.log('🔘 Accept button clicked!', {
                                orderId: order._id,
                                orderData: order,
                                riderActive: isActive,
                                riderStatus: rider?.status,
                                buttonDisabled: !isActive || rider?.status !== 'approved'
                              });
                              handleOrderAction(order._id, 'accept');
                            }}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            disabled={!isActive || rider?.status !== 'approved'}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            {(!isActive || rider?.status !== 'approved') ? 'Cannot Accept' : 'Accept Order'}
                          </Button>
                        )}
                        {order.riderStatus === 'accepted' && (
                          <Button
                            size="sm"
                            onClick={() => handleOrderAction(order._id, 'start')}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Navigation className="h-4 w-4 mr-1" />
                            Start Pickup
                          </Button>
                        )}
                        {order.riderStatus === 'picked_up' && (
                          <Button
                            size="sm"
                            onClick={() => handleOrderAction(order._id, 'complete')}
                            className="flex-1 bg-laundrify-purple hover:bg-purple-700 text-white"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Complete Delivery
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`/rider/orders/${order._id}`, '_blank')}
                        >
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RiderLayout>
  );
}
