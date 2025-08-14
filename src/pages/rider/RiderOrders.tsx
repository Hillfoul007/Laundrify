import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Package,
  MapPin,
  Clock,
  User,
  Phone,
  Edit,
  Plus,
  Minus,
  Navigation,
  CheckCircle,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import RiderLayout from '@/components/rider/RiderLayout';

// Helper function to get the correct API URL for rider endpoints
const getRiderApiUrl = (endpoint: string): string => {
  const isDev = import.meta.env.DEV;
  const hostname = window.location.hostname;
  const isLocalhost = hostname.includes("localhost") || hostname.includes("127.0.0.1");
  const isRenderCom = hostname.includes("onrender.com");
  const isLaundrifyDomain = hostname.includes("laundrify.online");

  // Force correct backend URL based on environment
  if (isLocalhost && isDev) {
    return `/api/riders${endpoint}`;
  } else if (isRenderCom || isLaundrifyDomain || !isLocalhost) {
    return 'https://backend-vaxf.onrender.com/api/riders' + endpoint;
  }

  return `/api/riders${endpoint}`;
};

export default function RiderOrders() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedItems, setEditedItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState({ name: '', quantity: 1, price: 0 });

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails(orderId);
    }
  }, [orderId]);

  const fetchOrderDetails = async (id: string) => {
    try {
      const token = localStorage.getItem('riderToken');
      const response = await fetch(`/api/riders/orders/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const orderData = await response.json();
        setOrder(orderData);
        setEditedItems([...orderData.items]);
      } else {
        toast.error('Failed to fetch order details');
        navigate('/rider/dashboard');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
      navigate('/rider/dashboard');
    }
  };

  const updateItemQuantity = (index: number, change: number) => {
    const updatedItems = [...editedItems];
    updatedItems[index].quantity = Math.max(0, updatedItems[index].quantity + change);
    setEditedItems(updatedItems);
  };

  const removeItem = (index: number) => {
    const updatedItems = editedItems.filter((_, i) => i !== index);
    setEditedItems(updatedItems);
  };

  const addNewItem = () => {
    if (!newItem.name.trim()) {
      toast.error('Please enter item name');
      return;
    }
    
    setEditedItems([...editedItems, { ...newItem, id: Date.now() }]);
    setNewItem({ name: '', quantity: 1, price: 0 });
  };

  const saveOrderChanges = async () => {
    try {
      const token = localStorage.getItem('riderToken');
      const response = await fetch(`/api/riders/orders/${orderId}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          items: editedItems,
          updatedBy: 'rider',
          notes: 'Updated by rider during pickup'
        })
      });

      if (response.ok) {
        toast.success('Order updated successfully');
        setIsEditing(false);
        fetchOrderDetails(orderId!);
      } else {
        toast.error('Failed to update order');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    }
  };

  const openMapsNavigation = (address: string, type: 'pickup' | 'delivery') => {
    const destination = type === 'delivery' 
      ? 'Sector 69, Gurugram, Haryana' // Vendor address
      : address; // Customer address
    
    const encodedAddress = encodeURIComponent(destination);
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
    window.open(googleMapsUrl, '_blank');
  };

  if (!order) {
    return (
      <RiderLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p>Loading order details...</p>
          </div>
        </div>
      </RiderLayout>
    );
  }

  const totalAmount = editedItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);

  return (
    <RiderLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/rider/dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold">Order #{order.bookingId}</h1>
          <Badge variant={
            order.riderStatus === 'assigned' ? 'secondary' :
            order.riderStatus === 'picked_up' ? 'default' : 'default'
          }>
            {order.riderStatus}
          </Badge>
        </div>

        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Customer Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Name</Label>
                <p className="text-gray-900">{order.customerName}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Phone</Label>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <a href={`tel:${order.customerPhone}`} className="text-laundrify-purple hover:underline">
                    {order.customerPhone}
                  </a>
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-medium">Address</Label>
                <div className="flex items-start space-x-2">
                  <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                  <div className="flex-1">
                    <p className="text-gray-900">{order.address}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => openMapsNavigation(order.address, 'pickup')}
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      Navigate to Customer
                    </Button>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Pickup Time</Label>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <p className="text-gray-900">{order.pickupTime}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Order Items</span>
              </CardTitle>
              <Button
                variant={isEditing ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  if (isEditing) {
                    saveOrderChanges();
                  } else {
                    setIsEditing(true);
                  }
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                {isEditing ? 'Save Changes' : 'Edit Order'}
              </Button>
            </div>
            <CardDescription>
              You can edit quantities and add new items during pickup
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {editedItems.map((item, index) => (
                <div key={item.id || index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{item.name}</h4>
                    <p className="text-sm text-gray-600">₹{item.price} each</p>
                  </div>
                  
                  {isEditing ? (
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateItemQuantity(index, -1)}
                        disabled={item.quantity <= 0}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateItemQuantity(index, 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeItem(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="text-right">
                      <p className="font-medium">Qty: {item.quantity}</p>
                      <p className="text-sm text-gray-600">₹{item.quantity * item.price}</p>
                    </div>
                  )}
                </div>
              ))}

              {isEditing && (
                <Card className="border-dashed">
                  <CardContent className="pt-4">
                    <h4 className="font-medium mb-3">Add New Item</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <Input
                        placeholder="Item name"
                        value={newItem.name}
                        onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                      />
                      <Input
                        type="number"
                        placeholder="Quantity"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value) || 1})}
                      />
                      <Input
                        type="number"
                        placeholder="Price"
                        value={newItem.price}
                        onChange={(e) => setNewItem({...newItem, price: parseFloat(e.target.value) || 0})}
                      />
                      <Button onClick={addNewItem}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total Amount:</span>
                  <span>₹{totalAmount}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>Delivery Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Vendor Address</Label>
                <p className="text-gray-900">Sector 69, Gurugram, Haryana</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => openMapsNavigation(order.address, 'delivery')}
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Navigate to Vendor
                </Button>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Pickup & Delivery Process</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                  <li>Navigate to customer address and collect the items</li>
                  <li>Verify items match the order (edit if needed)</li>
                  <li>Transport items to vendor location in Sector 69</li>
                  <li>After vendor completes the order, return items to customer</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </RiderLayout>
  );
}
