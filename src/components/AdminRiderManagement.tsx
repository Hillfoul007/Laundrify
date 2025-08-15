import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  User, 
  Phone, 
  FileText, 
  Eye, 
  Check, 
  X, 
  MapPin,
  Navigation,
  Package,
  Clock,
  Activity,
  Search
} from 'lucide-react';
import { toast } from 'sonner';

// Component to display rider images with proper URL handling
const RiderImageDisplay: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Get the correct image URL based on environment
  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return '';

    // If already a full URL, use as-is
    if (imagePath.startsWith('http')) {
      return imagePath;
    }

    const isDev = import.meta.env.DEV;
    const hostname = window.location.hostname;
    const isLocalhost = hostname.includes("localhost") || hostname.includes("127.0.0.1");

    if (isLocalhost && isDev) {
      // In local development, proxy to backend
      return `/api${imagePath}`;
    } else {
      // In production/hosted, use direct backend URL
      return `https://backend-vaxf.onrender.com${imagePath}`;
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const imageUrl = getImageUrl(src);

  if (hasError || !imageUrl) {
    return (
      <div className="mt-2 p-4 border rounded bg-gray-50 text-center text-gray-500">
        <div className="space-y-2">
          <p>Image not available</p>
          <p className="text-xs">Path: {src}</p>
          <p className="text-xs">URL: {imageUrl}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded">
          <div className="text-sm text-gray-500">Loading...</div>
        </div>
      )}
      <img
        src={imageUrl}
        alt={alt}
        className="w-full h-32 object-cover border rounded"
        onLoad={handleImageLoad}
        onError={handleImageError}
        style={{ display: isLoading ? 'none' : 'block' }}
      />
    </div>
  );
};

// Helper function to get the correct API URL for admin rider endpoints
const getAdminApiUrl = (endpoint: string): string => {
  const isDev = import.meta.env.DEV;
  const hostname = window.location.hostname;
  const isLocalhost = hostname.includes("localhost") || hostname.includes("127.0.0.1");
  const isRenderCom = hostname.includes("onrender.com");
  const isLaundrifyDomain = hostname.includes("laundrify.online");

  console.log('🔍 Admin Rider API URL Detection:', {
    isDev,
    hostname,
    isLocalhost,
    isRenderCom,
    isLaundrifyDomain,
    endpoint
  });

  // Force correct backend URL based on environment
  if (isLocalhost && isDev) {
    // Local development - use proxy
    console.log('🏠 Using local proxy for admin API');
    return `/api/admin${endpoint}`;
  } else if (isRenderCom || isLaundrifyDomain || !isLocalhost) {
    // Any hosted environment - use backend server
    const backendUrl = 'https://backend-vaxf.onrender.com/api/admin' + endpoint;
    console.log('🌐 Using backend server for admin API:', backendUrl);
    return backendUrl;
  }

  // Fallback
  return `/api/admin${endpoint}`;
};

export default function AdminRiderManagement() {
  const [riders, setRiders] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [activeRiders, setActiveRiders] = useState<any[]>([]);
  const [selectedRider, setSelectedRider] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRiders();
    fetchOrders();
    fetchActiveRiders();
    
    // Poll for active riders every 30 seconds
    const interval = setInterval(fetchActiveRiders, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchRiders = async () => {
    try {
      const response = await fetch(getAdminApiUrl('/riders'), {
        headers: {
          'admin-token': 'admin-access-granted' // Simple admin token for demo
        }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Riders fetched from API:', data.length, 'riders');
        setRiders(data);

        if (data.length > 0) {
          toast.success(`Loaded ${data.length} riders from database`);
        }
      } else {
        console.error('Failed to fetch riders:', response.status);
        if (response.status === 404) {
          toast.error('Admin rider API not available. Please ensure you are using the local development environment.');
        } else {
          toast.error(`Failed to load riders: ${response.status}`);
        }
      }
    } catch (error) {
      console.error('Failed to fetch riders:', error);
      toast.error('Network error loading riders');
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch(getAdminApiUrl('/orders?status=pending,confirmed'), {
        headers: {
          'admin-token': 'admin-access-granted'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      } else {
        console.error('Failed to fetch orders:', response.status);
        if (response.status === 404) {
          toast.error('Admin orders API not available. Please ensure you are using the local development environment.');
        }
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  const fetchActiveRiders = async () => {
    try {
      const response = await fetch(getAdminApiUrl('/riders/active'), {
        headers: {
          'admin-token': 'admin-access-granted'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setActiveRiders(data);
      } else {
        console.error('Failed to fetch active riders:', response.status);
        if (response.status === 404) {
          toast.error('Admin active riders API not available. Please ensure you are using the local development environment.');
        }
      }
    } catch (error) {
      console.error('Failed to fetch active riders:', error);
    }
  };

  const handleVerifyRider = async (riderId: string, status: 'approved' | 'rejected') => {
    try {
      const response = await fetch(getAdminApiUrl(`/riders/${riderId}/verify`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        toast.success(`Rider ${status} successfully`);
        fetchRiders();
        setVerifyModalOpen(false);
      } else {
        toast.error('Failed to update rider status');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    }
  };

  const assignOrderToRider = async () => {
    if (!selectedOrder || !selectedRider) return;

    try {
      const response = await fetch(getAdminApiUrl('/orders/assign'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder._id,
          riderId: selectedRider._id
        })
      });

      if (response.ok) {
        toast.success('Order assigned successfully');
        fetchOrders();
        fetchActiveRiders();
        setAssignModalOpen(false);
      } else {
        toast.error('Failed to assign order');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    }
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c; // Distance in kilometers
    return d.toFixed(1);
  };

  const getNearestRiders = (orderLocation: {lat: number, lng: number}) => {
    return activeRiders
      .map(rider => ({
        ...rider,
        distance: rider.location ? calculateDistance(
          orderLocation.lat, 
          orderLocation.lng, 
          rider.location.lat, 
          rider.location.lng
        ) : 'Unknown'
      }))
      .sort((a, b) => {
        if (a.distance === 'Unknown') return 1;
        if (b.distance === 'Unknown') return -1;
        return parseFloat(a.distance) - parseFloat(b.distance);
      });
  };

  const filteredRiders = riders.filter(rider =>
    rider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rider.phone.includes(searchTerm) ||
    rider.aadharNumber.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <Tabs defaultValue="verification" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="active">Active Riders</TabsTrigger>
          <TabsTrigger value="orders">Order Assignment</TabsTrigger>
          <TabsTrigger value="tracking">Live Tracking</TabsTrigger>
        </TabsList>

        {/* Rider Verification Tab */}
        <TabsContent value="verification" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Rider Verification</span>
              </CardTitle>
              <CardDescription>
                Review and verify rider registrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Search className="h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search riders by name, phone, or Aadhar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-md"
                  />
                </div>

                <div className="grid gap-4">
                  {filteredRiders.map((rider) => (
                    <Card key={rider._id} className="border-l-4 border-l-laundrify-purple">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <h4 className="font-semibold">{rider.name}</h4>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <span className="flex items-center space-x-1">
                                <Phone className="h-3 w-3" />
                                <span>{rider.phone}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <FileText className="h-3 w-3" />
                                <span>{rider.aadharNumber}</span>
                              </span>
                            </div>
                            <Badge variant={
                              rider.status === 'approved' ? 'default' :
                              rider.status === 'rejected' ? 'destructive' : 'secondary'
                            }>
                              {rider.status}
                            </Badge>
                          </div>
                          
                          <div className="flex space-x-2">
                            <Dialog 
                              open={verifyModalOpen && selectedRider?._id === rider._id}
                              onOpenChange={(open) => {
                                setVerifyModalOpen(open);
                                if (open) setSelectedRider(rider);
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline">
                                  <Eye className="h-4 w-4 mr-1" />
                                  View Details
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Rider Verification</DialogTitle>
                                  <DialogDescription>
                                    Review rider details and documents
                                  </DialogDescription>
                                </DialogHeader>
                                
                                {selectedRider && (
                                  <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label className="font-medium">Name</Label>
                                        <p>{selectedRider.name}</p>
                                      </div>
                                      <div>
                                        <Label className="font-medium">Phone</Label>
                                        <p>{selectedRider.phone}</p>
                                      </div>
                                      <div>
                                        <Label className="font-medium">Aadhar Number</Label>
                                        <p>{selectedRider.aadharNumber}</p>
                                      </div>
                                      <div>
                                        <Label className="font-medium">Registration Date</Label>
                                        <p>{new Date(selectedRider.createdAt).toLocaleDateString()}</p>
                                      </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label className="font-medium">Aadhar Card</Label>
                                        {selectedRider.aadharImageUrl ? (
                                          <RiderImageDisplay
                                            src={selectedRider.aadharImageUrl}
                                            alt="Aadhar Card"
                                          />
                                        ) : (
                                          <div className="mt-2 p-4 border rounded bg-gray-50 text-center text-gray-500">
                                            No image uploaded
                                          </div>
                                        )}
                                      </div>
                                      <div>
                                        <Label className="font-medium">Selfie</Label>
                                        {selectedRider.selfieImageUrl ? (
                                          <RiderImageDisplay
                                            src={selectedRider.selfieImageUrl}
                                            alt="Selfie"
                                          />
                                        ) : (
                                          <div className="mt-2 p-4 border rounded bg-gray-50 text-center text-gray-500">
                                            No image uploaded
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {selectedRider.status === 'pending' && (
                                      <div className="flex space-x-4">
                                        <Button
                                          onClick={() => handleVerifyRider(selectedRider._id, 'approved')}
                                          className="flex-1"
                                        >
                                          <Check className="h-4 w-4 mr-2" />
                                          Approve
                                        </Button>
                                        <Button
                                          variant="destructive"
                                          onClick={() => handleVerifyRider(selectedRider._id, 'rejected')}
                                          className="flex-1"
                                        >
                                          <X className="h-4 w-4 mr-2" />
                                          Reject
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {filteredRiders.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No riders found</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Riders Tab */}
        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Active Riders ({activeRiders.length})</span>
              </CardTitle>
              <CardDescription>
                Currently active riders available for assignments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {activeRiders.map((rider) => (
                  <Card key={rider._id} className="border-l-4 border-l-green-500">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-semibold">{rider.name}</h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="flex items-center space-x-1">
                              <Phone className="h-3 w-3" />
                              <span>{rider.phone}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <MapPin className="h-3 w-3" />
                              <span>
                                {rider.location ? 
                                  `${rider.location.lat.toFixed(4)}, ${rider.location.lng.toFixed(4)}` : 
                                  'Location not available'
                                }
                              </span>
                            </span>
                          </div>
                          <Badge variant="default" className="mt-2">
                            <Activity className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        </div>
                        
                        <div className="text-right text-xs text-gray-500">
                          Last updated: {rider.lastLocationUpdate ? 
                            new Date(rider.lastLocationUpdate).toLocaleTimeString() : 
                            'Unknown'
                          }
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {activeRiders.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No active riders</p>
                    <p className="text-sm">Riders will appear here when they go active</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Order Assignment Tab */}
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Order Assignment</span>
              </CardTitle>
              <CardDescription>
                Manually assign orders to available riders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {orders.filter(order => !order.assignedRider).map((order) => (
                  <Card key={order._id} className="border-l-4 border-l-orange-500">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <h4 className="font-semibold">Order #{order.bookingId}</h4>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div className="flex items-center space-x-2">
                              <User className="h-3 w-3" />
                              <span>{order.customerName}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Phone className="h-3 w-3" />
                              <span>{order.customerPhone}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <MapPin className="h-3 w-3" />
                              <span>{order.address}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Clock className="h-3 w-3" />
                              <span>{order.pickupTime}</span>
                            </div>
                          </div>
                          <Badge variant="secondary">{order.type} Order</Badge>
                        </div>
                        
                        <Dialog 
                          open={assignModalOpen && selectedOrder?._id === order._id}
                          onOpenChange={(open) => {
                            setAssignModalOpen(open);
                            if (open) setSelectedOrder(order);
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button size="sm">
                              <Navigation className="h-4 w-4 mr-2" />
                              Assign Rider
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Assign Order to Rider</DialogTitle>
                              <DialogDescription>
                                Select a rider to assign this order to
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4">
                              <div>
                                <Label className="font-medium">Order Details</Label>
                                <p className="text-sm text-gray-600">
                                  #{selectedOrder?.bookingId} - {selectedOrder?.customerName}
                                </p>
                              </div>
                              
                              <div>
                                <Label className="font-medium">Available Riders (Nearest First)</Label>
                                <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                                  {selectedOrder && getNearestRiders(selectedOrder.location || {lat: 0, lng: 0}).map((rider) => (
                                    <div
                                      key={rider._id}
                                      className={`p-3 border rounded cursor-pointer transition-colors ${
                                        selectedRider?._id === rider._id ? 'border-laundrify-purple bg-purple-50' : 'hover:bg-gray-50'
                                      }`}
                                      onClick={() => setSelectedRider(rider)}
                                    >
                                      <div className="flex justify-between items-center">
                                        <div>
                                          <p className="font-medium">{rider.name}</p>
                                          <p className="text-sm text-gray-600">{rider.phone}</p>
                                        </div>
                                        <div className="text-right">
                                          <Badge variant="outline">
                                            {rider.distance} km away
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                  
                                  {activeRiders.length === 0 && (
                                    <p className="text-center text-gray-500 py-4">
                                      No active riders available
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              <Button
                                onClick={assignOrderToRider}
                                disabled={!selectedRider}
                                className="w-full"
                              >
                                Assign Order
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {orders.filter(order => !order.assignedRider).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No unassigned orders</p>
                    <p className="text-sm">New orders will appear here for assignment</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Live Tracking Tab */}
        <TabsContent value="tracking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Live Rider Tracking</span>
              </CardTitle>
              <CardDescription>
                Real-time location tracking of active riders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-blue-900 text-sm">
                    📍 Live tracking shows real-time locations of active riders.
                    Locations are updated every 30 seconds when riders are active.
                  </p>
                </div>
                
                {activeRiders.map((rider) => (
                  <Card key={rider._id} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-semibold">{rider.name}</h4>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>📱 {rider.phone}</p>
                            {rider.location && (
                              <>
                                <p>📍 {rider.location.lat.toFixed(6)}, {rider.location.lng.toFixed(6)}</p>
                                <p>🕒 Last update: {new Date(rider.lastLocationUpdate).toLocaleString()}</p>
                              </>
                            )}
                          </div>
                          {rider.assignedOrders && rider.assignedOrders.length > 0 && (
                            <Badge variant="default" className="mt-2">
                              {rider.assignedOrders.length} assigned order(s)
                            </Badge>
                          )}
                        </div>
                        
                        {rider.location && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const url = `https://www.google.com/maps/@${rider.location.lat},${rider.location.lng},15z`;
                              window.open(url, '_blank');
                            }}
                          >
                            <MapPin className="h-4 w-4 mr-2" />
                            View on Map
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
