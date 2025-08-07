import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Clock,
  User,
  Phone,
  CheckCircle,
  Loader2,
  Navigation,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";

interface QuickBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
}

const QuickBookModal: React.FC<QuickBookModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [loading, setLoading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [formData, setFormData] = useState({
    pickup_date: "",
    pickup_time: "",
    address: "",
    special_instructions: "",
  });

  useEffect(() => {
    if (isOpen) {
      // Set default pickup date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setFormData(prev => ({
        ...prev,
        pickup_date: tomorrow.toISOString().split('T')[0],
      }));
    }
  }, [isOpen]);

  const detectLocation = async () => {
    setDetectingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;
      
      // Use reverse geocoding to get address
      const response = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=YOUR_API_KEY`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results[0]) {
          const address = data.results[0].formatted;
          setFormData(prev => ({ ...prev, address }));
          toast.success("Location detected successfully!");
        }
      } else {
        // Fallback to approximate address
        setFormData(prev => ({ 
          ...prev, 
          address: `Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        }));
        toast.success("Location coordinates detected!");
      }
    } catch (error) {
      console.error("Location detection failed:", error);
      toast.error("Failed to detect location. Please enter address manually.");
    } finally {
      setDetectingLocation(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.pickup_date || !formData.pickup_time || !formData.address.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const quickBookData = {
        customer_id: currentUser._id,
        customer_name: currentUser.name || currentUser.full_name || "Quick Book User",
        customer_phone: currentUser.phone,
        pickup_date: formData.pickup_date,
        pickup_time: formData.pickup_time,
        address: formData.address,
        special_instructions: formData.special_instructions,
        status: "pending",
        created_at: new Date().toISOString(),
      };

      const response = await apiClient.request<any>("/quick-book", {
        method: "POST",
        body: quickBookData,
      });

      if (response.data) {
        toast.success("Quick booking created successfully! Our rider will contact you soon.");
        onClose();
        // Reset form
        setFormData({
          pickup_date: "",
          pickup_time: "",
          address: "",
          special_instructions: "",
        });
      } else {
        toast.error(response.error || "Failed to create quick booking");
      }
    } catch (error) {
      console.error("Quick booking error:", error);
      toast.error("Failed to create quick booking");
    } finally {
      setLoading(false);
    }
  };

  const timeSlots = [
    "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", 
    "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-purple-600" />
            Quick Book Pickup
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* User Info Display */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-gray-500" />
                <div>
                  <div className="font-medium">
                    {currentUser.name || currentUser.full_name || "User"}
                  </div>
                  <div className="text-sm text-gray-500 flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {currentUser.phone}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pickup Date */}
          <div>
            <Label htmlFor="pickup_date">Pickup Date *</Label>
            <Input
              id="pickup_date"
              type="date"
              value={formData.pickup_date}
              onChange={(e) => setFormData(prev => ({ ...prev, pickup_date: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          {/* Pickup Time */}
          <div>
            <Label htmlFor="pickup_time">Pickup Time *</Label>
            <Select 
              value={formData.pickup_time} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, pickup_time: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select pickup time" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Address */}
          <div>
            <Label htmlFor="address">Pickup Address *</Label>
            <div className="flex gap-2">
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter pickup address"
                required
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={detectLocation}
                disabled={detectingLocation}
              >
                {detectingLocation ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Special Instructions */}
          <div>
            <Label htmlFor="special_instructions">Special Instructions (Optional)</Label>
            <Input
              id="special_instructions"
              value={formData.special_instructions}
              onChange={(e) => setFormData(prev => ({ ...prev, special_instructions: e.target.value }))}
              placeholder="Any special instructions for pickup"
            />
          </div>

          {/* Info Alert */}
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Our rider will visit at the scheduled time to collect your items. 
              You don't need to specify what items - our professional will assess and handle everything!
            </AlertDescription>
          </Alert>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full bg-purple-600 hover:bg-purple-700"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating Quick Book...
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 mr-2" />
                Confirm Quick Book
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default QuickBookModal;
