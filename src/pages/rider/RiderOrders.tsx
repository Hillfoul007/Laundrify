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
  ArrowLeft,
  Save,
  X,
  AlertTriangle,
  Bell
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
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [originalTotal, setOriginalTotal] = useState(0);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails(orderId);
    }
  }, [orderId]);

  const fetchOrderDetails = async (id: string) => {
    try {
      const token = localStorage.getItem('riderToken');
      const apiUrl = getRiderApiUrl(`/orders/${id}`);
      console.log('🔍 Fetching order details:', apiUrl);

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const orderData = await response.json();
        setOrder(orderData);
        const items = orderData.items || [];
        setEditedItems([...items]);
        setOriginalTotal(items.reduce((sum: number, item: any) => sum + (item.quantity * item.price), 0));
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
    setIsSaving(true);
    try {
      const token = localStorage.getItem('riderToken');
      const apiUrl = getRiderApiUrl(`/orders/${orderId}/update`);

      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          items: editedItems,
          updatedBy: 'rider',
          notes: `Order updated by rider ${new Date().toLocaleString()}. Customer will be notified to verify changes.`
        })
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Order updated and customer notified!', {
          description: result.price_change !== 0
            ? `Price changed by ₹${Math.abs(result.price_change)} ${result.price_change > 0 ? 'increase' : 'decrease'}`
            : 'Items updated successfully',
          duration: 4000,
          icon: <Bell className="h-4 w-4" />
        });
        setIsEditing(false);
        setShowConfirmDialog(false);
        fetchOrderDetails(orderId!);
      } else {
        toast.error(result.message || 'Failed to update order');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveClick = () => {
    const newTotal = totalAmount;
    const priceDifference = newTotal - originalTotal;

    if (Math.abs(priceDifference) > 0) {
      setShowConfirmDialog(true);
    } else {
      saveOrderChanges();
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
              <div className="flex space-x-2">
                {isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditing(false);
                        setEditedItems([...order.items]);
                        setNewItem({ name: '', quantity: 1, price: 0 });
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleSaveClick}
                      disabled={isSaving}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? 'Saving...' : 'Save & Notify Customer'}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Order
                  </Button>
                )}
              </div>
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
                  <div className="text-right">
                    <span>₹{totalAmount}</span>
                    {isEditing && totalAmount !== originalTotal && (
                      <div className="text-sm font-normal">
                        <span className={`${totalAmount > originalTotal ? 'text-red-600' : 'text-green-600'}`}>
                          {totalAmount > originalTotal ? '+' : ''}₹{totalAmount - originalTotal}
                        </span>
                        <span className="text-gray-500 ml-1">(from ₹{originalTotal})</span>
                      </div>
                    )}\n                  </div>
                </div>
                {isEditing && totalAmount !== originalTotal && (
                  <div className={`mt-2 p-3 rounded-lg ${totalAmount > originalTotal ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'} border`}>
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className={`h-4 w-4 ${totalAmount > originalTotal ? 'text-red-600' : 'text-green-600'}`} />
                      <p className={`text-sm ${totalAmount > originalTotal ? 'text-red-800' : 'text-green-800'}`}>
                        {totalAmount > originalTotal
                          ? 'Price increase detected. Customer will be notified to approve the changes.'
                          : 'Price decrease detected. Customer will be notified of the savings.'
                        }
                      </p>
                    </div>
                  </div>
                )}
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

        {/* Confirmation Dialog */}
        {showConfirmDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <span>Confirm Order Changes</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-gray-700">
                    You've made changes to the order that will affect the total price:
                  </p>

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span>Original Total:</span>
                      <span>₹{originalTotal}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>New Total:</span>
                      <span>₹{totalAmount}</span>
                    </div>
                    <div className={`flex justify-between items-center font-semibold ${totalAmount > originalTotal ? 'text-red-600' : 'text-green-600'}`}>
                      <span>Difference:</span>
                      <span>{totalAmount > originalTotal ? '+' : ''}₹{totalAmount - originalTotal}</span>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Bell className="h-4 w-4 text-blue-600 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium">Customer Notification</p>
                        <p>The customer will be automatically notified of these changes and asked to verify the updated order before proceeding.</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowConfirmDialog(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={saveOrderChanges}
                      disabled={isSaving}
                      className="flex-1"
                    >
                      {isSaving ? 'Saving...' : 'Confirm & Notify'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </RiderLayout>
  );
}
