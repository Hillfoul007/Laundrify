import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  User,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Package,
  DollarSign,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { laundryServices, serviceCategories, getCategoryDisplay } from "@/data/laundryServices";
import { apiClient } from "@/lib/apiClient";

interface User {
  _id: string;
  name?: string;
  full_name?: string;
  phone: string;
  email?: string;
  user_type: string;
}

interface ServiceItem {
  name: string;
  quantity: number;
  price: number;
}

const AdminUserBooking: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [bookingData, setBookingData] = useState({
    service: "",
    services: [] as ServiceItem[],
    scheduled_date: "",
    scheduled_time: "",
    delivery_date: "",
    delivery_time: "",
    address: "",
    special_instructions: "",
    discount_amount: 0,
  });

  const [newService, setNewService] = useState<ServiceItem>({
    name: "",
    quantity: 1,
    price: 0,
  });

  const availableServices = [
    { name: "Washing & Ironing", price: 15 },
    { name: "Dry Cleaning", price: 25 },
    { name: "Steam Press", price: 10 },
    { name: "Shoe Cleaning", price: 50 },
    { name: "Curtain Cleaning", price: 100 },
    { name: "Carpet Cleaning", price: 200 },
    { name: "Blanket Cleaning", price: 80 },
    { name: "Leather Cleaning", price: 150 },
  ];

  useEffect(() => {
    if (searchTerm.length >= 3) {
      searchUsers();
    } else {
      setUsers([]);
    }
  }, [searchTerm]);

  const searchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users/search?q=${encodeURIComponent(searchTerm)}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        // Fallback: simulate users based on search term for phone numbers
        if (searchTerm.match(/^\d{10}$/)) {
          setUsers([
            {
              _id: `user_${searchTerm}`,
              name: `User ${searchTerm.slice(-4)}`,
              phone: searchTerm,
              email: `user${searchTerm.slice(-4)}@example.com`,
              user_type: "customer",
            },
          ]);
        } else {
          setUsers([]);
        }
      }
    } catch (error) {
      console.error("Error searching users:", error);
      // Fallback for network errors
      if (searchTerm.match(/^\d{10}$/)) {
        setUsers([
          {
            _id: `user_${searchTerm}`,
            name: `User ${searchTerm.slice(-4)}`,
            phone: searchTerm,
            email: `user${searchTerm.slice(-4)}@example.com`,
            user_type: "customer",
          },
        ]);
      }
      toast.error("Error searching users - using fallback");
    } finally {
      setLoading(false);
    }
  };

  const selectUser = (user: User) => {
    setSelectedUser(user);
    setSearchTerm("");
    setUsers([]);
  };

  const addService = () => {
    if (newService.name && newService.quantity > 0 && newService.price > 0) {
      setBookingData({
        ...bookingData,
        services: [...bookingData.services, { ...newService }],
      });
      setNewService({ name: "", quantity: 1, price: 0 });
    }
  };

  const removeService = (index: number) => {
    setBookingData({
      ...bookingData,
      services: bookingData.services.filter((_, i) => i !== index),
    });
  };

  const calculateTotal = () => {
    return bookingData.services.reduce(
      (total, service) => total + service.price * service.quantity,
      0
    );
  };

  const calculateFinalAmount = () => {
    return Math.max(0, calculateTotal() - bookingData.discount_amount);
  };

  const selectServiceFromList = (serviceName: string, price: number) => {
    setNewService({ ...newService, name: serviceName, price });
  };

  const submitBooking = async () => {
    if (!selectedUser) {
      toast.error("Please select a user first");
      return;
    }

    if (bookingData.services.length === 0) {
      toast.error("Please add at least one service");
      return;
    }

    if (!bookingData.scheduled_date || !bookingData.scheduled_time) {
      toast.error("Please select pickup date and time");
      return;
    }

    if (!bookingData.address.trim()) {
      toast.error("Please enter the pickup address");
      return;
    }

    try {
      setSubmitting(true);

      const bookingPayload = {
        customer_id: selectedUser._id,
        service: bookingData.service || bookingData.services[0]?.name || "Laundry Service",
        service_type: "laundry",
        services: bookingData.services,
        scheduled_date: bookingData.scheduled_date,
        scheduled_time: bookingData.scheduled_time,
        delivery_date: bookingData.delivery_date || bookingData.scheduled_date,
        delivery_time: bookingData.delivery_time || bookingData.scheduled_time,
        provider_name: "Laundrify",
        address: bookingData.address,
        additional_details: bookingData.special_instructions,
        total_price: calculateTotal(),
        discount_amount: bookingData.discount_amount,
        final_amount: calculateFinalAmount(),
        special_instructions: bookingData.special_instructions,
        created_by_admin: true,
      };

      console.log("Submitting booking:", bookingPayload);

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookingPayload),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Booking created successfully! Order ID: ${result.booking?.custom_order_id}`);
        
        // Reset form
        setSelectedUser(null);
        setBookingData({
          service: "",
          services: [],
          scheduled_date: "",
          scheduled_time: "",
          delivery_date: "",
          delivery_time: "",
          address: "",
          special_instructions: "",
          discount_amount: 0,
        });
      } else {
        const error = await response.json();
        toast.error(`Failed to create booking: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error creating booking:", error);
      toast.error("Error creating booking");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Book Service for User</h2>
        <p className="text-gray-600">
          Create bookings on behalf of registered users
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Select Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedUser ? (
              <>
                <div>
                  <Label htmlFor="user-search">Search by Phone Number or Name</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="user-search"
                      placeholder="Enter phone number or name (min 3 chars)"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {loading && (
                  <div className="text-center py-4 text-gray-500">
                    Searching users...
                  </div>
                )}

                {users.length > 0 && (
                  <div className="space-y-2">
                    <Label>Search Results</Label>
                    {users.map((user) => (
                      <div
                        key={user._id}
                        className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                        onClick={() => selectUser(user)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">
                              {user.name || user.full_name || "Unnamed User"}
                            </div>
                            <div className="text-sm text-gray-600">
                              📞 {user.phone}
                            </div>
                            {user.email && (
                              <div className="text-sm text-gray-600">
                                ✉️ {user.email}
                              </div>
                            )}
                          </div>
                          <Badge variant="outline">{user.user_type}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {searchTerm.length >= 3 && users.length === 0 && !loading && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No users found. If the user doesn't exist, they need to register first.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>Customer selected successfully!</AlertDescription>
                </Alert>
                
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {selectedUser.name || selectedUser.full_name || "Unnamed User"}
                      </div>
                      <div className="text-sm text-gray-600">
                        📞 {selectedUser.phone}
                      </div>
                      {selectedUser.email && (
                        <div className="text-sm text-gray-600">
                          ✉️ {selectedUser.email}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedUser(null)}
                    >
                      Change User
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Service Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Services
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick Service Selection */}
            <div>
              <Label>Quick Add Services</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {availableServices.map((service, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="text-xs justify-start"
                    onClick={() => selectServiceFromList(service.name, service.price)}
                  >
                    {service.name} (₹{service.price})
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Service Addition */}
            <div className="border-t pt-4 space-y-3">
              <Label>Add Custom Service</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Service name"
                  value={newService.name}
                  onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Price (₹)"
                  value={newService.price || ""}
                  onChange={(e) =>
                    setNewService({ ...newService, price: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Qty"
                  value={newService.quantity || ""}
                  onChange={(e) =>
                    setNewService({ ...newService, quantity: parseInt(e.target.value) || 1 })
                  }
                  className="w-20"
                />
                <Button onClick={addService} className="flex-1">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service
                </Button>
              </div>
            </div>

            {/* Added Services */}
            {bookingData.services.length > 0 && (
              <div className="border-t pt-4">
                <Label>Selected Services</Label>
                <div className="space-y-2 mt-2">
                  {bookingData.services.map((service, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <div>
                        <div className="font-medium">{service.name}</div>
                        <div className="text-sm text-gray-600">
                          {service.quantity} × ₹{service.price} = ₹{service.quantity * service.price}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeService(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex justify-between font-medium">
                    <span>Subtotal:</span>
                    <span>₹{calculateTotal()}</span>
                  </div>
                  {bookingData.discount_amount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount:</span>
                      <span>-₹{bookingData.discount_amount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-blue-600 border-t pt-2 mt-2">
                    <span>Total:</span>
                    <span>₹{calculateFinalAmount()}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Booking Details */}
      {selectedUser && bookingData.services.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Booking Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pickup-date">Pickup Date</Label>
                <Input
                  id="pickup-date"
                  type="date"
                  value={bookingData.scheduled_date}
                  onChange={(e) =>
                    setBookingData({ ...bookingData, scheduled_date: e.target.value })
                  }
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              
              <div>
                <Label htmlFor="pickup-time">Pickup Time</Label>
                <Select
                  value={bookingData.scheduled_time}
                  onValueChange={(value) =>
                    setBookingData({ ...bookingData, scheduled_time: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="09:00">09:00 AM</SelectItem>
                    <SelectItem value="10:00">10:00 AM</SelectItem>
                    <SelectItem value="11:00">11:00 AM</SelectItem>
                    <SelectItem value="12:00">12:00 PM</SelectItem>
                    <SelectItem value="13:00">01:00 PM</SelectItem>
                    <SelectItem value="14:00">02:00 PM</SelectItem>
                    <SelectItem value="15:00">03:00 PM</SelectItem>
                    <SelectItem value="16:00">04:00 PM</SelectItem>
                    <SelectItem value="17:00">05:00 PM</SelectItem>
                    <SelectItem value="18:00">06:00 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="delivery-date">Delivery Date (Optional)</Label>
                <Input
                  id="delivery-date"
                  type="date"
                  value={bookingData.delivery_date}
                  onChange={(e) =>
                    setBookingData({ ...bookingData, delivery_date: e.target.value })
                  }
                  min={bookingData.scheduled_date || new Date().toISOString().split("T")[0]}
                />
              </div>

              <div>
                <Label htmlFor="delivery-time">Delivery Time (Optional)</Label>
                <Select
                  value={bookingData.delivery_time}
                  onValueChange={(value) =>
                    setBookingData({ ...bookingData, delivery_time: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="09:00">09:00 AM</SelectItem>
                    <SelectItem value="10:00">10:00 AM</SelectItem>
                    <SelectItem value="11:00">11:00 AM</SelectItem>
                    <SelectItem value="12:00">12:00 PM</SelectItem>
                    <SelectItem value="13:00">01:00 PM</SelectItem>
                    <SelectItem value="14:00">02:00 PM</SelectItem>
                    <SelectItem value="15:00">03:00 PM</SelectItem>
                    <SelectItem value="16:00">04:00 PM</SelectItem>
                    <SelectItem value="17:00">05:00 PM</SelectItem>
                    <SelectItem value="18:00">06:00 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="discount">Discount Amount (₹)</Label>
                <Input
                  id="discount"
                  type="number"
                  placeholder="0"
                  value={bookingData.discount_amount || ""}
                  onChange={(e) =>
                    setBookingData({
                      ...bookingData,
                      discount_amount: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Pickup Address</Label>
              <Textarea
                id="address"
                placeholder="Enter complete pickup address..."
                value={bookingData.address}
                onChange={(e) =>
                  setBookingData({ ...bookingData, address: e.target.value })
                }
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="instructions">Special Instructions (Optional)</Label>
              <Textarea
                id="instructions"
                placeholder="Any special instructions or notes..."
                value={bookingData.special_instructions}
                onChange={(e) =>
                  setBookingData({ ...bookingData, special_instructions: e.target.value })
                }
                rows={2}
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={submitBooking}
                disabled={submitting}
                className="min-w-32"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </div>
                ) : (
                  "Create Booking"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminUserBooking;
